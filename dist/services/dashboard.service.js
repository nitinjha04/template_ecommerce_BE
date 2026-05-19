"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const models_1 = require("../models");
class DashboardService {
    static async getStats() {
        const [totalOrders, totalProducts, totalCustomers, unreadContacts, pendingOrders, revenueAgg, recentOrders, ordersByStatus,] = await Promise.all([
            models_1.Order.countDocuments(),
            models_1.Product.countDocuments(),
            models_1.User.countDocuments({ role: 'customer' }),
            models_1.Contact.countDocuments({ read: false }),
            models_1.Order.countDocuments({ status: 'Pending' }),
            models_1.Order.aggregate([
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            models_1.Order.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('orderNumber customerName email total status createdAt'),
            models_1.Order.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);
        const totalRevenue = revenueAgg[0]?.total ?? 0;
        const completedPayments = await models_1.Payment.countDocuments({ status: 'Completed' });
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
