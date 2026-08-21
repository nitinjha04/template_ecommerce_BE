"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistController = void 0;
const wishlist_service_1 = require("../services/wishlist.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
class WishlistController {
    static list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const items = await wishlist_service_1.WishlistService.list(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, items, 'Wishlist fetched');
    });
    static toggle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await wishlist_service_1.WishlistService.toggle(req.user.userId, req.body.productId);
        ApiResponse_1.ApiResponse.success(res, result, result.added ? 'Added to wishlist' : 'Removed from wishlist');
    });
    static clear = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await wishlist_service_1.WishlistService.clear(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, result, 'Wishlist cleared');
    });
}
exports.WishlistController = WishlistController;
