"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("../services/product.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
const optionalAdmin_1 = require("../utils/optionalAdmin");
const adminStoreQuery_1 = require("../utils/adminStoreQuery");
const parseCsvQuery = (value) => {
    if (typeof value !== 'string' || !value.trim())
        return undefined;
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : undefined;
};
class ProductController {
    static getAll = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { page, limit, featured, inStock, search, sort, category, minPrice, maxPrice, sizes, subcategory, } = req.query;
        const includeUnpublished = (0, optionalAdmin_1.shouldIncludeUnpublished)(req);
        const storeId = includeUnpublished
            ? (0, adminStoreQuery_1.pickStoreIdFromQuery)(req.query.storeId)
            : undefined;
        const result = await product_service_1.ProductService.getAll({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            includeUnpublished,
            storeId,
            featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
            inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
            search: search,
            sort: sort,
            category: category,
            minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
            maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
            sizes: parseCsvQuery(sizes),
            subcategories: parseCsvQuery(subcategory),
        });
        ApiResponse_1.ApiResponse.success(res, result.products, 'Products fetched', 200, {
            ...result.pagination,
            facets: result.facets,
        });
    });
    static getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const includeUnpublished = (0, optionalAdmin_1.shouldIncludeUnpublished)(req);
        const storeId = includeUnpublished
            ? (0, adminStoreQuery_1.pickStoreIdFromQuery)(req.query.storeId)
            : undefined;
        const product = await product_service_1.ProductService.getByIdentifier((0, params_1.getParamId)(req), includeUnpublished, storeId);
        ApiResponse_1.ApiResponse.success(res, product);
    });
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const product = await product_service_1.ProductService.create(req.body);
        ApiResponse_1.ApiResponse.created(res, product, 'Product created');
    });
    static update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const includeUnpublished = (0, optionalAdmin_1.shouldIncludeUnpublished)(req);
        const storeId = includeUnpublished
            ? (0, adminStoreQuery_1.pickStoreIdFromQuery)(req.query.storeId)
            : undefined;
        const product = await product_service_1.ProductService.update((0, params_1.getParamId)(req), req.body, storeId);
        ApiResponse_1.ApiResponse.success(res, product, 'Product updated');
    });
    static remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const includeUnpublished = (0, optionalAdmin_1.shouldIncludeUnpublished)(req);
        const storeId = includeUnpublished
            ? (0, adminStoreQuery_1.pickStoreIdFromQuery)(req.query.storeId)
            : undefined;
        await product_service_1.ProductService.remove((0, params_1.getParamId)(req), storeId);
        ApiResponse_1.ApiResponse.success(res, null, 'Product deleted');
    });
}
exports.ProductController = ProductController;
