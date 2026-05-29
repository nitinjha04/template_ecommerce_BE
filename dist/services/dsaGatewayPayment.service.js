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
        const merchantOrderNo = order.orderNumber;
        const orderAmount = String(order.total);
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
            console.info("🚀 ~ DsaGatewayPaymentService ~ createForOrder ~ signText:", signText);
            sign = (0, sign_1.signDsaBase64)(signText, env_1.env.dsaGateway.privateKey);
            console.info("🚀 ~ DsaGatewayPaymentService ~ createForOrder ~ sign:", sign);
        }
        catch (err) {
            this.log("createForOrder:signing_failed", {
                error: err instanceof Error ? err.message : String(err),
                code: err?.code,
                reason: err?.reason,
            });
            throw err;
        }
        const payload = {
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
        this.log("createForOrder:gateway_request", payload);
        const response = await axios_1.default.post(url, { ...payload, gateway_id: 489783 }, { timeout: 20_000 });
        this.log("createForOrder:gateway_response", { response: response.data });
        const payUrlH5 = response?.data?.data?.pay_url_H5 ??
            response?.data?.data?.payUrlH5 ??
            response?.data?.pay_url_H5;
        if (!payUrlH5 || typeof payUrlH5 !== "string") {
            throw new ApiError_1.ApiError(502, "Gateway did not return a payment URL");
        }
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                method: "DSA Gateway",
                status: "Pending",
                "gateway.provider": "dsa-gateway",
                "gateway.merchantId": merchantId,
                "gateway.merchantOrderNo": merchantOrderNo,
                "gateway.payUrlH5": payUrlH5,
                "gateway.createResponse": response?.data,
            },
        });
        this.log("createForOrder:done", { merchantOrderNo });
        return { paymentUrl: payUrlH5, merchantOrderNo };
    }
    static verifyWebhookSignature(body) {
        if (!(0, env_1.isDsaGatewayConfigured)())
            return false;
        const { order_no, merchant_order_no, order_amount, noncestr, timestamp, sign, } = body;
        if (!order_no ||
            !merchant_order_no ||
            !order_amount ||
            !noncestr ||
            !timestamp ||
            !sign) {
            return false;
        }
        const verifyText = String(merchant_order_no) +
            String(order_no) +
            String(order_amount) +
            String(noncestr) +
            String(timestamp);
        return (0, verify_1.verifyDsaBase64)(verifyText, String(sign), env_1.env.dsaGateway.publicKey);
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
        const order = await models_1.Order.findOne({ orderNumber: merchantOrderNo });
        if (!order)
            throw new ApiError_1.ApiError(404, "Order not found");
        const payment = await models_1.Payment.findOne({ order: order._id });
        if (!payment)
            throw new ApiError_1.ApiError(404, "Payment record not found");
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
        const orderNumber = merchantOrderNo.trim();
        const order = await models_1.Order.findOne({ orderNumber });
        if (!order)
            throw new ApiError_1.ApiError(404, "Order not found");
        const payment = await models_1.Payment.findOne({ order: order._id });
        if (!payment)
            throw new ApiError_1.ApiError(404, "Payment record not found");
        const signText = env_1.env.dsaGateway.merchantId + orderNumber;
        const sign = (0, sign_1.signDsaBase64)(signText, env_1.env.dsaGateway.privateKey);
        const url = `${env_1.env.dsaGateway.baseUrl}/open/nax/payin/findByNo`;
        const response = await axios_1.default.post(url, {
            merchant_id: Number(env_1.env.dsaGateway.merchantId),
            merchant_order_no: orderNumber,
            sign,
        }, { timeout: 20_000 });
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                "gateway.provider": "dsa-gateway",
                "gateway.merchantId": env_1.env.dsaGateway.merchantId,
                "gateway.merchantOrderNo": orderNumber,
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
        return response?.data;
    }
}
exports.DsaGatewayPaymentService = DsaGatewayPaymentService;
