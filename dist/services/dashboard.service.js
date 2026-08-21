"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const models_1 = require("../models");
const storeScope_1 = require("../utils/storeScope");
class DashboardService {
    static async getStats(storeId) {
        const storeFilter = (0, storeScope_1.mergeStoreFilter)({}, storeId);
        const [totalOrders, totalProducts, totalCustomers, unreadContacts, pendingOrders, revenueAgg, recentOrders, ordersByStatus,] = await Promise.all([
            models_1.Order.countDocuments(storeFilter),
            models_1.Product.countDocuments(storeFilter),
            models_1.User.countDocuments((0, storeScope_1.mergeStoreFilter)({ role: 'customer' })),
            models_1.Contact.countDocuments((0, storeScope_1.mergeStoreFilter)({ read: false })),
            models_1.Order.countDocuments((0, storeScope_1.mergeStoreFilter)({ status: 'Pending' })),
            models_1.Order.aggregate([
                { $match: storeFilter },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            models_1.Order.find(storeFilter)
                .sort({ createdAt: -1 })
                .limit(5)
                .select('orderNumber customerName email total status createdAt'),
            models_1.Order.aggregate([
                { $match: storeFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);
        const totalRevenue = revenueAgg[0]?.total ?? 0;
        const completedPayments = await models_1.Payment.countDocuments((0, storeScope_1.mergeStoreFilter)({ status: 'Completed' }));
        return {
            totalOrders,
            totalProducts,
            totalCustomers,
            unreadContacts,
            pendingOrders,
            totalRevenue,
            completedPayments,
            avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
            ordersByStatus: ordersByStatus.map((s) => ({
                status: s._id,
                count: s.count,
            })),
            recentOrders,
        };
    }
}
exports.DashboardService = DashboardService;
