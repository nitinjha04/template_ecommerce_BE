/**
 * Remove duplicate products for a store (same image pathname = duplicate).
 * Keeps the oldest product (by createdAt) in each duplicate group.
 *
 * Usage:
 *   npm run remove:duplicate-products
 *   npm run remove:duplicate-products:dry
 *   npm run remove:duplicate-products -- --store-id <mongoId>
 */
import { Types } from 'mongoose';
import { connectDB } from '../config/db';
import { Order, Product } from '../models';
import { ARGEN_STORE_ID } from '../scraping/argen-style/constants';
import { imageDedupeKey } from '../scraping/argen-style/image-utils';

const dryRun = process.argv.includes('--dry-run');

const parseStoreId = (): string => {
  const idx = process.argv.indexOf('--store-id');
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].trim();
  }
  return ARGEN_STORE_ID;
};

const main = async (): Promise<void> => {
  const storeId = parseStoreId();
  if (!Types.ObjectId.isValid(storeId)) {
    console.error('Invalid --store-id');
    process.exit(1);
  }

  await connectDB();

  const storeOid = new Types.ObjectId(storeId);
  const products = await Product.find({ store: storeOid })
    .select('name slug images createdAt price category')
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Store ${storeId}: ${products.length} products`);
  if (dryRun) console.log('DRY RUN — no deletes\n');

  const imageOwner = new Map<string, Types.ObjectId>();
  const keeperForDuplicate = new Map<string, Types.ObjectId>();
  const toRemove: { _id: Types.ObjectId; keeperId: Types.ObjectId; name: string; reason: string }[] =
    [];

  for (const product of products) {
    const id = product._id as Types.ObjectId;
    const keys = (product.images ?? [])
      .map((url) => imageDedupeKey(url))
      .filter(Boolean);

    if (keys.length === 0) continue;

    const existingKey = keys.find((k) => imageOwner.has(k));
    if (existingKey) {
      const keeperId = imageOwner.get(existingKey)!;
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

  const orders = await Order.find({ 'items.product': { $in: removeIds } });
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

  const result = await Product.deleteMany({ _id: { $in: removeIds }, store: storeOid });
  const remaining = await Product.countDocuments({ store: storeOid });

  console.log(`\nDeleted: ${result.deletedCount}`);
  console.log(`Remaining products in store: ${remaining}`);

  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
