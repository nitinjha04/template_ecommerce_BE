"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("../services/product.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class ProductController {
    static getAll = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { page, limit, category, featured, inStock, search, sort } = req.query;
        const result = await product_service_1.ProductService.getAll({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            category: category,
            featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
            inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
            search: search,
            sort: sort,
        });
        ApiResponse_1.ApiResponse.success(res, result.products, 'Products fetched', 200, result.pagination);
    });
    static getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const product = await product_service_1.ProductService.getByIdentifier((0, params_1.getParamId)(req));
        ApiResponse_1.ApiResponse.success(res, product);
    });
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const product = await product_service_1.ProductService.create(req.body);
        ApiResponse_1.ApiResponse.created(res, product, 'Product created');
    });
    static update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const product = await product_service_1.ProductService.update((0, params_1.getParamId)(req), req.body);
        ApiResponse_1.ApiResponse.success(res, product, 'Product updated');
    });
    static remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        await product_service_1.ProductService.remove((0, params_1.getParamId)(req));
        ApiResponse_1.ApiResponse.success(res, null, 'Product deleted');
    });
}
exports.ProductController = ProductController;
