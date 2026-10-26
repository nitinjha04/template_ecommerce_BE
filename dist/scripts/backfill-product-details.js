"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fills PDP detail fields on existing Men/Women products (no re-import of images).
 *
 * Usage:
 *   npm run seed:backfill-pdp
 *   npm run seed:backfill-pdp -- --men-only
 *   npm run seed:backfill-pdp -- --women-only
 */
const db_1 = require("../config/db");
const models_1 = require("../models");
const random_product_details_1 = require("../seed/v2/random-product-details");
const runWomen = process.argv.includes('--women-only');
const runMen = process.argv.includes('--men-only');
const runBoth = !runWomen && !runMen;
const categories = [];
if (runBoth || runMen)
    categories.push('Men');
if (runBoth || runWomen)
    categories.push('Women');
const main = async () => {
    await (0, db_1.connectDB)();
    let updated = 0;
    for (const category of categories) {
        const products = await models_1.Product.find({ category }).lean();
        console.log(`\nUpdating ${products.length} ${category} products…`);
        for (const p of products) {
            const salePrice = p.price;
            const details = (0, random_product_details_1.buildRandomProductDetails)({ totalStock: p.stockQuantity }, category, salePrice);
            await models_1.Product.updateOne({ _id: p._id }, {
                $set: {
                    originalPrice: details.originalPrice,
                    isHot: details.isHot,
                    fabricComposition: details.fabricComposition,
                    garmentLength: details.garmentLength,
                    packageContains: details.packageContains,
                    washCare: details.washCare,
                    neckline: details.neckline,
                    sleeveLength: details.sleeveLength,
                    fitting: details.fitting,
                    weight: details.weight,
                    dimensions: details.dimensions,
                    stockQuantity: details.stockQuantity,
                    deliveryStartDate: details.deliveryStartDate,
                    deliveryEndDate: details.deliveryEndDate,
                    breadcrumbCategory: details.breadcrumbCategory,
                },
            });
            updated += 1;
        }
    }
    console.log(`\nDone. Updated ${updated} products with random PDP details.`);
    process.exit(0);
};
main().catch((err) => {
    console.error('backfill-product-details failed:', err);
    process.exit(1);
});
