"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seeds the database from products.catalog.json (75 curated products).
 *
 * Usage:
 *   npm run seed:catalog          # insert only if collection empty
 *   npm run seed:catalog:replace  # clear products and re-import catalog
 */
const db_1 = require("../config/db");
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
const products_catalog_json_1 = __importDefault(require("../seed/products.catalog.json"));
const replace = process.argv.includes('--replace');
const main = async () => {
    await (0, db_1.connectDB)();
    const existing = await models_1.Product.countDocuments();
    if (existing > 0 && !replace) {
        console.log(`${existing} products already in DB. Use npm run seed:catalog:replace to replace with catalog.`);
        process.exit(0);
    }
    if (replace && existing > 0) {
        await models_1.Product.deleteMany({});
        console.log(`Removed ${existing} existing products`);
    }
    const usedSlugs = new Set();
    let inserted = 0;
    for (const p of products_catalog_json_1.default) {
        let slug = (0, slug_1.slugify)(p.name);
        if (usedSlugs.has(slug)) {
            slug = await (0, slug_1.uniqueSlug)(`${slug}-${p.category}`, models_1.Product);
        }
        else {
            slug = await (0, slug_1.uniqueSlug)(slug, models_1.Product);
        }
        usedSlugs.add(slug);
        await models_1.Product.create({
            ...p,
            slug,
            metaTitle: p.name.slice(0, 70),
            metaDescription: p.description.slice(0, 160),
            metaKeywords: p.tags,
        });
        inserted += 1;
    }
    const counts = await models_1.Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log(`\nInserted ${inserted} products from products.catalog.json`);
    console.log('By category:');
    for (const row of counts) {
        console.log(`  ${row._id}: ${row.count}`);
    }
    process.exit(0);
};
main().catch((err) => {
    console.error('Catalog seed failed:', err);
    process.exit(1);
});
