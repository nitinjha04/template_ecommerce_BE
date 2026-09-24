"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
const parse_category_data_1 = require("../seed/parse-category-data");
const toProduct = (row, category, index, slug) => {
    const name = row.name.length > 180 ? `${row.name.slice(0, 177).trim()}...` : row.name.trim();
    return {
        name,
        slug,
        price: (0, parse_category_data_1.randomPriceInr)(),
        category,
        description: (0, parse_category_data_1.buildDescription)(name, category),
        sizes: (0, parse_category_data_1.sizesForCategory)(category),
        colors: (0, parse_category_data_1.inferColorsFromName)(name, category),
        images: [row.imageUrl],
        tags: (0, parse_category_data_1.tagsFromName)(name, category),
        inStock: true,
        featured: index < 4,
        metaTitle: name.slice(0, 70),
        metaDescription: (0, parse_category_data_1.buildDescription)(name, category).slice(0, 160),
        metaKeywords: (0, parse_category_data_1.tagsFromName)(name, category),
    };
};
const importCategory = async (rows, category) => {
    const usedSlugs = new Set();
    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let baseSlug = (0, slug_1.slugify)(row.name) || `product-${category.toLowerCase()}-${i + 1}`;
        if (usedSlugs.has(baseSlug)) {
            baseSlug = `${baseSlug}-${i + 1}`;
        }
        const slug = await (0, slug_1.uniqueSlug)(baseSlug, models_1.Product);
        usedSlugs.add(slug);
        const doc = toProduct(row, category, i, slug);
        await models_1.Product.create(doc);
        inserted += 1;
        console.log(`  [${category}] ${doc.name.slice(0, 60)}… → ₹${doc.price}`);
    }
    return inserted;
};
const runWomen = process.argv.includes('--women') || process.argv.includes('--women-only');
const runMen = process.argv.includes('--men') || process.argv.includes('--men-only');
const runBoth = !runWomen && !runMen;
const main = async () => {
    await (0, db_1.connectDB)();
    let menCount = 0;
    let womenCount = 0;
    if (runBoth || runMen) {
        const menRows = (0, parse_category_data_1.loadMenData)();
        if (menRows.length === 0) {
            console.error('No rows parsed from men-data.txt');
            process.exit(1);
        }
        const deletedMen = await models_1.Product.deleteMany({ category: 'Men' });
        console.log(`Removed ${deletedMen.deletedCount} Men products\n`);
        console.log(`Importing ${menRows.length} Men products…`);
        menCount = await importCategory(menRows, 'Men');
    }
    if (runBoth || runWomen) {
        const womenRows = (0, parse_category_data_1.loadWomenData)();
        if (womenRows.length === 0) {
            console.error('No rows parsed from women-data.txt');
            process.exit(1);
        }
        const deletedWomen = await models_1.Product.deleteMany({ category: 'Women' });
        console.log(runBoth ? '' : `Removed ${deletedWomen.deletedCount} Women products\n`);
        if (runBoth) {
            console.log(`\nImporting ${womenRows.length} Women products…`);
        }
        else {
            console.log(`Importing ${womenRows.length} Women products…`);
        }
        womenCount = await importCategory(womenRows, 'Women');
    }
    const counts = await models_1.Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log('\n--- Summary ---');
    if (runBoth || runMen)
        console.log(`Men inserted: ${menCount}`);
    if (runBoth || runWomen)
        console.log(`Women inserted: ${womenCount}`);
    console.log('Totals in database:');
    for (const row of counts) {
        console.log(`  ${row._id}: ${row.count}`);
    }
    process.exit(0);
};
main().catch((err) => {
    console.error('seed-men-women failed:', err);
    process.exit(1);
});
