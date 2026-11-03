"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickStoreIdFromQuery = void 0;
const mongoose_1 = require("mongoose");
/** Parse optional `storeId` from admin list/dashboard query (omit = all stores). */
const pickStoreIdFromQuery = (value) => {
    if (typeof value !== 'string' || !value.trim())
        return undefined;
    const id = value.trim();
    if (!mongoose_1.Types.ObjectId.isValid(id))
        return undefined;
    return id;
};
exports.pickStoreIdFromQuery = pickStoreIdFromQuery;
