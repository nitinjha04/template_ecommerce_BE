import { FilterQuery, Types } from "mongoose";
import { Product, IProduct } from "../models";
import { ApiError } from "../utils/ApiError";
import { slugify } from "../utils/slug";
import { ProductCategory } from "../types";

const ensureUniqueSlug = async (
  base: string,
  excludeId?: string,
): Promise<string> => {
  const root = slugify(base) || "product";
  let attempt = 0;
  while (attempt < 100) {
    const candidate = attempt === 0 ? root : `${root}-${attempt}`;
    const filter: FilterQuery<IProduct> = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Product.findOne(filter).select("_id");
    if (!exists) return candidate;
    attempt += 1;
  }
  return `${root}-${Date.now()}`;
};

interface ProductQuery {
  page?: number;
  limit?: number;
  featured?: boolean;
  inStock?: boolean;
  search?: string;
  sort?: "price_asc" | "price_desc" | "newest" | "oldest";
  category?: ProductCategory;
}

type ProductInput = Partial<
  Pick<
    IProduct,
    | "name"
    | "slug"
    | "price"
    | "category"
    | "description"
    | "metaTitle"
    | "metaDescription"
    | "metaKeywords"
    | "sizes"
    | "colors"
    | "images"
    | "tags"
    | "inStock"
    | "featured"
  >
>;

const prepareProductData = async (
  data: ProductInput,
  excludeId?: string,
): Promise<ProductInput> => {
  const next = { ...data };

  if (next.name && (!next.slug || !String(next.slug).trim())) {
    next.slug = await ensureUniqueSlug(next.name, excludeId);
  } else if (next.slug) {
    next.slug = slugify(String(next.slug));
    const existing = await Product.findOne({
      slug: next.slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (existing) {
      next.slug = await ensureUniqueSlug(next.slug, excludeId);
    }
  }

  if (next.name && !next.metaTitle) {
    next.metaTitle = next.name;
  }

  return next;
};

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
      const term = query.search.trim();
      filter.$or = [
        { $text: { $search: term } },
        { name: { $regex: term, $options: "i" } },
        { slug: { $regex: term, $options: "i" } },
      ];
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    switch (query.sort) {
      case "price_asc":
        sort = { price: 1 };
        break;
      case "price_desc":
        sort = { price: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "newest":
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

  static async getByIdentifier(identifier: string) {
    const isObjectId = Types.ObjectId.isValid(identifier);
    const product = isObjectId
      ? await Product.findById(identifier)
      : await Product.findOne({ slug: identifier.toLowerCase() });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    return product;
  }

  static async create(data: ProductInput) {
    const prepared = await prepareProductData(data);
    if (!prepared.slug) {
      throw new ApiError(400, "Slug is required");
    }
    return Product.create(prepared);
  }

  static async update(id: string, data: ProductInput) {
    const prepared = await prepareProductData(data, id);
    const product = await Product.findByIdAndUpdate(id, prepared, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    return product;
  }

  static async remove(id: string) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    return { id };
  }
}
