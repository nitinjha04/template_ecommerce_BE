import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../models';
import { ApiError } from '../utils/ApiError';
import { ProductCategory } from '../types';

interface ProductQuery {
  page?: number;
  limit?: number;
  category?: ProductCategory;
  featured?: boolean;
  inStock?: boolean;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
}

type ProductInput = Partial<
  Pick<
    IProduct,
    | 'name'
    | 'price'
    | 'category'
    | 'description'
    | 'sizes'
    | 'colors'
    | 'images'
    | 'tags'
    | 'inStock'
    | 'featured'
  >
>;

export class ProductService {
  static async getAll(query: ProductQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IProduct> = {};

    if (query.category) filter.category = query.category;
    if (query.featured !== undefined) filter.featured = query.featured;
    if (query.inStock !== undefined) filter.inStock = query.inStock;

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    switch (query.sort) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    return product;
  }

  static async create(data: ProductInput) {
    return Product.create(data);
  }

  static async update(id: string, data: ProductInput) {
    const product = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    return product;
  }

  static async remove(id: string) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    return { id };
  }
}
