"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
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
            filter.$text = { $search: query.search };
        }
        let sort = { createdAt: -1 };
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
    static async getById(id) {
        const product = await models_1.Product.findById(id);
        if (!product) {
            throw new ApiError_1.ApiError(404, 'Product not found');
        }
        return product;
    }
    static async create(data) {
        return models_1.Product.create(data);
    }
    static async update(id, data) {
        const product = await models_1.Product.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
        if (!product) {
            throw new ApiError_1.ApiError(404, 'Product not found');
        }
        return product;
    }
    static async remove(id) {
        const product = await models_1.Product.findByIdAndDelete(id);
        if (!product) {
            throw new ApiError_1.ApiError(404, 'Product not found');
        }
        return { id };
    }
}
exports.ProductService = ProductService;
