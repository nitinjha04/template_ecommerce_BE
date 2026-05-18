"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
class PaymentService {
    static async getAll() {
        return models_1.Payment.find().sort({ createdAt: -1 }).populate('order', 'orderNumber total');
    }
    static async getMyPayments(userId) {
        return models_1.Payment.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('order', 'orderNumber total');
    }
    static async getById(id, userId, isAdmin = false) {
        const payment = await models_1.Payment.findById(id).populate('order', 'orderNumber total status');
        if (!payment) {
            throw new ApiError_1.ApiError(404, 'Payment not found');
        }
        if (!isAdmin && payment.user.toString() !== userId) {
            throw new ApiError_1.ApiError(403, 'Access denied');
        }
        return payment;
    }
    static async updateStatus(id, status) {
        const payment = await models_1.Payment.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        if (!payment) {
            throw new ApiError_1.ApiError(404, 'Payment not found');
        }
        return payment;
    }
}
exports.PaymentService = PaymentService;
