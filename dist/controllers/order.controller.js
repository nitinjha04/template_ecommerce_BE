"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("../services/order.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const orderPayload_1 = require("../utils/orderPayload");
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../views/ApiResponse");
class OrderController {
    static createGuest = (0, asyncHandler_1.asyncHandler)(async (_req, _res) => {
        throw new ApiError_1.ApiError(403, 'Please sign in or create an account to place an order');
    });
    static track = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const orders = await order_service_1.OrderService.track(req.body.query);
        ApiResponse_1.ApiResponse.success(res, orders);
    });
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const normalized = (0, orderPayload_1.normalizeGuestOrderBody)(req.body);
        const result = await order_service_1.OrderService.create({
            userId: req.user.userId,
            ...normalized,
        });
        ApiResponse_1.ApiResponse.created(res, result, 'Order placed successfully');
    });
    static getMyOrders = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const orders = await order_service_1.OrderService.getMyOrders(req.user.userId, req.user.email);
        ApiResponse_1.ApiResponse.success(res, orders);
    });
    static getAll = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { page, limit, search, status } = req.query;
        const result = await order_service_1.OrderService.getAllAdmin({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search: search,
            status: status,
        });
        ApiResponse_1.ApiResponse.success(res, result.items, 'Orders fetched', 200, result.pagination);
    });
    static getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const isAdmin = req.user.role === 'admin';
        const order = await order_service_1.OrderService.getById((0, params_1.getParamId)(req), req.user.userId, isAdmin);
        ApiResponse_1.ApiResponse.success(res, order);
    });
    static updateStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const order = await order_service_1.OrderService.updateStatus((0, params_1.getParamId)(req), req.body.status);
        ApiResponse_1.ApiResponse.success(res, order, 'Order status updated');
    });
    static exportCsv = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const csv = await order_service_1.OrderService.exportCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
        res.send(csv);
    });
}
exports.OrderController = OrderController;
