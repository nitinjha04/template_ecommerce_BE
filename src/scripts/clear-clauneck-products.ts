/**
 * Delete all Clauneck (clauneck.in) products before a fresh PLT import.
 *
 *   npm run scrape:plt:clear
 */
import { connectDB } from '../config/db';
import { Product } from '../models';
import {
  CLAUNECK_STORE_DOMAIN,
} from '../scraping/prettylittlething/constants';
import { ensureClauneckStore } from '../scraping/prettylittlething/ensure-store';

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();
  const storeId = await ensureClauneckStore();
  const count = await Product.countDocuments({ store: storeId });
  console.log(`Store ${CLAUNECK_STORE_DOMAIN} (${storeId}): ${count} product(s)`);

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
