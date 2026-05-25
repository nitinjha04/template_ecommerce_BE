import { Response } from 'express';
import { Request } from 'express';
import { ProductService } from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';
import { shouldIncludeUnpublished } from '../utils/optionalAdmin';

const parseCsvQuery = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
};

export class ProductController {
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      featured,
      inStock,
      search,
      sort,
      category,
      minPrice,
      maxPrice,
      sizes,
      subcategory,
    } = req.query;

    const includeUnpublished = shouldIncludeUnpublished(req);

    const result = await ProductService.getAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      includeUnpublished,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
      search: search as string | undefined,
      sort: sort as
        | 'price_asc'
        | 'price_desc'
        | 'newest'
        | 'oldest'
        | 'random'
        | undefined,
      category: category as string | undefined,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      sizes: parseCsvQuery(sizes),
      subcategories: parseCsvQuery(subcategory),
    });

    ApiResponse.success(res, result.products, 'Products fetched', 200, {
      ...result.pagination,
      facets: result.facets,
    });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.getByIdentifier(
      getParamId(req),
      shouldIncludeUnpublished(req),
    );
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
