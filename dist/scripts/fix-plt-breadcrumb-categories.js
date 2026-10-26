"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fix PLT imports: shop facets use breadcrumbCategory, which was saved as
 * long "Womens > …" paths. Align breadcrumbCategory with the clean `category`.
 *
 *   npx tsx src/scripts/fix-plt-breadcrumb-categories.ts
 *   npx tsx src/scripts/fix-plt-breadcrumb-categories.ts --dry-run
 *   npx tsx src/scripts/fix-plt-breadcrumb-categories.ts --domain mohdeep.in
 */
const db_1 = require("../config/db");
const models_1 = require("../models");
const Store_model_1 = require("../models/Store.model");
const PLT_DOMAINS = [
    'clauneck.in',
    'nextriva.in',
    'higreenny.in',
    'bhojak.in',
    'mohdeepshop.in',
];
const parseArgs = () => {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes('--dry-run');
    const domainIdx = argv.indexOf('--domain');
    const domain = domainIdx >= 0 && argv[domainIdx + 1] ? argv[domainIdx + 1].trim() : '';
    return { dryRun, domain };
};
const main = async () => {
    const { dryRun, domain } = parseArgs();
    await (0, db_1.connectDB)();
    const domains = domain ? [domain] : PLT_DOMAINS;
    const stores = await Store_model_1.Store.find({ domain: { $in: domains } })
        .select('_id name domain')
        .lean();
    if (!stores.length) {
        console.error('No matching stores found for', domains);
        process.exit(1);
    }
    let totalMatched = 0;
    let totalModified = 0;
    for (const store of stores) {
        const storeId = String(store._id);
        const filter = {
            store: storeId,
            breadcrumbCategory: { $regex: '>' },
        };
        const matched = await models_1.Product.countDocuments(filter);
        console.log(`\n${store.domain} (${store.name}): ${matched} product(s) with path-style breadcrumbCategory`);
        totalMatched += matched;
        if (matched === 0)
            continue;
        if (dryRun) {
            const sample = await models_1.Product.find(filter)
                .select('name category breadcrumbCategory')
                .limit(3)
                .lean();
            for (const row of sample) {
                console.log(`  would set "${row.breadcrumbCategory}" → "${row.category}" (${row.name?.slice(0, 40)})`);
            }
            continue;
        }
        const result = await models_1.Product.updateMany(filter, [
            { $set: { breadcrumbCategory: '$category' } },
        ]);
        console.log(`  modified: ${result.modifiedCount}`);
        totalModified += result.modifiedCount;
    }
    console.log(`\nDone. matched=${totalMatched} modified=${totalModified}${dryRun ? ' (dry-run)' : ''}`);
    process.exit(0);
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
