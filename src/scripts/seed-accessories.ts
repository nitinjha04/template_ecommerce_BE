/**
 * Replaces all Accessories products from accessories-data.txt.
 * Men and Women products are left unchanged.
 *
 * Usage: npm run seed:accessories
 */
import { Model } from 'mongoose';
import { connectDB } from '../config/db';
import { Product } from '../models';
import { slugify, uniqueSlug } from '../utils/slug';
import {
  buildDescription,
  inferColorsFromName,
  loadAccessoriesData,
  ParsedCategoryRow,
  randomPriceInr,
  sizesForCategory,
  tagsFromName,
} from '../seed/parse-category-data';

const CATEGORY = 'Accessories' as const;

type SeedPayload = {
  name: string;
  slug: string;
  price: number;
  category: typeof CATEGORY;
  description: string;
  sizes: string[];
  colors: string[];
  images: string[];
  tags: string[];
  inStock: boolean;
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
};

const toProduct = (row: ParsedCategoryRow, index: number, slug: string): SeedPayload => {
  const name =
    row.name.length > 180 ? `${row.name.slice(0, 177).trim()}...` : row.name.trim();

  return {
    name,
    slug,
    price: randomPriceInr(),
    category: CATEGORY,
    description: buildDescription(name, CATEGORY),
    sizes: sizesForCategory(CATEGORY),
    colors: inferColorsFromName(name, CATEGORY),
    images: [row.imageUrl],
    tags: tagsFromName(name, CATEGORY),
    inStock: true,
    featured: index < 4,
    metaTitle: name.slice(0, 70),
    metaDescription: buildDescription(name, CATEGORY).slice(0, 160),
    metaKeywords: tagsFromName(name, CATEGORY),
  };
};

const main = async (): Promise<void> => {
  await connectDB();

  const rows = loadAccessoriesData();
  if (rows.length === 0) {
    console.error('No rows parsed from accessories-data.txt');
    process.exit(1);
  }

  const deleted = await Product.deleteMany({ category: CATEGORY });
  console.log(`Removed ${deleted.deletedCount} existing Accessories products\n`);
  console.log(`Importing ${rows.length} Accessories from accessories-data.txt…\n`);

  const usedSlugs = new Set<string>();
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let baseSlug = slugify(row.name) || `accessories-${i + 1}`;
    if (usedSlugs.has(baseSlug)) {
      baseSlug = `${baseSlug}-${i + 1}`;
    }
    const slug = await uniqueSlug(baseSlug, Product as Model<unknown>);
    usedSlugs.add(slug);

    const doc = toProduct(row, i, slug);
    await Product.create(doc);
    inserted += 1;
    console.log(`  [Accessories] ${doc.name.slice(0, 60)}… → ₹${doc.price}`);
  }

  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log('\n--- Summary ---');
  console.log(`Accessories inserted: ${inserted}`);
  console.log('Totals in database:');
  for (const row of counts) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  process.exit(0);
};

main().catch((err) => {
  console.error('seed-accessories failed:', err);
  process.exit(1);
});
