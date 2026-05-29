"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const cart_service_1 = require("../services/cart.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
class CartController {
    static get = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const items = await cart_service_1.CartService.get(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, items, 'Cart fetched');
    });
    static upsertLine = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const items = await cart_service_1.CartService.upsertLine({
            userId: req.user.userId,
            productId: req.body.productId,
            quantity: Number(req.body.quantity),
            size: req.body.size,
            color: req.body.color,
        });
        ApiResponse_1.ApiResponse.success(res, items, 'Cart updated');
    });
    static removeLine = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const items = await cart_service_1.CartService.removeLine({
            userId: req.user.userId,
            productId: req.body.productId,
            size: req.body.size,
            color: req.body.color,
        });
        ApiResponse_1.ApiResponse.success(res, items, 'Item removed');
    });
    static clear = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const items = await cart_service_1.CartService.clear(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, items, 'Cart cleared');
    });
    static merge = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const raw = req.body.items;
        const items = Array.isArray(raw) ? raw : [];
        const merged = await cart_service_1.CartService.mergeLines(req.user.userId, items.map((line) => ({
            productId: String(line.productId ?? ''),
            quantity: Number(line.quantity ?? 1),
            size: typeof line.size === 'string' ? line.size : undefined,
            color: typeof line.color === 'string' ? line.color : undefined,
        })));
        ApiResponse_1.ApiResponse.success(res, merged, 'Cart merged');
    });
}
exports.CartController = CartController;
