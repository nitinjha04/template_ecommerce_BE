"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importManifest = void 0;
const db_1 = require("../../config/db");
const store_context_1 = require("../../context/store.context");
const models_1 = require("../../models");
const category_service_1 = require("../../services/category.service");
const slug_1 = require("../../utils/slug");
const storeScope_1 = require("../../utils/storeScope");
const constants_1 = require("./constants");
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
const importManifest = async (manifest, options = {}) => {
    const { products, categoryName, filterValue, storeId } = manifest;
    const dryRun = options.dryRun === true;
    console.log(`\nImporting ${products.length} products (${categoryName}, ${filterValue}) → ${constants_1.PROTICO_STORE_DOMAIN}…`);
    if (dryRun)
        console.log('DRY RUN — no database writes\n');
    const runImport = async () => {
        if (!dryRun && !options.skipConnect) {
            await (0, db_1.connectDB)();
        }
        let resolvedCategory = categoryName.trim();
        if (!dryRun) {
            resolvedCategory = await category_service_1.CategoryService.resolveProductCategory(categoryName.trim());
            console.log(`Category "${resolvedCategory}" is ready.`);
        }
        let inserted = 0;
        let skipped = 0;
        for (const product of products) {
            const baseSlug = product.slug.trim().toLowerCase();
            if (!baseSlug) {
                skipped += 1;
                continue;
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
                console.log(`  [+] ${doc.name.slice(0, 50)}… → ₹${doc.price} (${slug})`);
            }
            catch (err) {
                skipped += 1;
                const msg = err instanceof Error ? err.message : String(err);
                console.warn(`  [skip] ${product.name.slice(0, 40)}… — ${msg}`);
            }
        }
        let totalInDb;
        if (!dryRun) {
            totalInDb = await models_1.Product.countDocuments({ store: storeId });
            console.log(`\nInserted ${inserted}, skipped ${skipped}. Store products: ${totalInDb}`);
        }
        else {
            console.log(`\nWould insert ${inserted} products`);
        }
        return { inserted, skipped, totalInDb };
    };
    return (0, store_context_1.runWithStoreContext)({
        storeId,
        storeSlug: constants_1.PROTICO_STORE_SLUG,
        storeDomain: constants_1.PROTICO_STORE_DOMAIN,
        storeName: constants_1.PROTICO_STORE_NAME,
    }, runImport);
};
exports.importManifest = importManifest;
