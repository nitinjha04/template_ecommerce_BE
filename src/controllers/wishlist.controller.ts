import { Response } from 'express';
import { WishlistService } from '../services/wishlist.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';
import { ApiResponse } from '../views/ApiResponse';

export class WishlistController {
  static list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = await WishlistService.list(req.user!.userId);
    ApiResponse.success(res, items, 'Wishlist fetched');
  });

  static toggle = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await WishlistService.toggle(
      req.user!.userId,
      req.body.productId
    );
    ApiResponse.success(res, result, result.added ? 'Added to wishlist' : 'Removed from wishlist');
  });

  static clear = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await WishlistService.clear(req.user!.userId);
    ApiResponse.success(res, result, 'Wishlist cleared');
  });
}
