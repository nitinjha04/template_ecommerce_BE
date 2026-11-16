"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importManifest = void 0;
const db_1 = require("../../config/db");
const models_1 = require("../../models");
const category_service_1 = require("../../services/category.service");
const slug_1 = require("../../utils/slug");
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
/** Insert manifest products into MongoDB (add only — never deletes). */
const importManifest = async (manifest, options = {}) => {
    const { products, categoryName, categoryFilter } = manifest;
    const dryRun = options.dryRun === true;
    console.log(`\nImporting ${products.length} products (${categoryName}, filter ${categoryFilter})…`);
    if (dryRun)
        console.log('DRY RUN — no database writes\n');
    if (!dryRun && !options.skipConnect) {
        await (0, db_1.connectDB)();
    }
    const cleanCategoryName = (0, sanitize_brand_1.replaceNykaaWithCasaq)(categoryName.trim());
    let resolvedCategory = cleanCategoryName;
    if (!dryRun) {
        resolvedCategory = await category_service_1.CategoryService.resolveProductCategory(cleanCategoryName);
        console.log(`Category "${resolvedCategory}" is ready (created if it was missing).`);
    }
    else {
        console.log(`  [dry] would ensure category exists: "${cleanCategoryName}"`);
    }
    let inserted = 0;
    let skipped = 0;
    for (const product of products) {
        const baseSlug = product.slug.trim().toLowerCase();
        if (!baseSlug) {
            skipped += 1;
            console.warn('  [skip] missing slug');
            continue;
        }
        if (dryRun) {
            const cleaned = (0, sanitize_brand_1.sanitizeScrapedProduct)({ ...product, category: resolvedCategory });
            console.log(`  [dry] ${cleaned.name.slice(0, 55)}… → ₹${cleaned.price} (${cleaned.slug})`);
            inserted += 1;
            continue;
        }
        const cleaned = (0, sanitize_brand_1.sanitizeScrapedProduct)({ ...product, category: resolvedCategory });
        const slug = await (0, slug_1.uniqueSlug)(cleaned.slug.trim().toLowerCase(), models_1.Product);
        const doc = toDbDoc(cleaned, slug);
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
        totalInDb = await models_1.Product.countDocuments();
        console.log(`\nInserted ${inserted}, skipped ${skipped}. Total products in DB: ${totalInDb}`);
    }
    else {
        console.log(`\nWould insert ${inserted} products`);
    }
    return { inserted, skipped, totalInDb };
};
exports.importManifest = importManifest;
