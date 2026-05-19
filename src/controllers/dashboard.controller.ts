import { Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest } from '../types';

export class DashboardController {
  static getStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await DashboardService.getStats();
    ApiResponse.success(res, stats);
  });
}
