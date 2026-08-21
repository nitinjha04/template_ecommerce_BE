import { Contact, Order, Payment, Product, User } from '../models';
import { mergeStoreFilter } from '../utils/storeScope';

export class DashboardService {
  static async getStats(storeId?: string) {
    const storeFilter = mergeStoreFilter({}, storeId);
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
      Order.countDocuments(storeFilter),
      Product.countDocuments(storeFilter),
      User.countDocuments(mergeStoreFilter({ role: 'customer' })),
      Contact.countDocuments(mergeStoreFilter({ read: false })),
      Order.countDocuments(mergeStoreFilter({ status: 'Pending' })),
      Order.aggregate<{ total: number }>([
        { $match: storeFilter },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.find(storeFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber customerName email total status createdAt'),
      Order.aggregate<{ _id: string; count: number }>([
        { $match: storeFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;
    const completedPayments = await Payment.countDocuments(
      mergeStoreFilter({ status: 'Completed' })
    );

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
