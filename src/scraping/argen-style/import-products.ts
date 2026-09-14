import { connectDB } from '../../config/db';
import { runWithStoreContext } from '../../context/store.context';
import { Product } from '../../models';
import { CategoryService } from '../../services/category.service';
import { slugify } from '../../utils/slug';
import { mergeStoreFilter, withStoreId } from '../../utils/storeScope';
import type { ScrapedProductDocument } from '../nykaa/types';
import { sanitizeScrapedProduct } from './sanitize-brand';

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

export type ImportProductsResult = {
  inserted: number;
  skipped: number;
};

export const importProducts = async (
  products: ScrapedProductDocument[],
  options: {
    storeId: string;
    dryRun?: boolean;
    skipConnect?: boolean;
  }
): Promise<ImportProductsResult> => {
  const dryRun = options.dryRun === true;
  const storeId = options.storeId;

  const run = async (): Promise<ImportProductsResult> => {
    if (!dryRun && !options.skipConnect) {
      await connectDB();
    }

    const categoryCache = new Map<string, string>();
    let inserted = 0;
    let skipped = 0;

    for (const product of products) {
      const baseSlug = product.slug.trim().toLowerCase();
      if (!baseSlug) {
        skipped += 1;
        continue;
      }

      let resolvedCategory = categoryCache.get(product.category);
      if (!resolvedCategory) {
        if (dryRun) {
          resolvedCategory = product.category;
        } else {
          resolvedCategory = await CategoryService.resolveProductCategory(product.category);
        }
        categoryCache.set(product.category, resolvedCategory);
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
      } catch {
        skipped += 1;
      }
    }

    return { inserted, skipped };
  };

  return runWithStoreContext(
    {
      storeId,
      storeSlug: 'argenstyle',
      storeDomain: 'argenstyle.vercel.app',
      storeName: 'Argen Style',
    },
    run
  );
};
