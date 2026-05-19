import { Contact, Order, Payment, Product, User } from '../models';

export class DashboardService {
  static async getStats() {
    const [
      totalOrders,
      totalProducts,
      totalCustomers,
      unreadContacts,
      pendingOrders,
      revenueAgg,
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Contact.countDocuments({ read: false }),
      Order.countDocuments({ status: 'Pending' }),
      Order.aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber customerName email total status createdAt'),
      Order.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;
    const completedPayments = await Payment.countDocuments({ status: 'Completed' });

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
