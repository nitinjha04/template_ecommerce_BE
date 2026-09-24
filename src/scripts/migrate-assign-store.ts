/**
 * Creates the default store (dulhaniya.vercel.app) and assigns storeId to all documents.
 *
 * Usage: npm run migrate:assign-store
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { Store } from '../models/Store.model';
import { Product } from '../models/Product.model';
import { Category } from '../models/Category.model';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';
import { User } from '../models/User.model';
import { Contact } from '../models/Contact.model';
import { normalizeStoreDomain } from '../utils/storeDomain';

const DEFAULT_NAME = 'Dulhaniya';
const DEFAULT_SLUG = 'dulhaniya';

async function dropLegacyIndexes() {
  const tryDrop = async (collection: string, indexName: string) => {
    try {
      await mongoose.connection.collection(collection).dropIndex(indexName);
      console.log(`[migrate] Dropped index ${collection}.${indexName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/not found|ns not found/i.test(message)) {
        console.warn(`[migrate] Could not drop ${collection}.${indexName}:`, message);
      }
    }
  };

  await tryDrop('products', 'slug_1');
  await tryDrop('categories', 'slug_1');
  await tryDrop('categories', 'name_1');
  await tryDrop('users', 'email_1');
}

const missingStoreFilter = {
  $or: [{ store: { $exists: false } }, { store: null }],
};

async function main() {
  await connectDB();

  const domain = normalizeStoreDomain(env.defaultStoreDomain);
  let store = await Store.findOne({ domain }).exec();

  if (!store) {
    store = await Store.create({
      name: DEFAULT_NAME,
      slug: DEFAULT_SLUG,
      domain,
      isActive: true,
    });
    console.log(`[migrate] Created store ${store.name} (${store.domain}) id=${store._id}`);
  } else {
    console.log(`[migrate] Using existing store ${store.name} (${store.domain}) id=${store._id}`);
  }

  const storeId = store._id as mongoose.Types.ObjectId;

  await dropLegacyIndexes();

  for (const [label, model] of [
    ['products', Product],
    ['categories', Category],
    ['orders', Order],
    ['payments', Payment],
    ['users', User],
    ['contacts', Contact],
  ] as const) {
    const result = await model.updateMany(missingStoreFilter, { $set: { store: storeId } });
    console.log(
      `[migrate] ${label}: matched ${result.matchedCount}, modified ${result.modifiedCount}`
    );
  }

  await Product.syncIndexes();
  await Category.syncIndexes();
  await User.syncIndexes();

  console.log('[migrate] Done. Set DEFAULT_STORE_DOMAIN and run the API with X-Store-Domain or Origin from your storefront.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
