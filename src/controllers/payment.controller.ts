import { Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest, PaymentStatus } from '../types';

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
}
