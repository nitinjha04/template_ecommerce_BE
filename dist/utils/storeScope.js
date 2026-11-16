"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStoreId = exports.withStoreId = exports.mergeStoreFilter = void 0;
const mongoose_1 = require("mongoose");
const store_context_1 = require("../context/store.context");
const resolveStoreId = (explicitStoreId) => {
    if (explicitStoreId && mongoose_1.Types.ObjectId.isValid(explicitStoreId)) {
        return explicitStoreId;
    }
    return (0, store_context_1.getStoreId)();
};
/** Merge store into filter: explicit/query storeId, else request store context, else all stores. */
const mergeStoreFilter = (filter = {}, explicitStoreId) => {
    const storeId = resolveStoreId(explicitStoreId);
    if (!storeId)
        return filter;
    return { ...filter, store: new mongoose_1.Types.ObjectId(storeId) };
};
exports.mergeStoreFilter = mergeStoreFilter;
const withStoreId = (payload, explicitStoreId) => {
    const storeId = resolveStoreId(explicitStoreId);
    if (!storeId) {
        return payload;
    }
    return { ...payload, store: new mongoose_1.Types.ObjectId(storeId) };
};
exports.withStoreId = withStoreId;
const requireStoreId = (explicitStoreId) => {
    const storeId = resolveStoreId(explicitStoreId);
    if (!storeId) {
        throw new Error('storeId is required');
    }
    return new mongoose_1.Types.ObjectId(storeId);
};
exports.requireStoreId = requireStoreId;
