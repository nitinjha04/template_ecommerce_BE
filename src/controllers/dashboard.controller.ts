import { Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest } from '../types';
import { pickStoreIdFromQuery } from '../utils/adminStoreQuery';

export class DashboardController {
  static getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const storeId = pickStoreIdFromQuery(req.query.storeId);
    const stats = await DashboardService.getStats(storeId);
    ApiResponse.success(res, stats);
  });
}
