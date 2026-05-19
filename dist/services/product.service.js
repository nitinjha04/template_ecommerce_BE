"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const slug_1 = require("../utils/slug");
const ensureUniqueSlug = async (base, excludeId) => {
    const root = (0, slug_1.slugify)(base) || "product";
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const filter = { slug: candidate };
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await models_1.Product.findOne(filter).select("_id");
        if (!exists)
            return candidate;
        attempt += 1;
    }
    return `${root}-${Date.now()}`;
};
const prepareProductData = async (data, excludeId) => {
    const next = { ...data };
    if (next.name && (!next.slug || !String(next.slug).trim())) {
        next.slug = await ensureUniqueSlug(next.name, excludeId);
    }
    else if (next.slug) {
        next.slug = (0, slug_1.slugify)(String(next.slug));
        const existing = await models_1.Product.findOne({
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
class ProductService {
    static async getAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 12;
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.category)
            filter.category = query.category;
        if (query.featured !== undefined)
            filter.featured = query.featured;
        if (query.inStock !== undefined)
            filter.inStock = query.inStock;
        if (query.search) {
            const term = query.search.trim();
            filter.$or = [
                { $text: { $search: term } },
                { name: { $regex: term, $options: "i" } },
                { slug: { $regex: term, $options: "i" } },
            ];
        }
        let sort = { createdAt: -1 };
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
            models_1.Product.find(filter).sort(sort).skip(skip).limit(limit),
            models_1.Product.countDocuments(filter),
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
    static async getByIdentifier(identifier) {
        const isObjectId = mongoose_1.Types.ObjectId.isValid(identifier);
        const product = isObjectId
            ? await models_1.Product.findById(identifier)
            : await models_1.Product.findOne({ slug: identifier.toLowerCase() });
        if (!product) {
            throw new ApiError_1.ApiError(404, "Product not found");
        }
        return product;
    }
    static async create(data) {
        const prepared = await prepareProductData(data);
        if (!prepared.slug) {
            throw new ApiError_1.ApiError(400, "Slug is required");
        }
        return models_1.Product.create(prepared);
    }
    static async update(id, data) {
        const prepared = await prepareProductData(data, id);
        const product = await models_1.Product.findByIdAndUpdate(id, prepared, {
            new: true,
            runValidators: true,
        });
        if (!product) {
            throw new ApiError_1.ApiError(404, "Product not found");
        }
        return product;
    }
    static async remove(id) {
        const product = await models_1.Product.findByIdAndDelete(id);
        if (!product) {
            throw new ApiError_1.ApiError(404, "Product not found");
        }
        return { id };
    }
}
exports.ProductService = ProductService;
