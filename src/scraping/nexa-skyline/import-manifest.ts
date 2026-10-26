import { connectDB } from '../../config/db';
import { runWithStoreContext } from '../../context/store.context';
import { Product } from '../../models';
import { CategoryService } from '../../services/category.service';
import { slugify } from '../../utils/slug';
import { mergeStoreFilter, withStoreId } from '../../utils/storeScope';
import { NEXA_STORE_DOMAIN } from './constants';
import { sanitizeScrapedProduct } from './sanitize-brand';
import type { NexaScrapeManifest, ScrapedProductDocument } from './types';

const toDbDoc = (p: ScrapedProductDocument, slug: string) => {
  const { _source: _omit, deliveryStartDate, deliveryEndDate, ...rest } = p;
  return {
    ...rest,
    slug,
    deliveryStartDate: new Date(deliveryStartDate),
    deliveryEndDate: new Date(deliveryEndDate),
  };
};

const uniqueSlugForStore = async (base: string, storeId: string): Promise<string> => {
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

export type ImportManifestResult = {
  inserted: number;
  skipped: number;
  totalInDb?: number;
};

export const importManifest = async (
  manifest: NexaScrapeManifest,
  options: { dryRun?: boolean; skipConnect?: boolean } = {}
): Promise<ImportManifestResult> => {
  const { products, categoryName, categorySlug, storeId } = manifest;
  const dryRun = options.dryRun === true;

  console.log(
    `\nImporting ${products.length} products (${categoryName}, ${categorySlug}) → ${NEXA_STORE_DOMAIN}…`
  );
  if (dryRun) console.log('DRY RUN — no database writes\n');

  const runImport = async (): Promise<ImportManifestResult> => {
    if (!dryRun && !options.skipConnect) {
      await connectDB();
    }

    let resolvedCategory = categoryName.trim();
    if (!dryRun) {
      resolvedCategory = await CategoryService.resolveProductCategory(categoryName.trim());
      console.log(`Category "${resolvedCategory}" is ready.`);
    }

    let inserted = 0;
    let skipped = 0;

    for (const product of products) {
      const baseSlug = product.slug.trim().toLowerCase();
      if (!baseSlug) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        inserted += 1;
        continue;
      }

      const cleaned = sanitizeScrapedProduct({ ...product, category: resolvedCategory });
      const slug = await uniqueSlugForStore(cleaned.slug, storeId);
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
      storeSlug: 'nexa-skyline',
      storeDomain: NEXA_STORE_DOMAIN,
      storeName: 'Nexa Skyline',
    },
    runImport
  );
};
