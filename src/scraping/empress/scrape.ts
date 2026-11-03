/**
 * Scrape Empress Clothing (Shopify) → JSON → MongoDB.
 *
 * All categories (₹1000–₹7000 tiers, 15 products each):
 *   npm run scrape:empress:all
 *
 * Single collection:
 *   npm run scrape:empress -- --collection indo-western-wear --category "indo western wear" --price-min 1000 --price-max 1499 --limit 15
 */
import * as path from 'path';
import { connectDB } from '../../config/db';
import { runWithStoreContext } from '../../context/store.context';
import {
  loadCategoryConfigFile,
  normalizeSort,
  type EmpressCategoryScrapeConfig,
} from './category-config';
import { EMPRESS_STORE_ID } from './constants';
import {
  buildBatchReport,
  printBatchSummary,
  saveBatchReport,
} from '../nykaa/run-report';
import { runScrapeJob } from './scrape-job';

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

const configFromCliArgs = (args: Record<string, string>): EmpressCategoryScrapeConfig => {
  const handle = requireArg(args, 'collection');
  return {
    collectionHandle: handle,
    collectionUrl: `https://empress-clothing.com/collections/${handle}`,
    categoryName: requireArg(args, 'category'),
    priceMin: Number(requireArg(args, 'price-min')),
    priceMax: Number(requireArg(args, 'price-max')),
    limit: args.limit?.trim() ? Number(args.limit) : undefined,
    sort: normalizeSort(args.sort),
  };
};

const runBatch = async (
  configPath: string,
  options: {
    dryRun: boolean;
    jsonOnly: boolean;
    maxPages: number;
    fromRaw?: string;
    storeId: string;
  }
): Promise<void> => {
  const absConfig = path.resolve(configPath);
  const categories = loadCategoryConfigFile(absConfig);
  const startedAt = new Date();

  console.log(`Running ${categories.length} Empress categories from:\n  ${absConfig}`);
  console.log(`Store ID: ${options.storeId}\n`);

  if (!options.dryRun && !options.jsonOnly) {
    await connectDB();
  }

  const results = [];
  for (const config of categories) {
    const result = await runWithStoreContext(
      {
        storeId: options.storeId,
        storeSlug: 'empress-import',
        storeDomain: 'empress-clothing.com',
        storeName: 'Empress Import',
      },
      () =>
        runScrapeJob(config, {
          dryRun: options.dryRun,
          jsonOnly: options.jsonOnly,
          maxPages: options.maxPages,
          fromRaw: options.fromRaw,
          skipConnect: !options.dryRun && !options.jsonOnly,
          storeId: options.storeId,
        })
    );
    results.push(result);
  }

  const report = buildBatchReport(absConfig, startedAt, results);
  const reportPath = saveBatchReport(report);
  printBatchSummary(report, reportPath);

  if (report.totals.failed > 0) {
    process.exit(1);
  }
};

const runSingle = async (
  config: EmpressCategoryScrapeConfig,
  options: {
    dryRun: boolean;
    jsonOnly: boolean;
    maxPages: number;
    fromRaw?: string;
    output?: string;
    storeId: string;
  }
): Promise<void> => {
  if (!options.dryRun && !options.jsonOnly) {
    await connectDB();
  }

  const result = await runWithStoreContext(
    {
      storeId: options.storeId,
      storeSlug: 'empress-import',
      storeDomain: 'empress-clothing.com',
      storeName: 'Empress Import',
    },
    () =>
      runScrapeJob(config, {
        dryRun: options.dryRun,
        jsonOnly: options.jsonOnly,
        maxPages: options.maxPages,
        fromRaw: options.fromRaw,
        outputPath: options.output,
        skipConnect: false,
        storeId: options.storeId,
      })
  );

  const report = buildBatchReport('single CLI run', new Date(), [result]);
  const reportPath = saveBatchReport(report);
  printBatchSummary(report, reportPath);

  if (result.status === 'failed') {
    process.exit(1);
  }
};

const main = async (): Promise<void> => {
  const args = parseArgs();
  const dryRun = args['dry-run'] === 'true';
  const jsonOnly = args['json-only'] === 'true';
  const maxPages = Number(args['max-pages'] ?? '20');
  const fromRaw = args['from-raw']?.trim();
  const configPath = args.config?.trim();
  const storeId = args['store-id']?.trim() || EMPRESS_STORE_ID;

  const shared = { dryRun, jsonOnly, maxPages, fromRaw, storeId };

  if (configPath || args.all === 'true') {
    await runBatch(
      configPath ?? path.join(__dirname, 'categories.example.json'),
      shared
    );
    return;
  }

  if (!args.collection) {
    console.error(
      'Usage:\n' +
        '  npm run scrape:empress:all\n' +
        '  npm run scrape:empress -- --config src/scraping/empress/categories.example.json\n' +
        '  npm run scrape:empress -- --collection sarees --category sarees --price-min 1000 --price-max 1499'
    );
    process.exit(1);
  }

  const config = configFromCliArgs(args);

  if (
    !Number.isFinite(config.priceMin) ||
    !Number.isFinite(config.priceMax) ||
    config.priceMin > config.priceMax
  ) {
    console.error('Invalid --price-min / --price-max');
    process.exit(1);
  }

  await runSingle(config, {
    ...shared,
    output: args.output?.trim(),
  });
};

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
