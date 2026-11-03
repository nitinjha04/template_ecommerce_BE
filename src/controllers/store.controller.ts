import { Response } from 'express';
import { StoreService } from '../services/store.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest } from '../types';

export class StoreController {
  static list = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stores = await StoreService.listAll();
    ApiResponse.success(res, stores);
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const store = await StoreService.getById(getParamId(req));
    ApiResponse.success(res, store);
  });

  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const store = await StoreService.create(req.body);
    ApiResponse.created(res, store, 'Store created');
  });

  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const store = await StoreService.update(getParamId(req), req.body);
    ApiResponse.success(res, store, 'Store updated');
  });

  static remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    await StoreService.remove(getParamId(req));
    ApiResponse.success(res, null, 'Store deleted');
  });
}
