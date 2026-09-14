import * as fs from 'fs';
import * as path from 'path';
import { connectDB } from '../../config/db';
import { fetchCategoryProductsPage } from '../nykaa/api-client';
import { randomPriceInRange } from '../nykaa/price-quota';
import type { ScrapedProductDocument } from '../nykaa/types';
import type { CategoryIdMap } from './resolve-category';
import { loadCategoryMap, resolveCategoryFromProduct } from './resolve-category';
import { mapArgenProduct } from './map-product';
import { collectArgenImages } from './product-filters';
import type { PoolScrapeConfig } from './pool-config';
import { totalProductsNeeded } from './pool-config';
import { ScrapeSession } from './scrape-session';
import { importProducts } from './import-products';

export type BandResult = {
  priceMin: number;
  priceMax: number;
  requested: number;
  scraped: number;
  inserted: number;
  skipped: number;
  products: ScrapedProductDocument[];
  outputPath?: string;
};

export type PoolScrapeResult = {
  status: 'success' | 'partial' | 'failed';
  pagesFetched: number;
  totalRequested: number;
  totalScraped: number;
  totalInserted: number;
  rejectStats: Record<string, number>;
  bands: BandResult[];
  error?: string;
};

type ActiveBand = PoolScrapeConfig['priceBands'][number] & {
  filled: number;
  products: ScrapedProductDocument[];
};

const OUTPUT_DIR = path.join(__dirname, '../output');

const bandOutputPath = (priceMin: number, priceMax: number): string =>
  path.join(OUTPUT_DIR, `argen-pool-${priceMin}-${priceMax}.json`);

const allBandsFull = (bands: ActiveBand[]): boolean =>
  bands.every((b) => b.filled >= b.limit);

export const runPoolScrape = async (
  config: PoolScrapeConfig,
  categoryMap: CategoryIdMap,
  options: {
    maxPages?: number;
    dryRun?: boolean;
    jsonOnly?: boolean;
    blocklistPath?: string;
    skipConnect?: boolean;
  } = {}
): Promise<PoolScrapeResult> => {
  const maxPages = options.maxPages ?? 200;
  const rejectStats: Record<string, number> = {};
  const bumpReject = (reason: string) => {
    rejectStats[reason] = (rejectStats[reason] ?? 0) + 1;
  };

  const bands: ActiveBand[] = config.priceBands.map((b) => ({
    ...b,
    filled: 0,
    products: [],
  }));

  let currentBandIndex = 0;
  let pagesFetched = 0;
  const seenPageIds = new Set<string>();

  try {
    if (!options.skipConnect) {
      await connectDB();
    }

    const session = await ScrapeSession.create(config.storeId, options.blocklistPath);
    const needed = totalProductsNeeded(config);

    console.log(
      `\nArgen Style pool scrape | store ${config.storeId}\n` +
        `Filter: ${config.categoryFilter}\n` +
        `Target: ${needed} products across ${bands.length} price bands (₹${bands[0].priceMin}–${bands[bands.length - 1].priceMax})\n`
    );

    for (let page = 1; page <= maxPages; page += 1) {
      if (allBandsFull(bands)) break;

      const batch = await fetchCategoryProductsPage({
        categoryFilter: config.categoryFilter,
        categoryId: config.categoryId,
        currentPage: page,
        pageSize: config.pageSize,
        sort: config.sort,
      });
      pagesFetched = page;

      if (batch.length === 0) {
        console.log(`  page ${page}: empty — stopping`);
        break;
      }

      let acceptedThisPage = 0;

      for (const raw of batch) {
        if (allBandsFull(bands)) break;

        const pageId = raw.id?.trim();
        if (!pageId || seenPageIds.has(pageId)) continue;
        seenPageIds.add(pageId);

        while (currentBandIndex < bands.length && bands[currentBandIndex].filled >= bands[currentBandIndex].limit) {
          currentBandIndex += 1;
        }
        if (currentBandIndex >= bands.length) break;

        const band = bands[currentBandIndex];

        const reject = session.rejectReason(raw);
        if (reject) {
          bumpReject(reject);
          continue;
        }

        const categoryName = resolveCategoryFromProduct(raw, categoryMap);
        if (!categoryName) {
          bumpReject('no-category');
          continue;
        }

        const assignedPrice = randomPriceInRange(band.priceMin, band.priceMax);
        const doc = mapArgenProduct(raw, {
          categoryName,
          categoryFilter: config.categoryFilter,
          assignedPrice,
          index: band.filled,
        });

        if (!doc) {
          bumpReject('map-failed');
          continue;
        }

        const images = collectArgenImages(raw);
        session.markAccepted(raw, images);
        band.products.push(doc);
        band.filled += 1;
        acceptedThisPage += 1;
      }

      const scraped = bands.reduce((s, b) => s + b.filled, 0);
      console.log(
        `  page ${page}: batch ${batch.length} | +${acceptedThisPage} accepted | total ${scraped}/${needed}`
      );

      if (batch.length < config.pageSize) break;
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const bandResults: BandResult[] = [];
    let totalInserted = 0;

    for (const band of bands) {
      const outputPath = bandOutputPath(band.priceMin, band.priceMax);
      const manifest = {
        scrapedAt: new Date().toISOString(),
        storeId: config.storeId,
        categoryFilter: config.categoryFilter,
        categoryName: 'pool-mixed',
        priceMin: band.priceMin,
        priceMax: band.priceMax,
        categoryId: config.categoryId,
        priceMode: 'random' as const,
        sort: config.sort,
        totalProducts: band.products.length,
        pagesFetched,
        products: band.products,
      };

      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');

      let inserted = 0;
      let skipped = 0;

      if (!options.jsonOnly && band.products.length > 0) {
        const importResult = await importProducts(band.products, {
          storeId: config.storeId,
          dryRun: options.dryRun,
          skipConnect: true,
        });
        inserted = importResult.inserted;
        skipped = importResult.skipped;
      } else if (options.dryRun) {
        inserted = band.products.length;
      }

      totalInserted += inserted;

      bandResults.push({
        priceMin: band.priceMin,
        priceMax: band.priceMax,
        requested: band.limit,
        scraped: band.products.length,
        inserted,
        skipped,
        products: band.products,
        outputPath,
      });

      console.log(
        `  band ₹${band.priceMin}–${band.priceMax}: ${band.products.length}/${band.limit} scraped` +
          (options.jsonOnly ? '' : `, ${inserted} inserted`)
      );
    }

    const totalScraped = bandResults.reduce((s, b) => s + b.scraped, 0);
    const totalRequested = bandResults.reduce((s, b) => s + b.requested, 0);

    console.log('\nReject summary:', rejectStats);

    let status: PoolScrapeResult['status'] = 'success';
    if (totalScraped === 0) status = 'failed';
    else if (totalScraped < totalRequested) status = 'partial';

    return {
      status,
      pagesFetched,
      totalRequested,
      totalScraped,
      totalInserted,
      rejectStats,
      bands: bandResults,
    };
  } catch (err) {
    return {
      status: 'failed',
      pagesFetched,
      totalRequested: totalProductsNeeded(config),
      totalScraped: 0,
      totalInserted: 0,
      rejectStats,
      bands: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

export const loadCategoryMapFile = (filePath?: string): CategoryIdMap => {
  const abs = path.resolve(filePath?.trim() || path.join(__dirname, 'category-map.json'));
  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as CategoryIdMap;
  return loadCategoryMap(parsed);
};
