import { connectDB } from '../../config/db';
import { runWithStoreContext } from '../../context/store.context';
import { Product } from '../../models';
import { CategoryService } from '../../services/category.service';
import { slugify } from '../../utils/slug';
import { mergeStoreFilter, withStoreId } from '../../utils/storeScope';
import { EMPRESS_STORE_ID } from './constants';
import { sanitizeScrapedProduct } from './sanitize-brand';
import type { EmpressScrapeManifest, EmpressScrapedProductDocument } from './types';

const toDbDoc = (p: EmpressScrapedProductDocument, slug: string) => {
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

const uniqueSlugForStore = async (
  base: string,
  storeId: string
): Promise<string> => {
  const root = slugify(base) || 'product';
  let attempt = 0;

  while (attempt < 100) {
    const candidate = attempt === 0 ? root : `${root}-${attempt}`;
    const exists = await Product.findOne(
      mergeStoreFilter({ slug: candidate }, storeId)
    )
      .select('_id')
      .lean();
    if (!exists) return candidate;
    attempt += 1;
  }

  return `${root}-${Date.now()}`;
};

export const importManifest = async (
  manifest: EmpressScrapeManifest,
  options: { dryRun?: boolean; skipConnect?: boolean; storeId?: string } = {}
): Promise<ImportManifestResult> => {
  const storeId = options.storeId?.trim() || manifest.storeId || EMPRESS_STORE_ID;
  const { products, categoryName, collectionHandle } = manifest;
  const dryRun = options.dryRun === true;

  console.log(
    `\nImporting ${products.length} products (${categoryName}, ${collectionHandle}) → store ${storeId}…`
  );
  if (dryRun) console.log('DRY RUN — no database writes\n');

  const runImport = async (): Promise<ImportManifestResult> => {
    if (!dryRun && !options.skipConnect) {
      await connectDB();
    }

    const cleanCategoryName = categoryName.trim();
    let resolvedCategory = cleanCategoryName;

    if (!dryRun) {
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
      const slug = await uniqueSlugForStore(cleaned.slug.trim().toLowerCase(), storeId);
      const doc = withStoreId(toDbDoc(cleaned, slug), storeId);

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
      totalInDb = await Product.countDocuments({ store: storeId });
      console.log(`\nInserted ${inserted}, skipped ${skipped}. Store products: ${totalInDb}`);
    } else {
      console.log(`\nWould insert ${inserted} products`);
    }

    return { inserted, skipped, totalInDb };
  };

  return runWithStoreContext(
    {
      storeId,
      storeSlug: 'empress-import',
      storeDomain: 'empress-clothing.com',
      storeName: 'Empress Import',
    },
    runImport
  );
};
