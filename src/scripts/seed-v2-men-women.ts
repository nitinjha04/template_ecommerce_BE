/**
 * Replaces Men and/or Women products from v2 JSON exports.
 * Only maps fields that exist on the Product model (name, price, images, etc.).
 * Accessories are never changed.
 *
 * Relative image paths are prefixed with https://uat.tangerineluxury.com by default.
 * Override with SEED_MEDIA_BASE_URL in .env if needed.
 *
 * Usage:
 *   npm run seed:v2-men-women   # both
 *   npm run seed:v2-men         # men only
 *   npm run seed:v2-women       # women only
 */
import * as fs from 'fs';
import * as path from 'path';
import { Model } from 'mongoose';
import { connectDB } from '../config/db';
import { Product } from '../models';
import { ProductCategory } from '../types';
import { slugify, uniqueSlug } from '../utils/slug';
import {
  mapV2ToProduct,
  V2ProductRaw,
} from '../seed/v2/map-v2-product';

const V2_DIR = path.join(__dirname, '../seed/v2');
const MEN_FILE = path.join(V2_DIR, 'men.json');
const WOMEN_FILE = path.join(V2_DIR, 'women.json');

const loadV2File = (filePath: string): V2ProductRaw[] => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must be a JSON array`);
  }
  return parsed as V2ProductRaw[];
};

const sortByPosition = (items: V2ProductRaw[]): V2ProductRaw[] =>
  [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const importCategory = async (
  items: V2ProductRaw[],
  category: ProductCategory,
  mediaBase: string
): Promise<{ inserted: number; skipped: number }> => {
  const sorted = sortByPosition(items);
  const usedSlugs = new Set<string>();
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < sorted.length; i++) {
    const raw = sorted[i];
    let baseSlug =
      (raw.slug ?? '').trim().toLowerCase() ||
      slugify(raw.name ?? '') ||
      `product-${category.toLowerCase()}-${i + 1}`;

    if (usedSlugs.has(baseSlug)) {
      baseSlug = `${baseSlug}-${i + 1}`;
    }
    const slug = await uniqueSlug(baseSlug, Product as Model<unknown>);
    usedSlugs.add(slug);

    const doc = mapV2ToProduct(raw, category, i, slug, mediaBase);
    if (!doc) {
      skipped += 1;
      console.warn(`  [skip] ${raw.name?.slice(0, 50) ?? '(no name)'} — missing name, price, or images`);
      continue;
    }

    await Product.create(doc);
    inserted += 1;
    console.log(`  [${category}] ${doc.name.slice(0, 55)}… → ₹${doc.price} (${doc.images.length} img)`);
  }

  return { inserted, skipped };
};

const runWomen = process.argv.includes('--women') || process.argv.includes('--women-only');
const runMen = process.argv.includes('--men') || process.argv.includes('--men-only');
const runBoth = !runWomen && !runMen;

const main = async (): Promise<void> => {
  await connectDB();

  const mediaBase = process.env.SEED_MEDIA_BASE_URL;
  console.log(
    `Image base URL: ${mediaBase ?? 'https://uat.tangerineluxury.com (default)'}\n`
  );

  let menInserted = 0;
  let menSkipped = 0;
  let womenInserted = 0;
  let womenSkipped = 0;

  if (runBoth || runMen) {
    const menItems = loadV2File(MEN_FILE);
    const deletedMen = await Product.deleteMany({ category: 'Men' });
    console.log(`Removed ${deletedMen.deletedCount} Men products`);
    console.log(`Importing ${menItems.length} Men from v2/men.json…`);
    const result = await importCategory(menItems, 'Men', mediaBase);
    menInserted = result.inserted;
    menSkipped = result.skipped;
  }

  if (runBoth || runWomen) {
    const womenItems = loadV2File(WOMEN_FILE);
    const deletedWomen = await Product.deleteMany({ category: 'Women' });
    console.log(`\nRemoved ${deletedWomen.deletedCount} Women products`);
    console.log(`Importing ${womenItems.length} Women from v2/women.json…`);
    const result = await importCategory(womenItems, 'Women', mediaBase);
    womenInserted = result.inserted;
    womenSkipped = result.skipped;
  }

  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log('\n--- Summary ---');
  if (runBoth || runMen) {
    console.log(`Men: ${menInserted} inserted, ${menSkipped} skipped`);
  }
  if (runBoth || runWomen) {
    console.log(`Women: ${womenInserted} inserted, ${womenSkipped} skipped`);
  }
  console.log('Totals in database:');
  for (const row of counts) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  process.exit(0);
};

main().catch((err) => {
  console.error('seed-v2-men-women failed:', err);
  process.exit(1);
});
