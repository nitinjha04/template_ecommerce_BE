import * as fs from 'fs';
import * as path from 'path';
import { Product } from '../../models';
import { mergeStoreFilter } from '../../utils/storeScope';
import { imageDedupeKey } from '../argen-style/image-utils';
import { fetchCatalogCount, fetchProductPool } from './api-client';
import type { NexaCategoryScrapeConfig } from './category-config';
import { normalizeSort } from '../nykaa/category-config';
import { importManifest } from './import-manifest';
import { mapNexaToProductDocument, productImageKeys } from './map-product';
import { randomPriceInRange } from '../nykaa/price-quota';
import type { NexaProductRaw, NexaScrapeManifest, ScrapedProductDocument } from './types';

const DEFAULT_LIMIT = 50;

export type ScrapeJobOptions = {
  maxPages?: number;
  dryRun?: boolean;
  jsonOnly?: boolean;
  skipConnect?: boolean;
  outputPath?: string;
  storeId: string;
  usedProductIds?: Set<string>;
  usedImageKeys?: Set<string>;
};

export type ScrapeJobResult = {
  categoryName: string;
  categoryFilter: string;
  categorySlug: string;
  status: 'success' | 'failed' | 'partial' | 'skipped';
  requested: number;
  scraped: number;
  inserted: number;
  skipped: number;
  priceMin: number;
  priceMax: number;
  sort: string;
  outputPath?: string;
  error?: string;
};

const defaultOutputPath = (
  category: string,
  priceMin: number,
  priceMax: number
): string => {
  const safe = category.toLowerCase().replace(/[^\w-]+/g, '-');
  return path.join(__dirname, '../output', `nexa-${safe}-${priceMin}-${priceMax}.json`);
};

export const resolveLimit = (config: NexaCategoryScrapeConfig): number =>
  config.limit !== undefined && config.limit > 0 ? Math.floor(config.limit) : DEFAULT_LIMIT;

export const loadStoreImageKeys = async (storeId: string): Promise<Set<string>> => {
  const rows = await Product.find(mergeStoreFilter({}, storeId))
    .select('images')
    .lean<{ images?: string[] }[]>();

  const keys = new Set<string>();
  for (const row of rows) {
    for (const url of row.images ?? []) {
      if (url) keys.add(imageDedupeKey(url));
    }
  }
  return keys;
};

const shouldSkipProduct = (
  raw: NexaProductRaw,
  usedProductIds: Set<string>,
  usedImageKeys: Set<string>
): string | null => {
  const id = raw.uniqueId?.trim();
  if (!id) return 'missing-id';
  if (usedProductIds.has(id)) return 'duplicate-id';

  const keys = productImageKeys(raw);
  if (keys.length === 0) return 'no-images';

  for (const key of keys) {
    if (usedImageKeys.has(key)) return 'duplicate-image';
  }

  return null;
};

const markAccepted = (
  raw: NexaProductRaw,
  usedProductIds: Set<string>,
  usedImageKeys: Set<string>
): void => {
  const id = raw.uniqueId?.trim();
  if (id) usedProductIds.add(id);
  for (const key of productImageKeys(raw)) {
    usedImageKeys.add(key);
  }
};

export const runScrapeJob = async (
  config: NexaCategoryScrapeConfig,
  options: ScrapeJobOptions
): Promise<ScrapeJobResult> => {
  const sort = normalizeSort(config.sort);
  const needed = resolveLimit(config);
  const maxPages = options.maxPages ?? 60;
  const usedProductIds = options.usedProductIds ?? new Set<string>();
  const usedImageKeys = options.usedImageKeys ?? new Set<string>();

  const base: ScrapeJobResult = {
    categoryName: config.categoryName,
    categoryFilter: config.categorySlug,
    categorySlug: config.categorySlug,
    status: 'failed',
    requested: needed,
    scraped: 0,
    inserted: 0,
    skipped: 0,
    priceMin: config.priceMin,
    priceMax: config.priceMax,
    sort,
  };

  try {
    console.log('\n' + '─'.repeat(50));
    console.log(
      `▶ ${config.categoryName} (${config.categorySlug}) | ₹${config.priceMin}–${config.priceMax} | limit ${needed} | sort ${sort}`
    );

    const catalogCount = await fetchCatalogCount(config.categorySlug);
    console.log(`  Catalog available: ${catalogCount}`);

    if (catalogCount < needed) {
      console.warn(
        `  Skipped — catalog has ${catalogCount} products, need ${needed} (no partial import)`
      );
      base.status = 'skipped';
      base.error = `Insufficient catalog (${catalogCount} < ${needed})`;
      return base;
    }

    const { products: pool, pagesFetched, catalogTotal } = await fetchProductPool({
      categorySlug: config.categorySlug,
      needed: needed + 30,
      maxPages,
      sort,
      onPage: (page, batch, total, catalog) => {
        console.log(`  page ${page}: +${batch} (pool ${total} / catalog ${catalog})`);
      },
    });

    console.log(`  Fetched pool ${pool.length} (${pagesFetched} page(s), catalog ${catalogTotal})`);

    const documents: ScrapedProductDocument[] = [];
    let poolIndex = 0;
    let rejectCount = 0;

    while (documents.length < needed && poolIndex < pool.length) {
      const raw = pool[poolIndex];
      poolIndex += 1;

      const reject = shouldSkipProduct(raw, usedProductIds, usedImageKeys);
      if (reject) {
        rejectCount += 1;
        continue;
      }

      const assignedPrice = randomPriceInRange(config.priceMin, config.priceMax);
      const doc = mapNexaToProductDocument(raw, {
        categoryName: config.categoryName,
        categorySlug: config.categorySlug,
        assignedPrice,
        index: documents.length,
      });

      if (!doc) {
        rejectCount += 1;
        continue;
      }

      markAccepted(raw, usedProductIds, usedImageKeys);
      documents.push(doc);
    }

    if (documents.length < needed) {
      console.warn(`  Warning: only ${documents.length} accepted (${rejectCount} skipped in pool)`);
    }

    const outputPath =
      options.outputPath ??
      defaultOutputPath(config.categoryName, config.priceMin, config.priceMax);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const manifest: NexaScrapeManifest = {
      scrapedAt: new Date().toISOString(),
      categoryFilter: config.categorySlug,
      categoryName: config.categoryName,
      categorySlug: config.categorySlug,
      storeId: options.storeId,
      storeDomain: 'nexa-skyline.com',
      priceMin: config.priceMin,
      priceMax: config.priceMax,
      categoryId: config.categorySlug,
      priceMode: 'random',
      sort,
      totalProducts: documents.length,
      pagesFetched,
      products: documents,
    };

    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`  Saved JSON: ${outputPath}`);

    base.scraped = documents.length;
    base.outputPath = outputPath;

    if (options.jsonOnly) {
      base.status =
        documents.length >= needed ? 'success' : documents.length > 0 ? 'partial' : 'failed';
      if (base.status === 'failed') base.error = 'No products scraped';
      return base;
    }

    if (documents.length === 0) {
      base.error = 'No products to import';
      return base;
    }

    const importResult = await importManifest(manifest, {
      dryRun: options.dryRun,
      skipConnect: options.skipConnect,
    });

    base.inserted = importResult.inserted;
    base.skipped = importResult.skipped;

    if (importResult.inserted === 0 && documents.length > 0) {
      base.status = 'failed';
      base.error = 'All products skipped during import';
    } else if (importResult.inserted < needed) {
      base.status = 'partial';
    } else {
      base.status = 'success';
    }

    return base;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${config.categoryName} failed: ${base.error}`);
    return base;
  }
};
