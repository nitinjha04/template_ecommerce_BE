import { Response } from 'express';
import { OrderService } from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest, OrderStatus } from '../types';

export class OrderController {
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, phone, shippingAddress, paymentMethod, items, orderNote } =
      req.body;
    const customerName = `${shippingAddress.firstName} ${shippingAddress.lastName}`;

    const result = await OrderService.create({
      userId: req.user!.userId,
      customerName,
      email,
      phone,
      items,
      shippingAddress,
      paymentMethod,
      orderNote,
    });

    ApiResponse.created(res, result, 'Order placed successfully');
  });

  static getMyOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const orders = await OrderService.getMyOrders(req.user!.userId);
    ApiResponse.success(res, orders);
  });

  static getAll = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const orders = await OrderService.getAllOrders();
    ApiResponse.success(res, orders);
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
