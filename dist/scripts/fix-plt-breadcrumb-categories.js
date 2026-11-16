"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Collapse path-style PLT categories to a short leaf label.
 *   "Brands > Clauneck > Clauneck Clothing > Clauneck Denim" → "Denim"
 *
 * Updates products (category, breadcrumbCategory, tags) and merges Category docs.
 * Runs on every store unless --domain is set.
 *
 *   npx tsx src/scripts/fix-plt-breadcrumb-categories.ts --dry-run
 *   npx tsx src/scripts/fix-plt-breadcrumb-categories.ts
 *   npx tsx src/scripts/fix-plt-breadcrumb-categories.ts --domain clauneckshop.in
 */
const db_1 = require("../config/db");
const models_1 = require("../models");
const Store_model_1 = require("../models/Store.model");
const category_label_1 = require("../utils/category-label");
const slug_1 = require("../utils/slug");
const parseArgs = () => {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes('--dry-run');
    const domainIdx = argv.indexOf('--domain');
    const domain = domainIdx >= 0 && argv[domainIdx + 1] ? argv[domainIdx + 1].trim() : '';
    return { dryRun, domain };
};
const uniqueSlug = async (storeId, base, excludeId) => {
    const root = (0, slug_1.slugify)(base) || 'category';
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const filter = { store: storeId, slug: candidate };
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await models_1.Category.findOne(filter).select('_id').lean();
        if (!exists)
            return candidate;
        attempt += 1;
    }
    return `${root}-${Date.now()}`;
};
const main = async () => {
    const { dryRun, domain } = parseArgs();
    await (0, db_1.connectDB)();
    const stores = await Store_model_1.Store.find(domain ? { domain } : {})
        .select('_id name domain')
        .lean();
    if (!stores.length) {
        console.error('No matching stores found', domain || '(all)');
        process.exit(1);
    }
    let totalProducts = 0;
    let totalCategories = 0;
    for (const store of stores) {
        const storeId = String(store._id);
        const pathFilter = {
            store: storeId,
            $or: [
                { category: { $regex: '>' } },
                { breadcrumbCategory: { $regex: '>' } },
            ],
        };
        const matched = await models_1.Product.countDocuments(pathFilter);
        const pathCats = await models_1.Category.find({
            store: storeId,
            name: { $regex: '>' },
        })
            .select('_id name slug')
            .lean();
        if (matched === 0 && pathCats.length === 0)
            continue;
        console.log(`\n${store.domain} (${store.name}): ${matched} product(s), ${pathCats.length} category doc(s) with path names`);
        const products = await models_1.Product.find(pathFilter)
            .select('_id name category breadcrumbCategory tags')
            .lean();
        const productOps = [];
        for (const row of products) {
            const category = (0, category_label_1.shortenCategoryLabel)(row.category);
            const breadcrumbCategory = (0, category_label_1.shortenCategoryLabel)(row.breadcrumbCategory || row.category);
            const tags = [
                ...new Set((row.tags ?? []).map((tag) => (0, category_label_1.isPathStyleCategory)(tag) ? (0, category_label_1.shortenCategoryLabel)(tag) : tag)),
            ].filter(Boolean);
            if (category === row.category &&
                breadcrumbCategory === (row.breadcrumbCategory || '') &&
                JSON.stringify(tags) === JSON.stringify(row.tags ?? [])) {
                continue;
            }
            productOps.push({
                id: String(row._id),
                category,
                breadcrumbCategory,
                tags,
            });
        }
        if (dryRun) {
            for (const row of productOps.slice(0, 5)) {
                console.log(`  product → category "${row.category}" / facet "${row.breadcrumbCategory}"`);
            }
            for (const cat of pathCats.slice(0, 5)) {
                console.log(`  category doc "${cat.name}" → "${(0, category_label_1.shortenCategoryLabel)(cat.name)}"`);
            }
            totalProducts += productOps.length;
            totalCategories += pathCats.length;
            continue;
        }
        if (productOps.length) {
            await models_1.Product.bulkWrite(productOps.map((row) => ({
                updateOne: {
                    filter: { _id: row.id, store: storeId },
                    update: {
                        $set: {
                            category: row.category,
                            breadcrumbCategory: row.breadcrumbCategory,
                            tags: row.tags,
                        },
                    },
                },
            })), { ordered: false });
        }
        totalProducts += productOps.length;
        console.log(`  products updated: ${productOps.length}`);
        for (const cat of pathCats) {
            const shortName = (0, category_label_1.shortenCategoryLabel)(cat.name);
            if (!shortName || shortName === cat.name)
                continue;
            const target = await models_1.Category.findOne({
                store: storeId,
                _id: { $ne: cat._id },
                name: { $regex: new RegExp(`^${shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            });
            if (target) {
                await models_1.Product.updateMany({ store: storeId, category: cat.name }, { $set: { category: target.name } });
                await models_1.Category.deleteOne({ _id: cat._id, store: storeId });
                console.log(`  merged category "${cat.name}" → "${target.name}"`);
            }
            else {
                const slug = await uniqueSlug(storeId, shortName, String(cat._id));
                await models_1.Category.updateOne({ _id: cat._id, store: storeId }, { $set: { name: shortName, slug } });
                await models_1.Product.updateMany({ store: storeId, category: cat.name }, { $set: { category: shortName } });
                console.log(`  renamed category "${cat.name}" → "${shortName}"`);
            }
            totalCategories += 1;
        }
    }
    console.log(`\nDone. products=${totalProducts} categories=${totalCategories}${dryRun ? ' (dry-run)' : ''}`);
    process.exit(0);
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
