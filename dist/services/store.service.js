"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreService = void 0;
const Store_model_1 = require("../models/Store.model");
const ApiError_1 = require("../utils/ApiError");
const env_1 = require("../config/env");
const storeDomain_1 = require("../utils/storeDomain");
const slug_1 = require("../utils/slug");
const toDto = (doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    domain: doc.domain,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});
const ensureUniqueSlug = async (base, excludeId) => {
    const root = (0, slug_1.slugify)(base) || 'store';
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const filter = { slug: candidate };
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await Store_model_1.Store.findOne(filter).select('_id').lean();
        if (!exists)
            return candidate;
        attempt += 1;
    }
    return `${root}-${Date.now()}`;
};
const LOCALHOST_PATTERN = /^(localhost|127\.0\.0\.1)$/;
class StoreService {
    static async resolveByDomain(domainInput) {
        let domain = domainInput ? (0, storeDomain_1.normalizeStoreDomain)(domainInput) : '';
        if (!domain || LOCALHOST_PATTERN.test(domain)) {
            domain = (0, storeDomain_1.normalizeStoreDomain)(env_1.env.defaultStoreDomain);
        }
        const store = await Store_model_1.Store.findOne({ domain, isActive: { $ne: false } }).exec();
        return store ? toDto(store) : null;
    }
    static async getDefaultStore() {
        const store = await this.resolveByDomain(env_1.env.defaultStoreDomain);
        if (!store) {
            throw new ApiError_1.ApiError(503, `Default store not configured for domain "${env_1.env.defaultStoreDomain}". Run npm run migrate:assign-store.`);
        }
        return store;
    }
    static async listAll() {
        const stores = await Store_model_1.Store.find().sort({ name: 1 }).exec();
        return stores.map(toDto);
    }
    static async getById(id) {
        const store = await Store_model_1.Store.findById(id).exec();
        if (!store)
            throw new ApiError_1.ApiError(404, 'Store not found');
        return toDto(store);
    }
    static async create(data) {
        const name = data.name.trim();
        const domain = (0, storeDomain_1.normalizeStoreDomain)(data.domain);
        if (!name)
            throw new ApiError_1.ApiError(400, 'Store name is required');
        if (!domain)
            throw new ApiError_1.ApiError(400, 'Store domain is required');
        const slug = data.slug?.trim()
            ? (0, slug_1.slugify)(data.slug)
            : await ensureUniqueSlug(name);
        const existingDomain = await Store_model_1.Store.findOne({ domain }).select('_id').lean();
        if (existingDomain)
            throw new ApiError_1.ApiError(409, 'Domain is already used by another store');
        const existingSlug = await Store_model_1.Store.findOne({ slug }).select('_id').lean();
        if (existingSlug)
            throw new ApiError_1.ApiError(409, 'Slug is already in use');
        const store = await Store_model_1.Store.create({
            name,
            domain,
            slug,
            isActive: data.isActive ?? true,
        });
        return toDto(store);
    }
    static async update(id, data) {
        const store = await Store_model_1.Store.findById(id);
        if (!store)
            throw new ApiError_1.ApiError(404, 'Store not found');
        if (data.name !== undefined) {
            const name = data.name.trim();
            if (!name)
                throw new ApiError_1.ApiError(400, 'Store name is required');
            store.name = name;
        }
        if (data.domain !== undefined) {
            const domain = (0, storeDomain_1.normalizeStoreDomain)(data.domain);
            if (!domain)
                throw new ApiError_1.ApiError(400, 'Store domain is required');
            const duplicate = await Store_model_1.Store.findOne({ domain, _id: { $ne: id } })
                .select('_id')
                .lean();
            if (duplicate)
                throw new ApiError_1.ApiError(409, 'Domain is already used');
            store.domain = domain;
        }
        if (data.slug !== undefined) {
            const slug = (0, slug_1.slugify)(data.slug.trim());
            if (!slug)
                throw new ApiError_1.ApiError(400, 'Store slug is required');
            const duplicate = await Store_model_1.Store.findOne({ slug, _id: { $ne: id } })
                .select('_id')
                .lean();
            if (duplicate)
                throw new ApiError_1.ApiError(409, 'Slug is already in use');
            store.slug = slug;
        }
        if (data.isActive !== undefined)
            store.isActive = data.isActive;
        await store.save();
        return toDto(store);
    }
    static async remove(id) {
        const store = await Store_model_1.Store.findById(id);
        if (!store)
            throw new ApiError_1.ApiError(404, 'Store not found');
        await Store_model_1.Store.findByIdAndDelete(id);
    }
}
exports.StoreService = StoreService;
