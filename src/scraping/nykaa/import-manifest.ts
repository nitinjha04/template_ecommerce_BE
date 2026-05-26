import { Model } from 'mongoose';
import { connectDB } from '../../config/db';
import { Product } from '../../models';
import { CategoryService } from '../../services/category.service';
import { uniqueSlug } from '../../utils/slug';
import { replaceNykaaWithCasaq, sanitizeScrapedProduct } from './sanitize-brand';
import type { ScrapeManifest, ScrapedProductDocument } from './types';

const toDbDoc = (p: ScrapedProductDocument, slug: string) => {
  const { _source: _omit, deliveryStartDate, deliveryEndDate, ...rest } = p;

  return {
    ...rest,
    slug,
    deliveryStartDate: new Date(deliveryStartDate),
    deliveryEndDate: new Date(deliveryEndDate),
  };
};

export type ImportManifestResult = {
  inserted: number;
  skipped: number;
  totalInDb?: number;
};

/** Insert manifest products into MongoDB (add only — never deletes). */
export const importManifest = async (
  manifest: ScrapeManifest,
  options: { dryRun?: boolean; skipConnect?: boolean } = {}
): Promise<ImportManifestResult> => {
  const { products, categoryName, categoryFilter } = manifest;
  const dryRun = options.dryRun === true;

  console.log(
    `\nImporting ${products.length} products (${categoryName}, filter ${categoryFilter})…`
  );
  if (dryRun) console.log('DRY RUN — no database writes\n');

  if (!dryRun && !options.skipConnect) {
    await connectDB();
  }

  const cleanCategoryName = replaceNykaaWithCasaq(categoryName.trim());
  let resolvedCategory = cleanCategoryName;
  if (!dryRun) {
    if (options.skipConnect) {
      await CategoryService.ensureDefaults();
    }
    resolvedCategory = await CategoryService.resolveProductCategory(cleanCategoryName);
    console.log(`Category "${resolvedCategory}" is ready (created if it was missing).`);
  } else {
    console.log(`  [dry] would ensure category exists: "${cleanCategoryName}"`);
  }

  let inserted = 0;
  let skipped = 0;

  for (const product of products) {
    const baseSlug = product.slug.trim().toLowerCase();
    if (!baseSlug) {
      skipped += 1;
      console.warn('  [skip] missing slug');
      continue;
    }

    if (dryRun) {
      const cleaned = sanitizeScrapedProduct({ ...product, category: resolvedCategory });
      console.log(`  [dry] ${cleaned.name.slice(0, 55)}… → ₹${cleaned.price} (${cleaned.slug})`);
      inserted += 1;
      continue;
    }

    const cleaned = sanitizeScrapedProduct({ ...product, category: resolvedCategory });
    const slug = await uniqueSlug(cleaned.slug.trim().toLowerCase(), Product as Model<unknown>);
    const doc = toDbDoc(cleaned, slug);

    try {
      await Product.create(doc);
      inserted += 1;
      console.log(`  [+] ${doc.name.slice(0, 50)}… → ₹${doc.price} (${slug})`);
    } catch (err) {
      skipped += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  [skip] ${product.name.slice(0, 40)}… — ${msg}`);
    }
  }

  let totalInDb: number | undefined;
  if (!dryRun) {
    totalInDb = await Product.countDocuments();
    console.log(`\nInserted ${inserted}, skipped ${skipped}. Total products in DB: ${totalInDb}`);
  } else {
    console.log(`\nWould insert ${inserted} products`);
  }

  return { inserted, skipped, totalInDb };
};
