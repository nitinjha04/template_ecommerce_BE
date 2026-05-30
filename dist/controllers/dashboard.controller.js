"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
const adminStoreQuery_1 = require("../utils/adminStoreQuery");
class DashboardController {
    static getStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const storeId = (0, adminStoreQuery_1.pickStoreIdFromQuery)(req.query.storeId);
        const stats = await dashboard_service_1.DashboardService.getStats(storeId);
        ApiResponse_1.ApiResponse.success(res, stats);
    });
}
exports.DashboardController = DashboardController;
