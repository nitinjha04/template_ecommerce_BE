import * as fs from 'fs';
import * as path from 'path';
import { fetchProductPool } from './api-client';
import type { EmpressCategoryScrapeConfig, EmpressSortOrder } from './category-config';
import { normalizeSort } from './category-config';
import { EMPRESS_STORE_ID } from './constants';
import { importManifest } from './import-manifest';
import { mapEmpressToProductDocument } from './map-empress-product';
import { randomPriceInRange } from '../nykaa/price-quota';
import type { EmpressProductRaw, EmpressScrapeManifest } from './types';

const DEFAULT_LIMIT = 15;

export type ScrapeJobOptions = {
  maxPages?: number;
  fromRaw?: string;
  dryRun?: boolean;
  jsonOnly?: boolean;
  skipConnect?: boolean;
  outputPath?: string;
  storeId?: string;
};

export type ScrapeJobResult = {
  categoryName: string;
  /** Alias for run-report compatibility. */
  categoryFilter: string;
  collectionHandle: string;
  status: 'success' | 'failed' | 'partial';
  requested: number;
  scraped: number;
  inserted: number;
  skipped: number;
  priceMin: number;
  priceMax: number;
  sort: EmpressSortOrder;
  outputPath?: string;
  error?: string;
};

const defaultOutputPath = (
  category: string,
  priceMin: number,
  priceMax: number
): string => {
  const safe = category.toLowerCase().replace(/[^\w-]+/g, '-');
  return path.join(__dirname, '../output', `empress-${safe}-${priceMin}-${priceMax}.json`);
};

const loadRawPool = (filePath: string): EmpressProductRaw[] => {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as unknown;

  if (Array.isArray(parsed)) return parsed as EmpressProductRaw[];

  if (
    parsed &&
    typeof parsed === 'object' &&
    'products' in parsed &&
    Array.isArray((parsed as { products: unknown }).products)
  ) {
    const inner = (parsed as { products: unknown[] }).products;
    if (inner.length > 0 && inner[0] && typeof inner[0] === 'object' && 'title' in (inner[0] as object)) {
      return inner as EmpressProductRaw[];
    }
    return (parsed as { products: EmpressProductRaw[] }).products;
  }

  throw new Error('Raw file must be a product array or scrape manifest JSON');
};

export const resolveLimit = (config: EmpressCategoryScrapeConfig): number =>
  config.limit !== undefined && config.limit > 0 ? Math.floor(config.limit) : DEFAULT_LIMIT;

export const runScrapeJob = async (
  config: EmpressCategoryScrapeConfig,
  options: ScrapeJobOptions = {}
): Promise<ScrapeJobResult> => {
  const sort = normalizeSort(config.sort);
  const needed = resolveLimit(config);
  const maxPages = options.maxPages ?? 20;
  const storeId = options.storeId?.trim() || EMPRESS_STORE_ID;

  const base: ScrapeJobResult = {
    categoryName: config.categoryName,
    categoryFilter: config.collectionHandle,
    collectionHandle: config.collectionHandle,
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
      `▶ ${config.categoryName} (${config.collectionHandle}) | ₹${config.priceMin}–${config.priceMax} | limit ${needed} | sort ${sort}`
    );

    let pool: EmpressProductRaw[];
    let pagesFetched = 0;

    if (options.fromRaw) {
      pool = loadRawPool(options.fromRaw);
      console.log(`  Loaded ${pool.length} products from raw file`);
    } else {
      const result = await fetchProductPool({
        collectionHandle: config.collectionHandle,
        needed: needed + 10,
        maxPages: Number.isFinite(maxPages) ? maxPages : 20,
        sort,
        onPage: (page, batch, total) => {
          console.log(`  page ${page}: +${batch} (pool ${total})`);
        },
      });
      pool = result.products;
      pagesFetched = result.pagesFetched;
      console.log(`  Fetched ${pool.length} unique products (${pagesFetched} page(s))`);
    }

    if (pool.length < needed) {
      console.warn(`  Warning: only ${pool.length} in pool; wanted ${needed}`);
    }

    const usedIds = new Set<string>();
    const documents: EmpressScrapeManifest['products'] = [];
    let poolIndex = 0;

    const takeNext = (): EmpressProductRaw | null => {
      while (poolIndex < pool.length) {
        const raw = pool[poolIndex];
        poolIndex += 1;
        const id = String(raw.id ?? '').trim();
        if (!id || usedIds.has(id)) continue;
        usedIds.add(id);
        return raw;
      }
      return null;
    };

    for (let i = 0; i < needed; i += 1) {
      const raw = takeNext();
      if (!raw) break;

      const assignedPrice = randomPriceInRange(config.priceMin, config.priceMax);
      const doc = mapEmpressToProductDocument(raw, {
        categoryName: config.categoryName,
        collectionHandle: config.collectionHandle,
        assignedPrice,
        index: i,
      });

      if (!doc) {
        i -= 1;
        continue;
      }

      documents.push(doc);
    }

    const outputPath =
      options.outputPath ??
      defaultOutputPath(config.categoryName, config.priceMin, config.priceMax);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const manifest: EmpressScrapeManifest = {
      scrapedAt: new Date().toISOString(),
      categoryFilter: config.collectionHandle,
      categoryName: config.categoryName,
      collectionHandle: config.collectionHandle,
      collectionUrl: config.collectionUrl ?? '',
      priceMin: config.priceMin,
      priceMax: config.priceMax,
      categoryId: config.collectionHandle,
      storeId,
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
      storeId,
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
