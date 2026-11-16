"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Delete all Clauneck (clauneck.in) products before a fresh PLT import.
 *
 *   npm run scrape:plt:clear
 */
const db_1 = require("../config/db");
const models_1 = require("../models");
const constants_1 = require("../scraping/prettylittlething/constants");
const ensure_store_1 = require("../scraping/prettylittlething/ensure-store");
const main = async () => {
    const dryRun = process.argv.includes('--dry-run');
    await (0, db_1.connectDB)();
    const storeId = await (0, ensure_store_1.ensureClauneckStore)();
    const count = await models_1.Product.countDocuments({ store: storeId });
    console.log(`Store ${constants_1.CLAUNECK_STORE_DOMAIN} (${storeId}): ${count} product(s)`);
    if (dryRun) {
        console.log(`DRY RUN — would delete ${count}`);
        process.exit(0);
    }
    const result = await models_1.Product.deleteMany({ store: storeId });
    console.log(`Deleted ${result.deletedCount ?? 0} product(s).`);
    process.exit(0);
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
