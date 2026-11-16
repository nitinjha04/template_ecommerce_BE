"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Delete all products for EasyMart (biswasmart.in).
 *
 *   npx tsx src/scripts/clear-biswas-products.ts
 *   npx tsx src/scripts/clear-biswas-products.ts --dry-run
 */
const db_1 = require("../config/db");
const models_1 = require("../models");
const constants_1 = require("../scraping/ajio/constants");
const ensure_store_1 = require("../scraping/ajio/ensure-store");
const main = async () => {
    const dryRun = process.argv.includes('--dry-run');
    await (0, db_1.connectDB)();
    const storeId = await (0, ensure_store_1.ensureBiswasStore)();
    const count = await models_1.Product.countDocuments({ store: storeId });
    console.log(`Store ${constants_1.BISWAS_STORE_DOMAIN} (${storeId}): ${count} product(s)`);
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
