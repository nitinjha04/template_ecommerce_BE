"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importProducts = void 0;
const db_1 = require("../../config/db");
const store_context_1 = require("../../context/store.context");
const models_1 = require("../../models");
const category_service_1 = require("../../services/category.service");
const slug_1 = require("../../utils/slug");
const storeScope_1 = require("../../utils/storeScope");
const sanitize_brand_1 = require("./sanitize-brand");
const toDbDoc = (p, slug) => {
    const { _source: _omit, deliveryStartDate, deliveryEndDate, ...rest } = p;
    return {
        ...rest,
        slug,
        deliveryStartDate: new Date(deliveryStartDate),
        deliveryEndDate: new Date(deliveryEndDate),
    };
};
const uniqueSlugForStore = async (base, storeId) => {
    const root = (0, slug_1.slugify)(base) || 'product';
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const exists = await models_1.Product.findOne((0, storeScope_1.mergeStoreFilter)({ slug: candidate }, storeId))
            .select('_id')
            .lean();
        if (!exists)
            return candidate;
        attempt += 1;
    }
    return `${root}-${Date.now()}`;
};
const importProducts = async (products, options) => {
    const dryRun = options.dryRun === true;
    const storeId = options.storeId;
    const run = async () => {
        if (!dryRun && !options.skipConnect) {
            await (0, db_1.connectDB)();
        }
        const categoryCache = new Map();
        let inserted = 0;
        let skipped = 0;
        for (const product of products) {
            const baseSlug = product.slug.trim().toLowerCase();
            if (!baseSlug) {
                skipped += 1;
                continue;
            }
            let resolvedCategory = categoryCache.get(product.category);
            if (!resolvedCategory) {
                if (dryRun) {
                    resolvedCategory = product.category;
                }
                else {
                    resolvedCategory = await category_service_1.CategoryService.resolveProductCategory(product.category);
                }
                categoryCache.set(product.category, resolvedCategory);
            }
            if (dryRun) {
                inserted += 1;
                continue;
            }
            const cleaned = (0, sanitize_brand_1.sanitizeScrapedProduct)({ ...product, category: resolvedCategory });
            const slug = await uniqueSlugForStore(cleaned.slug, storeId);
            const doc = (0, storeScope_1.withStoreId)(toDbDoc(cleaned, slug), storeId);
            try {
                await models_1.Product.create(doc);
                inserted += 1;
            }
            catch {
                skipped += 1;
            }
        }
        return { inserted, skipped };
    };
    return (0, store_context_1.runWithStoreContext)({
        storeId,
        storeSlug: 'argenstyle',
        storeDomain: 'argenstyle.vercel.app',
        storeName: 'Argen Style',
    }, run);
};
exports.importProducts = importProducts;
