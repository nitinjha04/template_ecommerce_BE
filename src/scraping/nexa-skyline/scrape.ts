/**
 * Scrape Nexa Skyline (Landmark Max / Unbxd API) → JSON → MongoDB.
 *
 *   npm run scrape:nexa:all
 *   npm run scrape:nexa -- --category-slug maxwomen-ethnicwear-tops --category tops --price-min 400 --price-max 499
 */
import * as path from 'path';
import { connectDB } from '../../config/db';
import { runWithStoreContext } from '../../context/store.context';
import {
  loadCategoryConfigFile,
  type NexaCategoryScrapeConfig,
} from './category-config';
import { normalizeSort } from '../nykaa/category-config';
import { ensureNexaStore } from './ensure-store';
import { loadStoreImageKeys, runScrapeJob } from './scrape-job';
import {
  buildBatchReport,
  printBatchSummary,
  saveBatchReport,
} from '../nykaa/run-report';

const parseArgs = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
};

const requireArg = (args: Record<string, string>, key: string): string => {
  const v = args[key]?.trim();
  if (!v) {
    console.error(`Missing required flag: --${key}`);
    process.exit(1);
  }
  return v;
};

const configFromCliArgs = (args: Record<string, string>): NexaCategoryScrapeConfig => ({
  categorySlug: requireArg(args, 'category-slug'),
  categoryName: requireArg(args, 'category'),
  priceMin: Number(requireArg(args, 'price-min')),
  priceMax: Number(requireArg(args, 'price-max')),
  limit: args.limit?.trim() ? Number(args.limit) : undefined,
  sort: normalizeSort(args.sort),
});

const main = async (): Promise<void> => {
  const args = parseArgs();
  const dryRun = args['dry-run'] === 'true';
  const jsonOnly = args['json-only'] === 'true';
  const maxPages = Number(args['max-pages'] ?? '60');
  const configPath = args.config?.trim();

  await connectDB();
  const storeId = await ensureNexaStore();
  const usedProductIds = new Set<string>();
  const usedImageKeys = await loadStoreImageKeys(storeId);

  console.log(`Nexa Skyline store: ${storeId} (nexa-skyline.com)`);
  console.log(`Existing product images in DB: ${usedImageKeys.size}`);

  const shared = {
    dryRun,
    jsonOnly,
    maxPages,
    storeId,
    usedProductIds,
    usedImageKeys,
    skipConnect: true,
  };

  const runBatch = async (absConfig: string): Promise<void> => {
    const categories = loadCategoryConfigFile(absConfig);
    const startedAt = new Date();
    const results = [];

    for (const config of categories) {
      const result = await runWithStoreContext(
        {
          storeId,
          storeSlug: 'nexa-skyline',
          storeDomain: 'nexa-skyline.com',
          storeName: 'Nexa Skyline',
        },
        () => runScrapeJob(config, shared)
      );
      results.push(result);
    }

    const report = buildBatchReport(absConfig, startedAt, results);
    const reportPath = saveBatchReport(report);
    printBatchSummary(report, reportPath);

    if (report.totals.failed > 0) process.exit(1);
  };

  if (configPath || args.all === 'true') {
    await runBatch(configPath ?? path.join(__dirname, 'categories.example.json'));
    return;
  }

  if (!args['category-slug']) {
    console.error(
      'Usage:\n' +
        '  npm run scrape:nexa:all\n' +
        '  npm run scrape:nexa -- --category-slug maxwomen-ethnicwear-tops --category tops --price-min 400 --price-max 499'
    );
    process.exit(1);
  }

  const config = configFromCliArgs(args);
  const result = await runWithStoreContext(
    {
      storeId,
      storeSlug: 'nexa-skyline',
      storeDomain: 'nexa-skyline.com',
      storeName: 'Nexa Skyline',
    },
    () => runScrapeJob(config, shared)
  );

  const report = buildBatchReport('single CLI run', new Date(), [result]);
  printBatchSummary(report, saveBatchReport(report));

  if (result.status === 'failed') process.exit(1);
};

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
