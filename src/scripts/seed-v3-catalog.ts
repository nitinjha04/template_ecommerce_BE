/**
 * Replaces Men, Lehenga, and Saree products from BE/src/seed/v3/*.txt
 * (removes legacy "Women" products). Accessories unchanged.
 *
 *   npm run seed:v3
 */
import { Model } from 'mongoose';
import { connectDB } from '../config/db';
import { Category, Product } from '../models';
import { ProductCategory } from '../types';
import { slugify, uniqueSlug } from '../utils/slug';
import { buildV3Product } from '../seed/v3/build-v3-product';
import {
  loadLehengaV3Data,
  loadMenV3Data,
  loadSareeV3Data,
  V3ParsedRow,
} from '../seed/v3/parse-v3-data';

const V3_CATEGORIES: Array<{
  name: ProductCategory;
  slug: string;
  sortOrder: number;
}> = [
  { name: 'Men', slug: 'men', sortOrder: 0 },
  { name: 'Lehenga', slug: 'lehenga', sortOrder: 1 },
  { name: 'Saree', slug: 'saree', sortOrder: 2 },
  { name: 'Accessories', slug: 'accessories', sortOrder: 3 },
];

const REPLACE_CATEGORIES: ProductCategory[] = ['Men', 'Women', 'Lehenga', 'Saree'];

const ensureV3Categories = async (): Promise<void> => {
  for (const cat of V3_CATEGORIES) {
    await Category.updateOne(
      { name: cat.name },
      {
        $setOnInsert: {
          name: cat.name,
          slug: cat.slug,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      },
      { upsert: true }
    );
  }
  console.log('Categories ready: Men, Lehenga, Saree, Accessories');
};

const importRows = async (
  rows: V3ParsedRow[],
  category: ProductCategory
): Promise<number> => {
  const usedSlugs = new Set<string>();
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let baseSlug = slugify(row.name) || `${category.toLowerCase()}-${i + 1}`;
    if (usedSlugs.has(baseSlug)) {
      baseSlug = `${baseSlug}-${i + 1}`;
    }
    const slug = await uniqueSlug(baseSlug, Product as Model<unknown>);
    usedSlugs.add(slug);

    const doc = buildV3Product(row, category, i, slug);
    await Product.create(doc);
    inserted += 1;
    console.log(
      `  [${category}] ${doc.name.slice(0, 55)}… → ₹${doc.price} (${doc.images.length} img)`
    );
  }

  return inserted;
};

const main = async (): Promise<void> => {
  await connectDB();
  await ensureV3Categories();

  const menRows = loadMenV3Data();
  const lehengaRows = loadLehengaV3Data();
  const sareeRows = loadSareeV3Data();

  if (menRows.length === 0) {
    console.error('No rows in wedding-men-data.txt');
    process.exit(1);
  }
  if (lehengaRows.length === 0) {
    console.error('No rows in lehenga-women-data.txt');
    process.exit(1);
  }
  if (sareeRows.length === 0) {
    console.error('No rows in saree-women-data.txt');
    process.exit(1);
  }

  const deleted = await Product.deleteMany({ category: { $in: REPLACE_CATEGORIES } });
  console.log(
    `Removed ${deleted.deletedCount} products (Men / Women / Lehenga / Saree)\n`
  );

  console.log(`Importing ${menRows.length} Men (wedding) products…`);
  const menCount = await importRows(menRows, 'Men');

  console.log(`\nImporting ${lehengaRows.length} Lehenga products…`);
  const lehengaCount = await importRows(lehengaRows, 'Lehenga');

  console.log(`\nImporting ${sareeRows.length} Saree products…`);
  const sareeCount = await importRows(sareeRows, 'Saree');

  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log('\n--- Summary ---');
  console.log(`Men: ${menCount}`);
  console.log(`Lehenga: ${lehengaCount}`);
  console.log(`Saree: ${sareeCount}`);
  console.log('Totals in database:');
  for (const row of counts) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  process.exit(0);
};

main().catch((err) => {
  console.error('seed-v3-catalog failed:', err);
  process.exit(1);
});
