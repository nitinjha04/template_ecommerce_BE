import { Payment } from '../models';
import { ApiError } from '../utils/ApiError';
import { PaymentStatus } from '../types';

export class PaymentService {
  static async getAll() {
    return Payment.find().sort({ createdAt: -1 }).populate('order', 'orderNumber total');
  }

  static async getMyPayments(userId: string) {
    return Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('order', 'orderNumber total');
  }

  static async getById(id: string, userId?: string, isAdmin = false) {
    const payment = await Payment.findById(id).populate(
      'order',
      'orderNumber total status'
    );
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    if (!isAdmin && payment.user.toString() !== userId) {
      throw new ApiError(403, 'Access denied');
    }

    return payment;
  }

  static async updateStatus(id: string, status: PaymentStatus) {
    const payment = await Payment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }
    return payment;
  }
}
