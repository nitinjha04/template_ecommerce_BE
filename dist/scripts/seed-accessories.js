"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
const parse_category_data_1 = require("../seed/parse-category-data");
const CATEGORY = 'Accessories';
const toProduct = (row, index, slug) => {
    const name = row.name.length > 180 ? `${row.name.slice(0, 177).trim()}...` : row.name.trim();
    return {
        name,
        slug,
        price: (0, parse_category_data_1.randomPriceInr)(),
        category: CATEGORY,
        description: (0, parse_category_data_1.buildDescription)(name, CATEGORY),
        sizes: (0, parse_category_data_1.sizesForCategory)(CATEGORY),
        colors: (0, parse_category_data_1.inferColorsFromName)(name, CATEGORY),
        images: [row.imageUrl],
        tags: (0, parse_category_data_1.tagsFromName)(name, CATEGORY),
        inStock: true,
        featured: index < 4,
        metaTitle: name.slice(0, 70),
        metaDescription: (0, parse_category_data_1.buildDescription)(name, CATEGORY).slice(0, 160),
        metaKeywords: (0, parse_category_data_1.tagsFromName)(name, CATEGORY),
    };
};
const main = async () => {
    await (0, db_1.connectDB)();
    const rows = (0, parse_category_data_1.loadAccessoriesData)();
    if (rows.length === 0) {
        console.error('No rows parsed from accessories-data.txt');
        process.exit(1);
    }
    const deleted = await models_1.Product.deleteMany({ category: CATEGORY });
    console.log(`Removed ${deleted.deletedCount} existing Accessories products\n`);
    console.log(`Importing ${rows.length} Accessories from accessories-data.txt…\n`);
    const usedSlugs = new Set();
    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let baseSlug = (0, slug_1.slugify)(row.name) || `accessories-${i + 1}`;
        if (usedSlugs.has(baseSlug)) {
            baseSlug = `${baseSlug}-${i + 1}`;
        }
        const slug = await (0, slug_1.uniqueSlug)(baseSlug, models_1.Product);
        usedSlugs.add(slug);
        const doc = toProduct(row, i, slug);
        await models_1.Product.create(doc);
        inserted += 1;
        console.log(`  [Accessories] ${doc.name.slice(0, 60)}… → ₹${doc.price}`);
    }
    const counts = await models_1.Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log('\n--- Summary ---');
    console.log(`Accessories inserted: ${inserted}`);
    console.log('Totals in database:');
    for (const row of counts) {
        console.log(`  ${row._id}: ${row.count}`);
    }
    process.exit(0);
};
main().catch((err) => {
    console.error('seed-accessories failed:', err);
    process.exit(1);
});
