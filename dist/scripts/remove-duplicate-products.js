"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Remove duplicate products for a store (same image pathname = duplicate).
 * Keeps the oldest product (by createdAt) in each duplicate group.
 *
 * Usage:
 *   npm run remove:duplicate-products
 *   npm run remove:duplicate-products:dry
 *   npm run remove:duplicate-products -- --store-id <mongoId>
 */
const mongoose_1 = require("mongoose");
const db_1 = require("../config/db");
const models_1 = require("../models");
const constants_1 = require("../scraping/argen-style/constants");
const image_utils_1 = require("../scraping/argen-style/image-utils");
const dryRun = process.argv.includes('--dry-run');
const parseStoreId = () => {
    const idx = process.argv.indexOf('--store-id');
    if (idx !== -1 && process.argv[idx + 1]) {
        return process.argv[idx + 1].trim();
    }
    return constants_1.ARGEN_STORE_ID;
};
const main = async () => {
    const storeId = parseStoreId();
    if (!mongoose_1.Types.ObjectId.isValid(storeId)) {
        console.error('Invalid --store-id');
        process.exit(1);
    }
    await (0, db_1.connectDB)();
    const storeOid = new mongoose_1.Types.ObjectId(storeId);
    const products = await models_1.Product.find({ store: storeOid })
        .select('name slug images createdAt price category')
        .sort({ createdAt: 1 })
        .lean();
    console.log(`Store ${storeId}: ${products.length} products`);
    if (dryRun)
        console.log('DRY RUN — no deletes\n');
    const imageOwner = new Map();
    const keeperForDuplicate = new Map();
    const toRemove = [];
    for (const product of products) {
        const id = product._id;
        const keys = (product.images ?? [])
            .map((url) => (0, image_utils_1.imageDedupeKey)(url))
            .filter(Boolean);
        if (keys.length === 0)
            continue;
        const existingKey = keys.find((k) => imageOwner.has(k));
        if (existingKey) {
            const keeperId = imageOwner.get(existingKey);
            keeperForDuplicate.set(String(id), keeperId);
            toRemove.push({
                _id: id,
                keeperId,
                name: product.name,
                reason: `shares image ${existingKey}`,
            });
            continue;
        }
        for (const key of keys) {
            imageOwner.set(key, id);
        }
    }
    if (toRemove.length === 0) {
        console.log('No duplicate products found.');
        process.exit(0);
    }
    console.log(`Removing ${toRemove.length} duplicate(s), keeping ${products.length - toRemove.length}\n`);
    for (const row of toRemove.slice(0, 15)) {
        console.log(`  [-] ${row.name.slice(0, 60)}… (${row.reason})`);
    }
    if (toRemove.length > 15) {
        console.log(`  … and ${toRemove.length - 15} more`);
    }
    if (dryRun) {
        console.log(`\nWould delete ${toRemove.length} products`);
        process.exit(0);
    }
    const removeIds = toRemove.map((r) => r._id);
    const orders = await models_1.Order.find({ 'items.product': { $in: removeIds } });
    let ordersUpdated = 0;
    for (const order of orders) {
        let changed = false;
        for (const item of order.items) {
            const keeperId = keeperForDuplicate.get(String(item.product));
            if (keeperId) {
                item.product = keeperId;
                changed = true;
            }
        }
        if (changed) {
            await order.save();
            ordersUpdated += 1;
        }
    }
    if (ordersUpdated > 0) {
        console.log(`Reassigned products in ${ordersUpdated} order(s) to kept duplicates`);
    }
    const result = await models_1.Product.deleteMany({ _id: { $in: removeIds }, store: storeOid });
    const remaining = await models_1.Product.countDocuments({ store: storeOid });
    console.log(`\nDeleted: ${result.deletedCount}`);
    console.log(`Remaining products in store: ${remaining}`);
    process.exit(0);
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
