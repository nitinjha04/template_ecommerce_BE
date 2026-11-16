"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const slug_1 = require("../utils/slug");
const category_service_1 = require("./category.service");
const pagination_1 = require("../utils/pagination");
const productImages_1 = require("../utils/productImages");
const serializeProduct_1 = require("../utils/serializeProduct");
const store_context_1 = require("../context/store.context");
const storeScope_1 = require("../utils/storeScope");
const ensureUniqueSlug = async (base, excludeId) => {
    const root = (0, slug_1.slugify)(base) || "product";
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const filter = (0, storeScope_1.mergeStoreFilter)({ slug: candidate });
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await models_1.Product.findOne(filter).select("_id");
        if (!exists)
            return candidate;
        attempt += 1;
    }
    return `${root}-${Date.now()}`;
};
const buildProductFilter = (query, omit = []) => {
    const filter = (0, storeScope_1.mergeStoreFilter)({}, query.storeId);
    if (!query.includeUnpublished) {
        filter.isPublished = { $ne: false };
    }
    if (query.category)
        filter.category = query.category;
    if (query.featured !== undefined)
        filter.featured = query.featured;
    if (query.inStock !== undefined)
        filter.inStock = query.inStock;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        filter.price = {};
        if (query.minPrice !== undefined) {
            filter.price.$gte = query.minPrice;
        }
        if (query.maxPrice !== undefined) {
            filter.price.$lte = query.maxPrice;
        }
    }
    if (query.sizes?.length && !omit.includes("sizes")) {
        filter.sizes = { $in: query.sizes };
    }
    if (query.subcategories?.length && !omit.includes("subcategories")) {
        filter.breadcrumbCategory = { $in: query.subcategories };
    }
    if (query.search?.trim()) {
        return (0, pagination_1.applySearchOr)(filter, query.search, [
            "name",
            "slug",
            "breadcrumbCategory",
            "description",
            "tags",
        ]);
    }
    return filter;
};
const getSortOption = (sort) => {
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
const prepareProductData = async (data, excludeId) => {
    const next = { ...data };
    if (next.name && (!next.slug || !String(next.slug).trim())) {
        next.slug = await ensureUniqueSlug(next.name, excludeId);
    }
    else if (next.slug) {
        next.slug = (0, slug_1.slugify)(String(next.slug));
        const existing = await models_1.Product.findOne((0, storeScope_1.mergeStoreFilter)({
            slug: next.slug,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        }));
        if (existing) {
            next.slug = await ensureUniqueSlug(next.slug, excludeId);
        }
    }
    if (next.name && !next.metaTitle) {
        next.metaTitle = next.name;
    }
    if (next.images !== undefined) {
        next.images = (0, productImages_1.normalizeProductImages)(next.images);
    }
    if (next.category !== undefined) {
        next.category = await category_service_1.CategoryService.resolveProductCategory(String(next.category));
    }
    return next;
};
class ProductService {
    static async getFacets(query) {
        const baseForSizes = buildProductFilter(query, ["sizes"]);
        const baseForCategories = buildProductFilter(query, ["subcategories"]);
        const baseForPrice = buildProductFilter(query);
        const [sizeAgg, categoryAgg, priceAgg] = await Promise.all([
            models_1.Product.aggregate([
                { $match: baseForSizes },
                { $unwind: "$sizes" },
                { $match: { sizes: { $ne: "" } } },
                { $group: { _id: "$sizes", count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            models_1.Product.aggregate([
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
            models_1.Product.aggregate([
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
        const priceRow = priceAgg[0];
        return {
            sizes: sizeAgg.map((row) => ({
                size: String(row._id),
                count: row.count,
            })),
            categories: categoryAgg.map((row) => ({
                name: String(row._id),
                count: row.count,
            })),
            priceRange: {
                min: Math.floor(priceRow?.min ?? 0),
                max: Math.ceil(priceRow?.max ?? 5000),
            },
        };
    }
    static async getAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 12;
        const skip = (page - 1) * limit;
        const filter = buildProductFilter(query);
        const sortOpt = getSortOption(query.sort);
        let products;
        if (sortOpt === "random") {
            products = await models_1.Product.aggregate([
                { $match: filter },
                { $addFields: { _rand: { $rand: {} } } },
                { $sort: { _rand: 1 } },
                { $skip: skip },
                { $limit: limit },
            ]);
        }
        else {
            products = await models_1.Product.find(filter)
                .sort(sortOpt)
                .skip(skip)
                .limit(limit);
        }
        const [total, facets] = await Promise.all([
            models_1.Product.countDocuments(filter),
            ProductService.getFacets(query),
        ]);
        return {
            products: (0, serializeProduct_1.serializeProducts)(products),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 0,
            },
            facets,
        };
    }
    static async getByIdentifier(identifier, includeUnpublished = false, storeId) {
        const isObjectId = mongoose_1.Types.ObjectId.isValid(identifier);
        const baseFilter = isObjectId
            ? { _id: identifier }
            : { slug: identifier.toLowerCase() };
        const product = await models_1.Product.findOne(includeUnpublished && !storeId
            ? baseFilter
            : (0, storeScope_1.mergeStoreFilter)(baseFilter, storeId));
        if (!product) {
            throw new ApiError_1.ApiError(404, "Product not found");
        }
        if (!includeUnpublished && product.isPublished === false) {
            throw new ApiError_1.ApiError(404, "Product not found");
        }
        return product;
    }
    static async create(data) {
        const prepared = await prepareProductData(data);
        if (!prepared.slug) {
            throw new ApiError_1.ApiError(400, "Slug is required");
        }
        const storeId = data.storeId ?? (0, store_context_1.getStoreId)();
        if (!storeId) {
            throw new ApiError_1.ApiError(400, "storeId is required when creating a product");
        }
        return models_1.Product.create((0, storeScope_1.withStoreId)(prepared, storeId));
    }
    static async update(id, data, storeId) {
        const prepared = await prepareProductData(data, id);
        const filter = storeId !== undefined
            ? (0, storeScope_1.mergeStoreFilter)({ _id: id }, storeId)
            : { _id: id };
        const product = await models_1.Product.findOneAndUpdate(filter, prepared, {
            new: true,
            runValidators: true,
        });
        if (!product) {
            throw new ApiError_1.ApiError(404, "Product not found");
        }
        return product;
    }
    static async remove(id, storeId) {
        const filter = storeId !== undefined
            ? (0, storeScope_1.mergeStoreFilter)({ _id: id }, storeId)
            : { _id: id };
        const product = await models_1.Product.findOneAndDelete(filter);
        if (!product) {
            throw new ApiError_1.ApiError(404, "Product not found");
        }
        return { id };
    }
}
exports.ProductService = ProductService;
