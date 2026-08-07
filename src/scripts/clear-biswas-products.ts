/**
 * Delete all products for EasyMart (biswasmart.in).
 *
 *   npx tsx src/scripts/clear-biswas-products.ts
 *   npx tsx src/scripts/clear-biswas-products.ts --dry-run
 */
import { connectDB } from '../config/db';
import { Product } from '../models';
import {
  BISWAS_STORE_DOMAIN,
} from '../scraping/ajio/constants';
import { ensureBiswasStore } from '../scraping/ajio/ensure-store';

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();
  const storeId = await ensureBiswasStore();

  const count = await Product.countDocuments({ store: storeId });
  console.log(`Store ${BISWAS_STORE_DOMAIN} (${storeId}): ${count} product(s)`);

  if (dryRun) {
    console.log(`DRY RUN — would delete ${count}`);
    process.exit(0);
  }

  const result = await Product.deleteMany({ store: storeId });
  console.log(`Deleted ${result.deletedCount ?? 0} product(s).`);
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
