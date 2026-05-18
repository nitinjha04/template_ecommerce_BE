"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("../services/order.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class OrderController {
    static create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { email, phone, shippingAddress, paymentMethod, items, orderNote } = req.body;
        const customerName = `${shippingAddress.firstName} ${shippingAddress.lastName}`;
        const result = await order_service_1.OrderService.create({
            userId: req.user.userId,
            customerName,
            email,
            phone,
            items,
            shippingAddress,
            paymentMethod,
            orderNote,
        });
        ApiResponse_1.ApiResponse.created(res, result, 'Order placed successfully');
    });
    static getMyOrders = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const orders = await order_service_1.OrderService.getMyOrders(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, orders);
    });
    static getAll = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const orders = await order_service_1.OrderService.getAllOrders();
        ApiResponse_1.ApiResponse.success(res, orders);
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
}
exports.OrderController = OrderController;
