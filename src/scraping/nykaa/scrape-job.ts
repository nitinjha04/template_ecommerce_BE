import * as fs from 'fs';
import * as path from 'path';
import { fetchProductPool } from './api-client';
import type { CategoryScrapeConfig, NykaaSortOrder } from './category-config';
import { normalizeSort } from './category-config';
import { importManifest } from './import-manifest';
import { mapNykaaToProductDocument } from './map-nykaa-product';
import { randomPriceInRange } from './price-quota';
import type { NykaaProductRaw, ScrapeManifest } from './types';

const DEFAULT_LIMIT = 50;
const DEFAULT_CATEGORY_ID = '6557';

export type ScrapeJobOptions = {
  maxPages?: number;
  fromRaw?: string;
  dryRun?: boolean;
  jsonOnly?: boolean;
  skipConnect?: boolean;
  outputPath?: string;
};

export type ScrapeJobResult = {
  categoryName: string;
  categoryFilter: string;
  status: 'success' | 'failed' | 'partial';
  requested: number;
  scraped: number;
  inserted: number;
  skipped: number;
  priceMin: number;
  priceMax: number;
  sort: NykaaSortOrder;
  outputPath?: string;
  error?: string;
};

const defaultOutputPath = (
  category: string,
  priceMin: number,
  priceMax: number
): string => {
  const safe = category.toLowerCase().replace(/[^\w-]+/g, '-');
  return path.join(__dirname, '../output', `${safe}-${priceMin}-${priceMax}.json`);
};

const loadRawPool = (filePath: string): NykaaProductRaw[] => {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as unknown;

  if (Array.isArray(parsed)) return parsed as NykaaProductRaw[];

  if (
    parsed &&
    typeof parsed === 'object' &&
    'response' in parsed &&
    (parsed as { response?: { products?: NykaaProductRaw[] } }).response?.products
  ) {
    return (parsed as { response: { products: NykaaProductRaw[] } }).response.products;
  }

  throw new Error('Raw file must be a product array or full Nykaa API response object');
};

export const resolveLimit = (config: CategoryScrapeConfig): number =>
  config.limit !== undefined && config.limit > 0 ? Math.floor(config.limit) : DEFAULT_LIMIT;

export const runScrapeJob = async (
  config: CategoryScrapeConfig,
  options: ScrapeJobOptions = {}
): Promise<ScrapeJobResult> => {
  const sort = normalizeSort(config.sort);
  const categoryId = config.categoryId?.trim() || DEFAULT_CATEGORY_ID;
  const needed = resolveLimit(config);
  const maxPages = options.maxPages ?? 40;

  const base: ScrapeJobResult = {
    categoryName: config.categoryName,
    categoryFilter: config.categoryFilter,
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
      `▶ ${config.categoryName} (filter ${config.categoryFilter}) | ₹${config.priceMin}–${config.priceMax} | limit ${needed} | sort ${sort}`
    );

    let pool: NykaaProductRaw[];
    let pagesFetched = 0;

    if (options.fromRaw) {
      pool = loadRawPool(options.fromRaw);
      console.log(`  Loaded ${pool.length} products from raw file`);
    } else {
      const result = await fetchProductPool({
        categoryFilter: config.categoryFilter,
        categoryId,
        needed: needed + 20,
        maxPages: Number.isFinite(maxPages) ? maxPages : 40,
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
    const documents: ScrapeManifest['products'] = [];
    let poolIndex = 0;

    const takeNext = (): NykaaProductRaw | null => {
      while (poolIndex < pool.length) {
        const raw = pool[poolIndex];
        poolIndex += 1;
        const id = raw.id?.trim();
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
      const doc = mapNykaaToProductDocument(raw, {
        categoryName: config.categoryName,
        categoryFilter: config.categoryFilter,
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

    const manifest: ScrapeManifest = {
      scrapedAt: new Date().toISOString(),
      categoryFilter: config.categoryFilter,
      categoryName: config.categoryName,
      priceMin: config.priceMin,
      priceMax: config.priceMax,
      categoryId,
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
      base.status = documents.length >= needed ? 'success' : documents.length > 0 ? 'partial' : 'failed';
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
