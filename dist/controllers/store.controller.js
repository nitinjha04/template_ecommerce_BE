"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreController = void 0;
const store_service_1 = require("../services/store.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class StoreController {
    static list = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const stores = await store_service_1.StoreService.listAll();
        ApiResponse_1.ApiResponse.success(res, stores);
    });
    static getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const store = await store_service_1.StoreService.getById((0, params_1.getParamId)(req));
        ApiResponse_1.ApiResponse.success(res, store);
    });
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const store = await store_service_1.StoreService.create(req.body);
        ApiResponse_1.ApiResponse.created(res, store, 'Store created');
    });
    static update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const store = await store_service_1.StoreService.update((0, params_1.getParamId)(req), req.body);
        ApiResponse_1.ApiResponse.success(res, store, 'Store updated');
    });
    static remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        await store_service_1.StoreService.remove((0, params_1.getParamId)(req));
        ApiResponse_1.ApiResponse.success(res, null, 'Store deleted');
    });
}
exports.StoreController = StoreController;
