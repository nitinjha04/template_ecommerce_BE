import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest, PaymentStatus } from '../types';
import { DsaGatewayPaymentService } from '../services/dsaGatewayPayment.service';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { Order, Payment } from '../models';

export class PaymentController {
  static getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, search, status } = req.query;
    const result = await PaymentService.getAllAdmin({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
    });
    ApiResponse.success(res, result.items, 'Payments fetched', 200, result.pagination);
  });

  static getMyPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const payments = await PaymentService.getMyPayments(req.user!.userId);
    ApiResponse.success(res, payments);
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user!.role === 'admin';
    const payment = await PaymentService.getById(
      getParamId(req),
      req.user!.userId,
      isAdmin
    );
    ApiResponse.success(res, payment);
  });

  static updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const payment = await PaymentService.updateStatus(
      getParamId(req),
      req.body.status as PaymentStatus
    );
    ApiResponse.success(res, payment, 'Payment status updated');
  });

  static createProviderPayment = asyncHandler(async (req: Request, res: Response) => {
    const {
      orderNumber,
      provider,
      gatewayId,
      email,
      phone,
      name,
    } = req.body as {
      orderNumber: string;
      provider: 'dsa_deeplink' | 'payu' | 'phonepe' | 'direct_upi';
      gatewayId?: number;
      email?: string;
      phone?: string;
      name?: string;
    };

    if (provider === 'dsa_deeplink') {
      const result = await DsaGatewayPaymentService.createForOrder({
        orderNumber,
        gatewayId,
        email,
        phone,
        name,
      });
      ApiResponse.success(res, result, 'Payment link created');
      return;
    }

    if (provider === 'direct_upi') {
      const vpa = env.directUpi.vpa;
      if (!vpa) {
        throw new ApiError(500, 'Direct UPI is not configured');
      }

      const order = await Order.findOne({ orderNumber: orderNumber.trim() });
      if (!order) throw new ApiError(404, 'Order not found');

      // Optional guest safety check (match on email/phone if provided)
      if (email && order.email !== email.trim().toLowerCase()) {
        throw new ApiError(403, 'Order email does not match');
      }
      if (phone) {
        const digits = phone.replace(/\D/g, '');
        const orderDigits = String(order.phone ?? '').replace(/\D/g, '');
        if (digits && orderDigits && digits !== orderDigits) {
          throw new ApiError(403, 'Order phone does not match');
        }
      }

      const payment = await Payment.findOne({ order: order._id });
      if (!payment) throw new ApiError(404, 'Payment record not found for order');
      if (payment.status === 'Completed') {
        throw new ApiError(400, 'Order is already paid');
      }

      const amount = String(order.total);
      const tn = `Order ${order.orderNumber}`;
      const upiLink =
        `upi://pay?pa=${encodeURIComponent(vpa)}` +
        `&am=${encodeURIComponent(amount)}` +
        `&cu=INR` +
        `&tn=${encodeURIComponent(tn)}`;

      await Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            provider: 'direct_upi',
            method: 'Direct UPI',
            status: 'Pending',
            directUpi: {
              vpa,
              upiLink,
            },
          },
        }
      );

      ApiResponse.success(
        res,
        { upiLink, qrData: upiLink, vpa, amount: order.total, orderNumber: order.orderNumber },
        'UPI link created'
      );
      return;
    }

    if (provider === 'payu') {
      throw new ApiError(
        501,
        'PayU integration is not configured yet. Please choose another method.'
      );
    }
    if (provider === 'phonepe') {
      throw new ApiError(
        501,
        'PhonePe integration is not configured yet. Please choose another method.'
      );
    }

    throw new ApiError(400, 'Invalid provider');
  });
}
