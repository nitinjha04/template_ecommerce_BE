"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const category_service_1 = require("../services/category.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class CategoryController {
    static list = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const categories = await category_service_1.CategoryService.listActive();
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        ApiResponse_1.ApiResponse.success(res, categories, 'Categories fetched');
    });
    static listAll = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const categories = await category_service_1.CategoryService.listAll();
        ApiResponse_1.ApiResponse.success(res, categories, 'Categories fetched');
    });
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const category = await category_service_1.CategoryService.create(req.body);
        ApiResponse_1.ApiResponse.created(res, category, 'Category created');
    });
    static update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const category = await category_service_1.CategoryService.update((0, params_1.getParamId)(req), req.body);
        ApiResponse_1.ApiResponse.success(res, category, 'Category updated');
    });
    static remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        await category_service_1.CategoryService.remove((0, params_1.getParamId)(req));
        ApiResponse_1.ApiResponse.success(res, null, 'Category deleted');
    });
}
exports.CategoryController = CategoryController;
;
