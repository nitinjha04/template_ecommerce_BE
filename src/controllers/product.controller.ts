import { Response } from 'express';
import { Request } from 'express';
import { ProductService } from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';
import { ProductCategory } from '../types';

export class ProductController {
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, featured, inStock, search, sort, category } = req.query;

    const result = await ProductService.getAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
      search: search as string | undefined,
      sort: sort as 'price_asc' | 'price_desc' | 'newest' | 'oldest' | undefined,
      category: category as ProductCategory | undefined,
    });

    ApiResponse.success(res, result.products, 'Products fetched', 200, result.pagination);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.getByIdentifier(getParamId(req));
    ApiResponse.success(res, product);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.create(req.body);
    ApiResponse.created(res, product, 'Product created');
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.update(getParamId(req), req.body);
    ApiResponse.success(res, product, 'Product updated');
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    await ProductService.remove(getParamId(req));
    ApiResponse.success(res, null, 'Product deleted');
  });
}
