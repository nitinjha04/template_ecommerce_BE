"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayPaymentController = void 0;
const dsaGatewayPayment_service_1 = require("../services/dsaGatewayPayment.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
class GatewayPaymentController {
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { orderNumber, email, phone, name } = req.body;
        if (!orderNumber?.trim()) {
            throw new ApiError_1.ApiError(400, 'orderNumber is required');
        }
        const result = await dsaGatewayPayment_service_1.DsaGatewayPaymentService.createForOrder({
            orderNumber: orderNumber.trim(),
            email,
            phone,
            name,
        });
        ApiResponse_1.ApiResponse.success(res, result, 'Payment link created');
    });
    static webhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        // Gateway requires a literal "success" response body (not JSON).
        await dsaGatewayPayment_service_1.DsaGatewayPaymentService.handleWebhook(req.body);
        res.type('text/plain').send('success');
    });
    static verify = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const merchantOrderNo = String(req.params.merchantOrderNo ?? '').trim();
        if (!merchantOrderNo)
            throw new ApiError_1.ApiError(400, 'merchantOrderNo is required');
        const result = await dsaGatewayPayment_service_1.DsaGatewayPaymentService.verifyPayment(merchantOrderNo);
        ApiResponse_1.ApiResponse.success(res, result, 'Payment verified');
    });
}
exports.GatewayPaymentController = GatewayPaymentController;
