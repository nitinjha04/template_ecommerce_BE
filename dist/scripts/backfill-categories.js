"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Sets `category` on existing products from tags / legacy Fake Store data.
 *
 * Usage: npm run seed:backfill-categories
 */
const db_1 = require("../config/db");
const models_1 = require("../models");
const VALID = ['Men', 'Women', 'Accessories'];
const LEGACY_MAP = {
    Outerwear: 'Women',
    Knitwear: 'Women',
    Shirts: 'Men',
    Trousers: 'Men',
};
const inferCategory = (tags, existing) => {
    if (existing) {
        if (VALID.includes(existing)) {
            return existing;
        }
        if (LEGACY_MAP[existing])
            return LEGACY_MAP[existing];
    }
    const lower = tags.map((t) => t.toLowerCase());
    const joined = lower.join(' ');
    // Check women's before men's — "women's" contains the substring "men's"
    if (joined.includes("women's clothing") || joined.includes("women's"))
        return 'Women';
    if (joined.includes("men's clothing") || joined.includes("men's"))
        return 'Men';
    if (lower.includes('jewelery') || lower.includes('jewelry') || lower.includes('electronics')) {
        return 'Accessories';
    }
    return null;
};
const main = async () => {
    await (0, db_1.connectDB)();
    const products = await models_1.Product.find().lean();
    let updated = 0;
    let skipped = 0;
    for (const p of products) {
        const legacy = p.category;
        const next = inferCategory(p.tags ?? [], legacy);
        if (!next) {
            skipped += 1;
            continue;
        }
        if (legacy === next) {
            skipped += 1;
            continue;
        }
        await models_1.Product.updateOne({ _id: p._id }, { $set: { category: next } });
        updated += 1;
        console.log(`  ${p.name}: ${legacy ?? '(none)'} → ${next}`);
    }
    console.log(`\nUpdated ${updated}, skipped ${skipped} of ${products.length} products`);
    for (const cat of VALID) {
        const count = await models_1.Product.countDocuments({ category: cat });
        console.log(`  ${cat}: ${count}`);
    }
    process.exit(0);
};
main().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
