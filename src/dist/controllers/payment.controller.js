"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const payment_service_1 = require("../services/payment.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class PaymentController {
    static getAll = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const payments = await payment_service_1.PaymentService.getAll();
        ApiResponse_1.ApiResponse.success(res, payments);
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
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=payment.controller.js.map