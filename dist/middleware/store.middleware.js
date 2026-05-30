"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStore = void 0;
const store_context_1 = require("../context/store.context");
const store_service_1 = require("../services/store.service");
const storeDomain_1 = require("../utils/storeDomain");
const ApiError_1 = require("../utils/ApiError");
const asyncHandler_1 = require("../utils/asyncHandler");
const SKIP_PREFIXES = ['/health', '/stores', '/gateway-payments/webhook'];
exports.resolveStore = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const path = req.path;
    if (SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
        return next();
    }
    const adminScope = req.headers['x-admin-scope'];
    if (adminScope === 'all') {
        return next();
    }
    const domain = (0, storeDomain_1.extractDomainFromRequest)({
        headerDomain: typeof req.headers['x-store-domain'] === 'string'
            ? req.headers['x-store-domain']
            : undefined,
        origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
        referer: typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
        host: typeof req.headers.host === 'string' ? req.headers.host : undefined,
    });
    const store = await store_service_1.StoreService.resolveByDomain(domain);
    if (!store) {
        throw new ApiError_1.ApiError(404, 'Store not found for this domain');
    }
    req.store = {
        id: store.id,
        slug: store.slug,
        domain: store.domain,
        name: store.name,
    };
    (0, store_context_1.runWithStoreContext)({
        storeId: store.id,
        storeSlug: store.slug,
        storeDomain: store.domain,
        storeName: store.name,
    }, () => next());
});
