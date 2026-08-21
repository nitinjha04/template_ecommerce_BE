"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const serializePayment_1 = require("../utils/serializePayment");
const storeScope_1 = require("../utils/storeScope");
class PaymentService {
    static async getAllAdmin(query) {
        const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
        const filter = (0, storeScope_1.mergeStoreFilter)({}, query.storeId);
        if (query.status && query.status !== 'All') {
            filter.status = query.status;
        }
        const regex = (0, pagination_1.searchRegex)(query.search ?? '');
        if (regex) {
            const matchingOrders = await models_1.Order.find((0, storeScope_1.mergeStoreFilter)({ orderNumber: regex }, query.storeId))
                .select('_id')
                .lean();
            const orderIds = matchingOrders.map((o) => o._id);
            filter.$or = [
                { paymentNumber: regex },
                ...(orderIds.length ? [{ order: { $in: orderIds } }] : []),
            ];
        }
        const [payments, total] = await Promise.all([
            models_1.Payment.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('order', 'orderNumber total status'),
            models_1.Payment.countDocuments(filter),
        ]);
        return {
            items: (0, serializePayment_1.serializePayments)(payments),
            pagination: (0, pagination_1.buildPaginationMeta)(page, limit, total),
        };
    }
    static async getMyPayments(userId) {
        const payments = await models_1.Payment.find((0, storeScope_1.mergeStoreFilter)({ user: userId }))
            .sort({ createdAt: -1 })
            .populate('order', 'orderNumber total');
        return (0, serializePayment_1.serializePayments)(payments);
    }
    static async getById(id, userId, isAdmin = false) {
        const payment = await models_1.Payment.findOne((0, storeScope_1.mergeStoreFilter)({ _id: id })).populate('order', 'orderNumber total status');
        if (!payment) {
            throw new ApiError_1.ApiError(404, 'Payment not found');
        }
        if (!isAdmin) {
            if (!payment.user || !userId) {
                throw new ApiError_1.ApiError(403, 'Access denied');
            }
            if (payment.user.toString() !== userId) {
                throw new ApiError_1.ApiError(403, 'Access denied');
            }
        }
        return (0, serializePayment_1.serializePayment)(payment);
    }
    static async updateStatus(id, status) {
        const payment = await models_1.Payment.findOneAndUpdate((0, storeScope_1.mergeStoreFilter)({ _id: id }), { status }, { new: true, runValidators: true }).populate('order', 'orderNumber total status');
        if (!payment) {
            throw new ApiError_1.ApiError(404, 'Payment not found');
        }
        return (0, serializePayment_1.serializePayment)(payment);
    }
}
exports.PaymentService = PaymentService;
