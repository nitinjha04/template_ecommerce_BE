import { FilterQuery, Types } from "mongoose";
import { Product, IProduct } from "../models";
import { ApiError } from "../utils/ApiError";
import { slugify } from "../utils/slug";
import { CategoryService } from "./category.service";
import { applySearchOr } from "../utils/pagination";
import { normalizeProductImages } from "../utils/productImages";

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

export interface ProductQuery {
  page?: number;
  limit?: number;
  featured?: boolean;
  inStock?: boolean;
  search?: string;
  sort?: "price_asc" | "price_desc" | "newest" | "oldest" | "random";
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  subcategories?: string[];
  /** When true, draft/unpublished products are included (admin only). */
  includeUnpublished?: boolean;
}

export interface ProductFacets {
  sizes: Array<{ size: string; count: number }>;
  categories: Array<{ name: string; count: number }>;
  priceRange: { min: number; max: number };
}

type FacetOmit = "sizes" | "subcategories";

const buildProductFilter = (
  query: ProductQuery,
  omit: FacetOmit[] = [],
): FilterQuery<IProduct> => {
  const filter: FilterQuery<IProduct> = {};

  if (!query.includeUnpublished) {
    filter.isPublished = { $ne: false };
  }

  if (query.category) filter.category = query.category;
  if (query.featured !== undefined) filter.featured = query.featured;
  if (query.inStock !== undefined) filter.inStock = query.inStock;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) {
      (filter.price as Record<string, number>).$gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      (filter.price as Record<string, number>).$lte = query.maxPrice;
    }
  }

  if (query.sizes?.length && !omit.includes("sizes")) {
    filter.sizes = { $in: query.sizes };
  }

  if (query.subcategories?.length && !omit.includes("subcategories")) {
    filter.breadcrumbCategory = { $in: query.subcategories };
  }

  if (query.search?.trim()) {
    return applySearchOr(filter, query.search, [
      "name",
      "slug",
      "breadcrumbCategory",
      "description",
      "tags",
    ]);
  }

  return filter;
};

const getSortOption = (
  sort?: ProductQuery["sort"],
): Record<string, 1 | -1> | "random" => {
  switch (sort) {
    case "price_asc":
      return { price: 1 };
    case "price_desc":
      return { price: -1 };
    case "oldest":
      return { createdAt: 1 };
    case "random":
      return "random";
    case "newest":
    default:
      return { createdAt: -1 };
  }
};

type ProductInput = Partial<
  Pick<
    IProduct,
    | "name"
    | "slug"
    | "price"
    | "originalPrice"
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
    | "isHot"
    | "isPublished"
    | "fabricComposition"
    | "garmentLength"
    | "packageContains"
    | "washCare"
    | "neckline"
    | "sleeveLength"
    | "fitting"
    | "weight"
    | "dimensions"
    | "stockQuantity"
    | "deliveryStartDate"
    | "deliveryEndDate"
    | "breadcrumbCategory"
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

  if (next.images !== undefined) {
    next.images = normalizeProductImages(next.images);
  }

  if (next.category !== undefined) {
    next.category = await CategoryService.resolveProductCategory(
      String(next.category),
    );
  }

  return next;
};

export class ProductService {
  static async getFacets(query: ProductQuery): Promise<ProductFacets> {
    const baseForSizes = buildProductFilter(query, ["sizes"]);
    const baseForCategories = buildProductFilter(query, ["subcategories"]);
    const baseForPrice = buildProductFilter(query);

    const [sizeAgg, categoryAgg, priceAgg] = await Promise.all([
      Product.aggregate([
        { $match: baseForSizes },
        { $unwind: "$sizes" },
        { $match: { sizes: { $ne: "" } } },
        { $group: { _id: "$sizes", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.aggregate([
        { $match: baseForCategories },
        {
          $addFields: {
            facetCategory: {
              $cond: [
                {
                  $gt: [
                    { $strLenCP: { $ifNull: ["$breadcrumbCategory", ""] } },
                    0,
                  ],
                },
                "$breadcrumbCategory",
                "$category",
              ],
            },
          },
        },
        { $group: { _id: "$facetCategory", count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ""] } } },
        { $sort: { _id: 1 } },
      ]),
      Product.aggregate([
        { $match: baseForPrice },
        {
          $group: {
            _id: null,
            min: { $min: "$price" },
            max: { $max: "$price" },
          },
        },
      ]),
    ]);

    const priceRow = priceAgg[0] as { min?: number; max?: number } | undefined;

    return {
      sizes: sizeAgg.map((row) => ({
        size: String(row._id),
        count: row.count as number,
      })),
      categories: categoryAgg.map((row) => ({
        name: String(row._id),
        count: row.count as number,
      })),
      priceRange: {
        min: Math.floor(priceRow?.min ?? 0),
        max: Math.ceil(priceRow?.max ?? 5000),
      },
    };
  }

  static async getAll(query: ProductQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;
    const filter = buildProductFilter(query);
    const sortOpt = getSortOption(query.sort);

    let products: IProduct[];

    if (sortOpt === "random") {
      products = await Product.aggregate([
        { $match: filter },
        { $addFields: { _rand: { $rand: {} } } },
        { $sort: { _rand: 1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
    } else {
      products = await Product.find(filter)
        .sort(sortOpt)
        .skip(skip)
        .limit(limit);
    }

    const [total, facets] = await Promise.all([
      Product.countDocuments(filter),
      ProductService.getFacets(query),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
      facets,
    };
  }

  static async getByIdentifier(
    identifier: string,
    includeUnpublished = false,
  ) {
    const isObjectId = Types.ObjectId.isValid(identifier);
    const product = isObjectId
      ? await Product.findById(identifier)
      : await Product.findOne({ slug: identifier.toLowerCase() });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (!includeUnpublished && product.isPublished === false) {
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
