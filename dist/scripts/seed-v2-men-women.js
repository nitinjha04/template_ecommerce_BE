"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Replaces Men and/or Women products from v2 JSON exports.
 * Maps Product fields including random PDP details (fabric, neckline, stock, delivery, etc.).
 * Accessories are never changed.
 *
 * Relative image paths are prefixed with https://uat.tangerineluxury.com by default.
 * Override with SEED_MEDIA_BASE_URL in .env if needed.
 *
 * Usage:
 *   npm run seed:v2-men-women   # both
 *   npm run seed:v2-men         # men only
 *   npm run seed:v2-women       # women only
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../config/db");
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
const map_v2_product_1 = require("../seed/v2/map-v2-product");
const V2_DIR = path.join(__dirname, '../seed/v2');
const MEN_FILE = path.join(V2_DIR, 'men.json');
const WOMEN_FILE = path.join(V2_DIR, 'women.json');
const loadV2File = (filePath) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file: ${filePath}`);
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(parsed)) {
        throw new Error(`${filePath} must be a JSON array`);
    }
    return parsed;
};
const sortByPosition = (items) => [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
const importCategory = async (items, category, mediaBase) => {
    const sorted = sortByPosition(items);
    const usedSlugs = new Set();
    let inserted = 0;
    let skipped = 0;
    for (let i = 0; i < sorted.length; i++) {
        const raw = sorted[i];
        let baseSlug = (raw.slug ?? '').trim().toLowerCase() ||
            (0, slug_1.slugify)(raw.name ?? '') ||
            `product-${category.toLowerCase()}-${i + 1}`;
        if (usedSlugs.has(baseSlug)) {
            baseSlug = `${baseSlug}-${i + 1}`;
        }
        const slug = await (0, slug_1.uniqueSlug)(baseSlug, models_1.Product);
        usedSlugs.add(slug);
        const doc = (0, map_v2_product_1.mapV2ToProduct)(raw, category, i, slug, mediaBase);
        if (!doc) {
            skipped += 1;
            console.warn(`  [skip] ${raw.name?.slice(0, 50) ?? '(no name)'} — missing name, price, or images`);
            continue;
        }
        await models_1.Product.create(doc);
        inserted += 1;
        console.log(`  [${category}] ${doc.name.slice(0, 50)}… → ₹${doc.price} (MRP ₹${doc.originalPrice}, stock ${doc.stockQuantity})`);
    }
    return { inserted, skipped };
};
const runWomen = process.argv.includes('--women') || process.argv.includes('--women-only');
const runMen = process.argv.includes('--men') || process.argv.includes('--men-only');
const runBoth = !runWomen && !runMen;
const main = async () => {
    await (0, db_1.connectDB)();
    const mediaBase = process.env.SEED_MEDIA_BASE_URL;
    console.log(`Image base URL: ${mediaBase ?? 'https://uat.tangerineluxury.com (default)'}\n`);
    let menInserted = 0;
    let menSkipped = 0;
    let womenInserted = 0;
    let womenSkipped = 0;
    if (runBoth || runMen) {
        const menItems = loadV2File(MEN_FILE);
        const deletedMen = await models_1.Product.deleteMany({ category: 'Men' });
        console.log(`Removed ${deletedMen.deletedCount} Men products`);
        console.log(`Importing ${menItems.length} Men from v2/men.json…`);
        const result = await importCategory(menItems, 'Men', mediaBase);
        menInserted = result.inserted;
        menSkipped = result.skipped;
    }
    if (runBoth || runWomen) {
        const womenItems = loadV2File(WOMEN_FILE);
        const deletedWomen = await models_1.Product.deleteMany({ category: 'Women' });
        console.log(`\nRemoved ${deletedWomen.deletedCount} Women products`);
        console.log(`Importing ${womenItems.length} Women from v2/women.json…`);
        const result = await importCategory(womenItems, 'Women', mediaBase);
        womenInserted = result.inserted;
        womenSkipped = result.skipped;
    }
    const counts = await models_1.Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log('\n--- Summary ---');
    if (runBoth || runMen) {
        console.log(`Men: ${menInserted} inserted, ${menSkipped} skipped`);
    }
    if (runBoth || runWomen) {
        console.log(`Women: ${womenInserted} inserted, ${womenSkipped} skipped`);
    }
    console.log('Totals in database:');
    for (const row of counts) {
        console.log(`  ${row._id}: ${row.count}`);
    }
    process.exit(0);
};
main().catch((err) => {
    console.error('seed-v2-men-women failed:', err);
    process.exit(1);
});
