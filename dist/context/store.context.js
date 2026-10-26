"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreObjectId = exports.requireStoreId = exports.getStoreId = exports.getStoreContext = exports.runWithStoreContext = void 0;
const async_hooks_1 = require("async_hooks");
const mongoose_1 = require("mongoose");
const ApiError_1 = require("../utils/ApiError");
const storage = new async_hooks_1.AsyncLocalStorage();
const runWithStoreContext = (value, fn) => storage.run(value, fn);
exports.runWithStoreContext = runWithStoreContext;
const getStoreContext = () => storage.getStore();
exports.getStoreContext = getStoreContext;
const getStoreId = () => (0, exports.getStoreContext)()?.storeId;
exports.getStoreId = getStoreId;
const requireStoreId = () => {
    const id = (0, exports.getStoreId)();
    if (!id) {
        throw new ApiError_1.ApiError(400, 'Could not resolve store for this request');
    }
    return id;
};
exports.requireStoreId = requireStoreId;
const getStoreObjectId = () => new mongoose_1.Types.ObjectId((0, exports.requireStoreId)());
exports.getStoreObjectId = getStoreObjectId;
