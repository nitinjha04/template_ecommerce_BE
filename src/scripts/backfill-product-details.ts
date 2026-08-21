/**
 * Fills PDP detail fields on existing Men/Women products (no re-import of images).
 *
 * Usage:
 *   npm run seed:backfill-pdp
 *   npm run seed:backfill-pdp -- --men-only
 *   npm run seed:backfill-pdp -- --women-only
 */
import { connectDB } from '../config/db';
import { Product } from '../models';
import { ProductCategory } from '../types';
import { buildRandomProductDetails } from '../seed/v2/random-product-details';
import type { V2ProductRaw } from '../seed/v2/map-v2-product';

const runWomen = process.argv.includes('--women-only');
const runMen = process.argv.includes('--men-only');
const runBoth = !runWomen && !runMen;

const categories: ProductCategory[] = [];
if (runBoth || runMen) categories.push('Men');
if (runBoth || runWomen) categories.push('Women');

const main = async (): Promise<void> => {
  await connectDB();

  let updated = 0;

  for (const category of categories) {
    const products = await Product.find({ category }).lean();
    console.log(`\nUpdating ${products.length} ${category} products…`);

    for (const p of products) {
      const salePrice = p.price;
      const details = buildRandomProductDetails(
        { totalStock: p.stockQuantity } as V2ProductRaw,
        category,
        salePrice
      );

      await Product.updateOne(
        { _id: p._id },
        {
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
        }
      );
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
