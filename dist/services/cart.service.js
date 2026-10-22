"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const serializeProduct_1 = require("../utils/serializeProduct");
const storeScope_1 = require("../utils/storeScope");
const normalizeSize = (value) => {
    const s = typeof value === 'string' ? value.trim() : '';
    return s || 'One Size';
};
const normalizeColor = (value) => {
    const c = typeof value === 'string' ? value.trim() : '';
    return c || 'Default';
};
const cartKey = (productId, size, color) => `${productId}|${normalizeSize(size)}|${normalizeColor(color)}`.toLowerCase();
class CartService {
    static async get(userId) {
        const user = await models_1.User.findById(userId).select('cart');
        if (!user)
            throw new ApiError_1.ApiError(404, 'User not found');
        const lines = (user.cart ?? []).filter((l) => l?.product);
        if (!lines.length)
            return [];
        const productIds = lines.map((l) => l.product);
        const products = await models_1.Product.find((0, storeScope_1.mergeStoreFilter)({
            _id: { $in: productIds },
            isPublished: { $ne: false },
        }));
        const byId = new Map(products.map((p) => [p._id.toString(), p]));
        return lines
            .map((line) => {
            const product = byId.get(line.product.toString());
            if (!product)
                return null;
            return {
                product: (0, serializeProduct_1.serializeProduct)(product),
                quantity: line.quantity,
                size: normalizeSize(line.size),
                color: normalizeColor(line.color),
            };
        })
            .filter((x) => Boolean(x));
    }
    static async upsertLine(input) {
        const { userId, productId } = input;
        if (!mongoose_1.Types.ObjectId.isValid(productId)) {
            throw new ApiError_1.ApiError(400, 'Invalid product id');
        }
        const product = await models_1.Product.findOne((0, storeScope_1.mergeStoreFilter)({ _id: productId }));
        if (!product || product.isPublished === false) {
            throw new ApiError_1.ApiError(404, 'Product not found');
        }
        const user = await models_1.User.findById(userId).select('cart');
        if (!user)
            throw new ApiError_1.ApiError(404, 'User not found');
        const size = normalizeSize(input.size);
        const color = normalizeColor(input.color);
        const nextQty = Math.max(1, Math.floor(Number(input.quantity || 1)));
        const key = cartKey(productId, size, color);
        const idx = (user.cart ?? []).findIndex((l) => {
            const pid = l.product?.toString?.() ?? String(l.product);
            return cartKey(pid, l.size, l.color) === key;
        });
        if (idx >= 0) {
            user.cart[idx].quantity = nextQty;
            user.cart[idx].size = size;
            user.cart[idx].color = color;
        }
        else {
            user.cart = user.cart ?? [];
            user.cart.push({
                product: new mongoose_1.Types.ObjectId(productId),
                quantity: nextQty,
                size,
                color,
            });
        }
        await user.save();
        return this.get(userId);
    }
    static async removeLine(input) {
        const { userId, productId } = input;
        if (!mongoose_1.Types.ObjectId.isValid(productId)) {
            throw new ApiError_1.ApiError(400, 'Invalid product id');
        }
        const user = await models_1.User.findById(userId).select('cart');
        if (!user)
            throw new ApiError_1.ApiError(404, 'User not found');
        const size = normalizeSize(input.size);
        const color = normalizeColor(input.color);
        const key = cartKey(productId, size, color);
        user.cart = (user.cart ?? []).filter((l) => {
            const pid = l.product?.toString?.() ?? String(l.product);
            return cartKey(pid, l.size, l.color) !== key;
        });
        await user.save();
        return this.get(userId);
    }
    static async clear(userId) {
        await models_1.User.findByIdAndUpdate(userId, { $set: { cart: [] } });
        return [];
    }
    /** Merge guest/local cart lines into the user's persisted cart (adds quantities for matching lines). */
    static async mergeLines(userId, incoming) {
        if (!incoming.length)
            return this.get(userId);
        const user = await models_1.User.findById(userId).select('cart');
        if (!user)
            throw new ApiError_1.ApiError(404, 'User not found');
        user.cart = user.cart ?? [];
        for (const line of incoming) {
            const { productId } = line;
            if (!mongoose_1.Types.ObjectId.isValid(productId))
                continue;
            const product = await models_1.Product.findOne((0, storeScope_1.mergeStoreFilter)({ _id: productId }));
            if (!product || product.isPublished === false)
                continue;
            const size = normalizeSize(line.size);
            const color = normalizeColor(line.color);
            const addQty = Math.max(1, Math.floor(Number(line.quantity || 1)));
            const key = cartKey(productId, size, color);
            const idx = user.cart.findIndex((l) => {
                const pid = l.product?.toString?.() ?? String(l.product);
                return cartKey(pid, l.size, l.color) === key;
            });
            if (idx >= 0) {
                user.cart[idx].quantity += addQty;
                user.cart[idx].size = size;
                user.cart[idx].color = color;
            }
            else {
                user.cart.push({
                    product: new mongoose_1.Types.ObjectId(productId),
                    quantity: addQty,
                    size,
                    color,
                });
            }
        }
        await user.save();
        return this.get(userId);
    }
}
exports.CartService = CartService;
