"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistService = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const serializeProduct_1 = require("../utils/serializeProduct");
class WishlistService {
    static async list(userId) {
        const user = await models_1.User.findById(userId).select('wishlist');
        if (!user) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        if (!user.wishlist.length) {
            return [];
        }
        const products = await models_1.Product.find({
            _id: { $in: user.wishlist },
            isPublished: { $ne: false },
        });
        const order = new Map(user.wishlist.map((id, index) => [id.toString(), index]));
        products.sort((a, b) => (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0));
        return (0, serializeProduct_1.serializeProducts)(products);
    }
    static async toggle(userId, productId) {
        if (!mongoose_1.Types.ObjectId.isValid(productId)) {
            throw new ApiError_1.ApiError(400, 'Invalid product id');
        }
        const product = await models_1.Product.findById(productId);
        if (!product || product.isPublished === false) {
            throw new ApiError_1.ApiError(404, 'Product not found');
        }
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        const objectId = new mongoose_1.Types.ObjectId(productId);
        const index = user.wishlist.findIndex((id) => id.equals(objectId));
        let added = false;
        if (index >= 0) {
            user.wishlist.splice(index, 1);
        }
        else {
            user.wishlist.unshift(objectId);
            added = true;
        }
        await user.save();
        const items = await this.list(userId);
        return { added, items };
    }
    static async clear(userId) {
        await models_1.User.findByIdAndUpdate(userId, { $set: { wishlist: [] } });
        return { items: [] };
    }
}
exports.WishlistService = WishlistService;
