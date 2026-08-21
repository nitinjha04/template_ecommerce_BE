import { FilterQuery } from 'mongoose';
import { Order, Payment } from '../models';
import { ApiError } from '../utils/ApiError';
import {
  buildPaginationMeta,
  PaginatedResult,
  parsePagination,
  searchRegex,
} from '../utils/pagination';
import { serializePayment, serializePayments } from '../utils/serializePayment';
import { AdminListQuery } from '../types/adminList';
import { IPayment } from '../models/Payment.model';
import { PaymentStatus } from '../types';
import type { SerializedPayment } from '../utils/serializePayment';
import { mergeStoreFilter } from '../utils/storeScope';

export class PaymentService {
  static async getAllAdmin(
    query: AdminListQuery
  ): Promise<PaginatedResult<SerializedPayment>> {
    const { page, limit, skip } = parsePagination(query);
    const filter: FilterQuery<IPayment> = mergeStoreFilter({}, query.storeId);

    if (query.status && query.status !== 'All') {
      filter.status = query.status as PaymentStatus;
    }

    const regex = searchRegex(query.search ?? '');
    if (regex) {
      const matchingOrders = await Order.find(
        mergeStoreFilter({ orderNumber: regex }, query.storeId)
      )
        .select('_id')
        .lean();
      const orderIds = matchingOrders.map((o) => o._id);
      filter.$or = [
        { paymentNumber: regex },
        ...(orderIds.length ? [{ order: { $in: orderIds } }] : []),
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order', 'orderNumber total status'),
      Payment.countDocuments(filter),
    ]);

    return {
      items: serializePayments(payments),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  static async getMyPayments(userId: string) {
    const payments = await Payment.find(mergeStoreFilter({ user: userId }))
      .sort({ createdAt: -1 })
      .populate('order', 'orderNumber total');
    return serializePayments(payments);
  }

  static async getById(id: string, userId?: string, isAdmin = false) {
    const payment = await Payment.findOne(mergeStoreFilter({ _id: id })).populate(
      'order',
      'orderNumber total status'
    );
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    if (!isAdmin) {
      if (!payment.user || !userId) {
        throw new ApiError(403, 'Access denied');
      }
      if (payment.user.toString() !== userId) {
        throw new ApiError(403, 'Access denied');
      }
    }

    return serializePayment(payment);
  }

  static async updateStatus(id: string, status: PaymentStatus) {
    const payment = await Payment.findOneAndUpdate(
      mergeStoreFilter({ _id: id }),
      { status },
      { new: true, runValidators: true }
    ).populate('order', 'orderNumber total status');
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }
    return serializePayment(payment);
  }
}
