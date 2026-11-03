/**
 * Seeds the database from products.catalog.json (75 curated products).
 *
 * Usage:
 *   npm run seed:catalog          # insert only if collection empty
 *   npm run seed:catalog:replace  # clear products and re-import catalog
 */
import { connectDB } from '../config/db';
import { Product } from '../models';
import { slugify, uniqueSlug } from '../utils/slug';
import catalog from '../seed/products.catalog.json';
import type { CatalogProduct } from '../seed/generate-catalog';
import { Model } from 'mongoose';

const replace = process.argv.includes('--replace');

const main = async (): Promise<void> => {
  await connectDB();

  const existing = await Product.countDocuments();

  if (existing > 0 && !replace) {
    console.log(
      `${existing} products already in DB. Use npm run seed:catalog:replace to replace with catalog.`
    );
    process.exit(0);
  }

  if (replace && existing > 0) {
    await Product.deleteMany({});
    console.log(`Removed ${existing} existing products`);
  }

  const usedSlugs = new Set<string>();
  let inserted = 0;

  for (const p of catalog as CatalogProduct[]) {
    let slug = slugify(p.name);
    if (usedSlugs.has(slug)) {
      slug = await uniqueSlug(`${slug}-${p.category}`, Product as Model<unknown>);
    } else {
      slug = await uniqueSlug(slug, Product as Model<unknown>);
    }
    usedSlugs.add(slug);

    await Product.create({
      ...p,
      slug,
      metaTitle: p.name.slice(0, 70),
      metaDescription: p.description.slice(0, 160),
      metaKeywords: p.tags,
    });
    inserted += 1;
  }

  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log(`\nInserted ${inserted} products from products.catalog.json`);
  console.log('By category:');
  for (const row of counts) {
    console.log(`  ${row._id}: ${row.count}`);
  }
  process.exit(0);
};

main().catch((err) => {
  console.error('Catalog seed failed:', err);
  process.exit(1);
});
