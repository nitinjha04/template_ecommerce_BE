"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
const build_v3_product_1 = require("../seed/v3/build-v3-product");
const parse_v3_data_1 = require("../seed/v3/parse-v3-data");
const V3_CATEGORIES = [
    { name: 'Men', slug: 'men', sortOrder: 0 },
    { name: 'Lehenga', slug: 'lehenga', sortOrder: 1 },
    { name: 'Saree', slug: 'saree', sortOrder: 2 },
    { name: 'Accessories', slug: 'accessories', sortOrder: 3 },
];
const REPLACE_CATEGORIES = ['Men', 'Women', 'Lehenga', 'Saree'];
const ensureV3Categories = async () => {
    for (const cat of V3_CATEGORIES) {
        await models_1.Category.updateOne({ name: cat.name }, {
            $setOnInsert: {
                name: cat.name,
                slug: cat.slug,
                sortOrder: cat.sortOrder,
                isActive: true,
            },
        }, { upsert: true });
    }
    console.log('Categories ready: Men, Lehenga, Saree, Accessories');
};
const importRows = async (rows, category) => {
    const usedSlugs = new Set();
    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let baseSlug = (0, slug_1.slugify)(row.name) || `${category.toLowerCase()}-${i + 1}`;
        if (usedSlugs.has(baseSlug)) {
            baseSlug = `${baseSlug}-${i + 1}`;
        }
        const slug = await (0, slug_1.uniqueSlug)(baseSlug, models_1.Product);
        usedSlugs.add(slug);
        const doc = (0, build_v3_product_1.buildV3Product)(row, category, i, slug);
        await models_1.Product.create(doc);
        inserted += 1;
        console.log(`  [${category}] ${doc.name.slice(0, 55)}… → ₹${doc.price} (${doc.images.length} img)`);
    }
    return inserted;
};
const main = async () => {
    await (0, db_1.connectDB)();
    await ensureV3Categories();
    const menRows = (0, parse_v3_data_1.loadMenV3Data)();
    const lehengaRows = (0, parse_v3_data_1.loadLehengaV3Data)();
    const sareeRows = (0, parse_v3_data_1.loadSareeV3Data)();
    if (menRows.length === 0) {
        console.error('No rows in wedding-men-data.txt');
        process.exit(1);
    }
    if (lehengaRows.length === 0) {
        console.error('No rows in lehenga-women-data.txt');
        process.exit(1);
    }
    if (sareeRows.length === 0) {
        console.error('No rows in saree-women-data.txt');
        process.exit(1);
    }
    const deleted = await models_1.Product.deleteMany({ category: { $in: REPLACE_CATEGORIES } });
    console.log(`Removed ${deleted.deletedCount} products (Men / Women / Lehenga / Saree)\n`);
    console.log(`Importing ${menRows.length} Men (wedding) products…`);
    const menCount = await importRows(menRows, 'Men');
    console.log(`\nImporting ${lehengaRows.length} Lehenga products…`);
    const lehengaCount = await importRows(lehengaRows, 'Lehenga');
    console.log(`\nImporting ${sareeRows.length} Saree products…`);
    const sareeCount = await importRows(sareeRows, 'Saree');
    const counts = await models_1.Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log('\n--- Summary ---');
    console.log(`Men: ${menCount}`);
    console.log(`Lehenga: ${lehengaCount}`);
    console.log(`Saree: ${sareeCount}`);
    console.log('Totals in database:');
    for (const row of counts) {
        console.log(`  ${row._id}: ${row.count}`);
    }
    process.exit(0);
};
main().catch((err) => {
    console.error('seed-v3-catalog failed:', err);
    process.exit(1);
});
