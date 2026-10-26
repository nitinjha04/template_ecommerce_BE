import { Response } from 'express';
import { OrderService } from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { normalizeGuestOrderBody } from '../utils/orderPayload';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest, OrderStatus } from '../types';
import { pickStoreIdFromQuery } from '../utils/adminStoreQuery';

export class OrderController {
  static createGuest = asyncHandler(async (_req, _res: Response) => {
    throw new ApiError(403, 'Please sign in or create an account to place an order');
  });

  static track = asyncHandler(async (req, res: Response) => {
    const orders = await OrderService.track(req.body.query);
    ApiResponse.success(res, orders);
  });

  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const normalized = normalizeGuestOrderBody(req.body);

    const result = await OrderService.create({
      userId: req.user!.userId,
      ...normalized,
    });

    ApiResponse.created(res, result, 'Order placed successfully');
  });

  static getMyOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orders = await OrderService.getMyOrders(
      req.user!.userId,
      req.user!.email
    );
    ApiResponse.success(res, orders);
  });

  static getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, search, status } = req.query;
    const result = await OrderService.getAllAdmin({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      storeId: pickStoreIdFromQuery(req.query.storeId),
    });
    ApiResponse.success(res, result.items, 'Orders fetched', 200, result.pagination);
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user!.role === 'admin';
    const order = await OrderService.getById(
      getParamId(req),
      req.user!.userId,
      isAdmin
    );
    ApiResponse.success(res, order);
  });

  static updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await OrderService.updateStatus(
      getParamId(req),
      req.body.status as OrderStatus
    );
    ApiResponse.success(res, order, 'Order status updated');
  });

  static abandonUnpaidOnline = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderNumber =
      typeof req.body?.orderNumber === 'string'
        ? req.body.orderNumber
        : typeof req.params.orderNumber === 'string'
          ? req.params.orderNumber
          : '';
    const result = await OrderService.abandonUnpaidOnlineOrder(
      req.user!.userId,
      orderNumber
    );
    ApiResponse.success(res, result, 'Unpaid order cancelled');
  });

  static exportCsv = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const csv = await OrderService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="orders-${Date.now()}.csv"`
    );
    res.send(csv);
  });
}
