"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const payment_service_1 = require("../services/payment.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
const dsaGatewayPayment_service_1 = require("../services/dsaGatewayPayment.service");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
const models_1 = require("../models");
class PaymentController {
    static getAll = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { page, limit, search, status } = req.query;
        const result = await payment_service_1.PaymentService.getAllAdmin({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search: search,
            status: status,
        });
        ApiResponse_1.ApiResponse.success(res, result.items, 'Payments fetched', 200, result.pagination);
    });
    static getMyPayments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payments = await payment_service_1.PaymentService.getMyPayments(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, payments);
    });
    static getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const isAdmin = req.user.role === 'admin';
        const payment = await payment_service_1.PaymentService.getById((0, params_1.getParamId)(req), req.user.userId, isAdmin);
        ApiResponse_1.ApiResponse.success(res, payment);
    });
    static updateStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payment = await payment_service_1.PaymentService.updateStatus((0, params_1.getParamId)(req), req.body.status);
        ApiResponse_1.ApiResponse.success(res, payment, 'Payment status updated');
    });
    static createProviderPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { orderNumber, provider, gatewayId, email, phone, name, } = req.body;
        if (provider === 'dsa_deeplink') {
            const result = await dsaGatewayPayment_service_1.DsaGatewayPaymentService.createForOrder({
                orderNumber,
                gatewayId,
                email,
                phone,
                name,
            });
            ApiResponse_1.ApiResponse.success(res, result, 'Payment link created');
            return;
        }
        if (provider === 'direct_upi') {
            const vpa = env_1.env.directUpi.vpa;
            if (!vpa) {
                throw new ApiError_1.ApiError(500, 'Direct UPI is not configured');
            }
            const order = await models_1.Order.findOne({ orderNumber: orderNumber.trim() });
            if (!order)
                throw new ApiError_1.ApiError(404, 'Order not found');
            // Optional guest safety check (match on email/phone if provided)
            if (email && order.email !== email.trim().toLowerCase()) {
                throw new ApiError_1.ApiError(403, 'Order email does not match');
            }
            if (phone) {
                const digits = phone.replace(/\D/g, '');
                const orderDigits = String(order.phone ?? '').replace(/\D/g, '');
                if (digits && orderDigits && digits !== orderDigits) {
                    throw new ApiError_1.ApiError(403, 'Order phone does not match');
                }
            }
            const payment = await models_1.Payment.findOne({ order: order._id });
            if (!payment)
                throw new ApiError_1.ApiError(404, 'Payment record not found for order');
            if (payment.status === 'Completed') {
                throw new ApiError_1.ApiError(400, 'Order is already paid');
            }
            const amount = String(order.total);
            const tn = `Order ${order.orderNumber}`;
            const upiLink = `upi://pay?pa=${encodeURIComponent(vpa)}` +
                `&am=${encodeURIComponent(amount)}` +
                `&cu=INR` +
                `&tn=${encodeURIComponent(tn)}`;
            await models_1.Payment.updateOne({ _id: payment._id }, {
                $set: {
                    provider: 'direct_upi',
                    method: 'Direct UPI',
                    status: 'Pending',
                    directUpi: {
                        vpa,
                        upiLink,
                    },
                },
            });
            ApiResponse_1.ApiResponse.success(res, { upiLink, qrData: upiLink, vpa, amount: order.total, orderNumber: order.orderNumber }, 'UPI link created');
            return;
        }
        if (provider === 'payu') {
            throw new ApiError_1.ApiError(501, 'PayU integration is not configured yet. Please choose another method.');
        }
        if (provider === 'phonepe') {
            throw new ApiError_1.ApiError(501, 'PhonePe integration is not configured yet. Please choose another method.');
        }
        throw new ApiError_1.ApiError(400, 'Invalid provider');
    });
}
exports.PaymentController = PaymentController;
