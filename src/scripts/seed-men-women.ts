/**
 * Replaces Men and/or Women products from men-data.txt / women-data.txt.
 * Accessories are never changed.
 *
 * Usage:
 *   npm run seed:men-women      # both categories
 *   npm run seed:women          # women only
 *   npm run seed:men            # men only
 */
import { Model } from 'mongoose';
import { connectDB } from '../config/db';
import { Product } from '../models';
import { ProductCategory } from '../types';
import { slugify, uniqueSlug } from '../utils/slug';
import {
  buildDescription,
  inferColorsFromName,
  loadMenData,
  loadWomenData,
  ParsedCategoryRow,
  randomPriceInr,
  sizesForCategory,
  tagsFromName,
} from '../seed/parse-category-data';

type SeedPayload = {
  name: string;
  slug: string;
  price: number;
  category: ProductCategory;
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

const toProduct = (
  row: ParsedCategoryRow,
  category: ProductCategory,
  index: number,
  slug: string
): SeedPayload => {
  const name =
    row.name.length > 180 ? `${row.name.slice(0, 177).trim()}...` : row.name.trim();

  return {
    name,
    slug,
    price: randomPriceInr(),
    category,
    description: buildDescription(name, category),
    sizes: sizesForCategory(category),
    colors: inferColorsFromName(name, category),
    images: [row.imageUrl],
    tags: tagsFromName(name, category),
    inStock: true,
    featured: index < 4,
    metaTitle: name.slice(0, 70),
    metaDescription: buildDescription(name, category).slice(0, 160),
    metaKeywords: tagsFromName(name, category),
  };
};

const importCategory = async (
  rows: ParsedCategoryRow[],
  category: ProductCategory
): Promise<number> => {
  const usedSlugs = new Set<string>();
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let baseSlug = slugify(row.name) || `product-${category.toLowerCase()}-${i + 1}`;
    if (usedSlugs.has(baseSlug)) {
      baseSlug = `${baseSlug}-${i + 1}`;
    }
    const slug = await uniqueSlug(baseSlug, Product as Model<unknown>);
    usedSlugs.add(slug);

    const doc = toProduct(row, category, i, slug);
    await Product.create(doc);
    inserted += 1;
    console.log(`  [${category}] ${doc.name.slice(0, 60)}… → ₹${doc.price}`);
  }

  return inserted;
};

const runWomen = process.argv.includes('--women') || process.argv.includes('--women-only');
const runMen = process.argv.includes('--men') || process.argv.includes('--men-only');
const runBoth = !runWomen && !runMen;

const main = async (): Promise<void> => {
  await connectDB();

  let menCount = 0;
  let womenCount = 0;

  if (runBoth || runMen) {
    const menRows = loadMenData();
    if (menRows.length === 0) {
      console.error('No rows parsed from men-data.txt');
      process.exit(1);
    }
    const deletedMen = await Product.deleteMany({ category: 'Men' });
    console.log(`Removed ${deletedMen.deletedCount} Men products\n`);
    console.log(`Importing ${menRows.length} Men products…`);
    menCount = await importCategory(menRows, 'Men');
  }

  if (runBoth || runWomen) {
    const womenRows = loadWomenData();
    if (womenRows.length === 0) {
      console.error('No rows parsed from women-data.txt');
      process.exit(1);
    }
    const deletedWomen = await Product.deleteMany({ category: 'Women' });
    console.log(
      runBoth ? '' : `Removed ${deletedWomen.deletedCount} Women products\n`
    );
    if (runBoth) {
      console.log(`\nImporting ${womenRows.length} Women products…`);
    } else {
      console.log(`Importing ${womenRows.length} Women products…`);
    }
    womenCount = await importCategory(womenRows, 'Women');
  }

  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log('\n--- Summary ---');
  if (runBoth || runMen) console.log(`Men inserted: ${menCount}`);
  if (runBoth || runWomen) console.log(`Women inserted: ${womenCount}`);
  console.log('Totals in database:');
  for (const row of counts) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  process.exit(0);
};

main().catch((err) => {
  console.error('seed-men-women failed:', err);
  process.exit(1);
});
