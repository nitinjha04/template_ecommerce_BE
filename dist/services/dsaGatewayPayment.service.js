"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DsaGatewayPaymentService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const noncestr_1 = require("../utils/dsaGateway/noncestr");
const sign_1 = require("../utils/dsaGateway/sign");
const verify_1 = require("../utils/dsaGateway/verify");
const devOrderAmount_1 = require("../utils/devOrderAmount");
class DsaGatewayPaymentService {
    static log(step, details) {
        // Intentionally avoid logging sensitive values like keys/signatures.
        if (details) {
            console.info(`[dsa-gateway] ${step}`, details);
            return;
        }
        console.info(`[dsa-gateway] ${step}`);
    }
    static async createForOrder(input) {
        if (!(0, env_1.isDsaGatewayConfigured)()) {
            throw new ApiError_1.ApiError(500, "Payment gateway is not configured");
        }
        this.log("createForOrder:start", { orderNumber: input.orderNumber });
        const order = await models_1.Order.findOne({ orderNumber: input.orderNumber });
        if (!order)
            throw new ApiError_1.ApiError(404, "Order not found");
        // Basic guest safety check: if caller sends email/phone, require match.
        if (input.email && order.email !== input.email.trim().toLowerCase()) {
            throw new ApiError_1.ApiError(403, "Order email does not match");
        }
        if (input.phone) {
            const digits = input.phone.replace(/\D/g, "");
            const orderDigits = String(order.phone ?? "").replace(/\D/g, "");
            if (digits && orderDigits && digits !== orderDigits) {
                throw new ApiError_1.ApiError(403, "Order phone does not match");
            }
        }
        const payment = await models_1.Payment.findOne({ order: order._id });
        if (!payment)
            throw new ApiError_1.ApiError(404, "Payment record not found for order");
        if (payment.status === "Completed") {
            throw new ApiError_1.ApiError(400, "Order is already paid");
        }
        this.log("createForOrder:loaded", {
            orderId: String(order._id),
            paymentId: String(payment._id),
            total: order.total,
            paymentStatus: payment.status,
        });
        const noncestr = (0, noncestr_1.randomNonceStr)(3);
        const timestamp = Date.now().toString();
        const merchantId = env_1.env.dsaGateway.merchantId;
        // PHP flow uses a unique merchant_order_no per attempt.
        const merchantOrderNo = `T${String(order._id).slice(-6)}${Date.now()}`;
        const chargeTotal = (0, devOrderAmount_1.applyDevTestOrderTotal)(order.total);
        const orderAmount = String(Math.round(chargeTotal));
        const action = "payin";
        const notifyUrl = `${(0, env_1.getApiPublicOrigin)()}/api/v1/gateway-payments/webhook`;
        const signText = merchantId +
            merchantOrderNo +
            orderAmount +
            noncestr +
            timestamp +
            action;
        let sign;
        try {
            this.log("createForOrder:signing", {
                merchantOrderNo,
                orderAmount,
                keyTypeHint: env_1.env.dsaGateway.privateKey.includes("BEGIN")
                    ? "pem"
                    : "env-string",
            });
            sign = (0, sign_1.signDsaBase64)(signText, env_1.env.dsaGateway.privateKey);
        }
        catch (err) {
            this.log("createForOrder:signing_failed", {
                error: err instanceof Error ? err.message : String(err),
                code: err?.code,
                reason: err?.reason,
            });
            throw err;
        }
        const configuredIds = [
            ...(env_1.env.dsaGateway.gatewayIds ?? []),
            ...(env_1.env.dsaGateway.gatewayId ? [env_1.env.dsaGateway.gatewayId] : []),
        ].filter((n, i, a) => a.indexOf(n) === i);
        const chosenGatewayId = (Number.isFinite(input.gatewayId) && input.gatewayId > 0
            ? input.gatewayId
            : undefined) ??
            configuredIds[0] ??
            489783;
        const payload = {
            // DT PayPro byGateway variant requires gateway_id.
            gateway_id: chosenGatewayId,
            merchant_id: Number(merchantId),
            merchant_order_no: merchantOrderNo,
            order_amount: orderAmount,
            email: order.email,
            name: input.name?.trim() || order.customerName,
            phone: order.phone,
            deeplink_switch: "1",
            notify_url: notifyUrl,
            noncestr,
            action,
            timestamp,
            sign,
        };
        const url = `${env_1.env.dsaGateway.baseUrl}/open/nax/payin/byGateway`;
        this.log("createForOrder:gateway_request", { url, merchantOrderNo });
        const response = await axios_1.default.post(url, payload, { timeout: 20_000 });
        this.log("createForOrder:gateway_response", { response: response.data });
        // PHP flow: prefer pay_url, then deeplink/upi, and also check nested data.*
        const data = response?.data;
        const nested = data?.data;
        const payUrl = data?.pay_url ??
            nested?.pay_url ??
            data?.deeplink ??
            nested?.deeplink ??
            data?.upi ??
            nested?.upi ??
            nested?.pay_url_H5 ??
            nested?.payUrlH5 ??
            data?.pay_url_H5;
        if (!payUrl || typeof payUrl !== "string") {
            throw new ApiError_1.ApiError(502, "Gateway did not return a payment URL");
        }
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                provider: "dsa_deeplink",
                method: "DSA Gateway",
                status: "Pending",
                "gateway.provider": "dsa-gateway",
                "gateway.gatewayId": chosenGatewayId,
                "gateway.merchantId": merchantId,
                "gateway.merchantOrderNo": merchantOrderNo,
                "gateway.payUrlH5": payUrl,
                "gateway.createResponse": response?.data,
            },
        });
        this.log("createForOrder:done", { merchantOrderNo });
        return { paymentUrl: payUrl, merchantOrderNo };
    }
    static verifyWebhookSignature(body) {
        if (!(0, env_1.isDsaGatewayConfigured)())
            return false;
        const { order_no, merchant_order_no, order_amount, noncestr, timestamp, sign, } = body;
        // Support both known schemes:
        // - payment-flow.md callback: merchant_order_no + order_no + order_amount + noncestr + timestamp
        // - PHP plugin scheme (when those fields exist): merchant_id + merchant_order_no + order_amount + noncestr + timestamp + action
        if (!merchant_order_no || !order_amount || !noncestr || !timestamp || !sign) {
            return false;
        }
        const signStr = String(sign);
        const pub = env_1.env.dsaGateway.publicKey;
        if (order_no) {
            const verifyText1 = String(merchant_order_no) +
                String(order_no) +
                String(order_amount) +
                String(noncestr) +
                String(timestamp);
            if ((0, verify_1.verifyDsaBase64)(verifyText1, signStr, pub))
                return true;
        }
        const merchant_id = body?.merchant_id;
        const action = body?.action;
        if (merchant_id != null && action != null) {
            const verifyText2 = String(merchant_id) +
                String(merchant_order_no) +
                String(order_amount) +
                String(noncestr) +
                String(timestamp) +
                String(action);
            if ((0, verify_1.verifyDsaBase64)(verifyText2, signStr, pub))
                return true;
        }
        return false;
    }
    static async handleWebhook(body) {
        const merchantOrderNo = String(body.merchant_order_no ?? "").trim();
        if (!merchantOrderNo) {
            throw new ApiError_1.ApiError(400, "Missing merchant_order_no");
        }
        const isValid = this.verifyWebhookSignature(body);
        if (!isValid) {
            throw new ApiError_1.ApiError(400, "Invalid signature");
        }
        const payment = await models_1.Payment.findOne({ "gateway.merchantOrderNo": merchantOrderNo });
        if (!payment)
            throw new ApiError_1.ApiError(404, "Payment record not found");
        const order = await models_1.Order.findById(payment.order);
        if (!order)
            throw new ApiError_1.ApiError(404, "Order not found");
        const status = String(body.status ?? "");
        const gatewayOrderNo = body.order_no ? String(body.order_no) : undefined;
        const update = {
            "gateway.provider": "dsa-gateway",
            "gateway.merchantOrderNo": merchantOrderNo,
            "gateway.gatewayOrderNo": gatewayOrderNo,
            "gateway.callbackData": body,
        };
        if (status === "2") {
            update.status = "Completed";
        }
        else if (status === "3" || status === "5") {
            update.status = "Failed";
        }
        else {
            update.status = "Pending";
        }
        await models_1.Payment.updateOne({ _id: payment._id }, { $set: update });
        if (status === "2" && order.status === "Pending") {
            await models_1.Order.updateOne({ _id: order._id }, { $set: { status: "Processing" } });
        }
        // Online payment success: clear persisted cart for logged-in users.
        if (status === "2" && order.user) {
            await models_1.User.updateOne({ _id: order.user }, { $set: { cart: [] } });
        }
        return "success";
    }
    static async verifyPayment(merchantOrderNo) {
        if (!(0, env_1.isDsaGatewayConfigured)()) {
            throw new ApiError_1.ApiError(500, "Payment gateway is not configured");
        }
        const mo = merchantOrderNo.trim();
        const payment = await models_1.Payment.findOne({ "gateway.merchantOrderNo": mo });
        if (!payment)
            throw new ApiError_1.ApiError(404, "Payment record not found");
        const order = await models_1.Order.findById(payment.order);
        if (!order)
            throw new ApiError_1.ApiError(404, "Order not found");
        const signText = env_1.env.dsaGateway.merchantId + mo;
        const sign = (0, sign_1.signDsaBase64)(signText, env_1.env.dsaGateway.privateKey);
        const url = `${env_1.env.dsaGateway.baseUrl}/open/nax/payin/findByNo`;
        const response = await axios_1.default.post(url, {
            merchant_id: Number(env_1.env.dsaGateway.merchantId),
            merchant_order_no: mo,
            sign,
        }, { timeout: 20_000 });
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                "gateway.provider": "dsa-gateway",
                "gateway.merchantId": env_1.env.dsaGateway.merchantId,
                "gateway.merchantOrderNo": mo,
                "gateway.verifyResponse": response?.data,
            },
        });
        const gatewayStatus = response?.data?.data?.status ??
            response?.data?.status ??
            response?.data?.data?.pay_status;
        if (String(gatewayStatus) === "2") {
            if (payment.status !== "Completed") {
                await models_1.Payment.updateOne({ _id: payment._id }, { $set: { status: "Completed" } });
            }
            if (order.status === "Pending") {
                await models_1.Order.updateOne({ _id: order._id }, { $set: { status: "Processing" } });
            }
            if (order.user) {
                await models_1.User.updateOne({ _id: order.user }, { $set: { cart: [] } });
            }
        }
        return {
            merchantOrderNo: mo,
            gatewayStatus: String(gatewayStatus ?? ''),
            paymentStatus: String(gatewayStatus) === '2' ? 'Completed' : payment.status,
            orderNumber: order.orderNumber,
            orderStatus: (String(gatewayStatus) === '2' && order.status === 'Pending')
                ? 'Processing'
                : order.status,
            raw: response?.data,
        };
    }
}
exports.DsaGatewayPaymentService = DsaGatewayPaymentService;
