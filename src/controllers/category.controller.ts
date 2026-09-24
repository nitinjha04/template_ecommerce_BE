import { Response } from 'express';
import { Request } from 'express';
import { CategoryService } from '../services/category.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';

export class CategoryController {
  static list = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await CategoryService.listActive();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    ApiResponse.success(res, categories, 'Categories fetched');
  });

  static listAll = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await CategoryService.listAll();
    ApiResponse.success(res, categories, 'Categories fetched');
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const category = await CategoryService.create(req.body);
    ApiResponse.created(res, category, 'Category created');
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const category = await CategoryService.update(getParamId(req), req.body);
    ApiResponse.success(res, category, 'Category updated');
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    await CategoryService.remove(getParamId(req));
    ApiResponse.success(res, null, 'Category deleted');
  });
};
