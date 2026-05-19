"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
class DashboardController {
    static getStats = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const stats = await dashboard_service_1.DashboardService.getStats();
        ApiResponse_1.ApiResponse.success(res, stats);
    });
}
exports.DashboardController = DashboardController;
