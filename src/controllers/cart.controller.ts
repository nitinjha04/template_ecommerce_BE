import { Response } from 'express';
import { CartService } from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';
import { ApiResponse } from '../views/ApiResponse';

export class CartController {
  static get = asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await CartService.get(req.user!.userId);
    ApiResponse.success(res, items, 'Cart fetched');
  });

  static upsertLine = asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await CartService.upsertLine({
      userId: req.user!.userId,
      productId: req.body.productId,
      quantity: Number(req.body.quantity),
      size: req.body.size,
      color: req.body.color,
    });
    ApiResponse.success(res, items, 'Cart updated');
  });

  static removeLine = asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await CartService.removeLine({
      userId: req.user!.userId,
      productId: req.body.productId,
      size: req.body.size,
      color: req.body.color,
    });
    ApiResponse.success(res, items, 'Item removed');
  });

  static clear = asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await CartService.clear(req.user!.userId);
    ApiResponse.success(res, items, 'Cart cleared');
  });

  static merge = asyncHandler(async (req: AuthRequest, res: Response) => {
    const raw = req.body.items;
    const items = Array.isArray(raw) ? raw : [];
    const merged = await CartService.mergeLines(
      req.user!.userId,
      items.map((line: Record<string, unknown>) => ({
        productId: String(line.productId ?? ''),
        quantity: Number(line.quantity ?? 1),
        size: typeof line.size === 'string' ? line.size : undefined,
        color: typeof line.color === 'string' ? line.color : undefined,
      }))
    );
    ApiResponse.success(res, merged, 'Cart merged');
  });
}

