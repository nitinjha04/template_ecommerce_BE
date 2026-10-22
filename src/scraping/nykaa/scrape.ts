/**
 * Scrape Nykaa Fashion → JSON → MongoDB.
 *
 * Single category:
 *   npm run scrape:nykaa -- --category-filter 4497 --category tops --price-min 100 --price-max 200 --limit 50
 *
 * All categories from JSON config:
 *   npm run scrape:nykaa:all
 *   npm run scrape:nykaa -- --config src/scraping/nykaa/categories.example.json
 */
import * as path from 'path';
import { connectDB } from '../../config/db';
import {
  loadCategoryConfigFile,
  normalizeSort,
  type CategoryScrapeConfig,
} from './category-config';
import {
  buildBatchReport,
  printBatchSummary,
  saveBatchReport,
} from './run-report';
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

const configFromCliArgs = (args: Record<string, string>): CategoryScrapeConfig => ({
  categoryFilter: requireArg(args, 'category-filter'),
  categoryName: requireArg(args, 'category'),
  priceMin: Number(requireArg(args, 'price-min')),
  priceMax: Number(requireArg(args, 'price-max')),
  limit: args.limit?.trim() ? Number(args.limit) : undefined,
  sort: normalizeSort(args.sort),
  categoryId: args['category-id']?.trim(),
});

const runBatch = async (
  configPath: string,
  options: {
    dryRun: boolean;
    jsonOnly: boolean;
    maxPages: number;
    fromRaw?: string;
  }
): Promise<void> => {
  const absConfig = path.resolve(configPath);
  const categories = loadCategoryConfigFile(absConfig);
  const startedAt = new Date();

  console.log(`Running ${categories.length} categories from:\n  ${absConfig}\n`);

  if (!options.dryRun && !options.jsonOnly) {
    await connectDB();
  }

  const results = [];
  for (let i = 0; i < categories.length; i += 1) {
    const config = categories[i];
    const result = await runScrapeJob(config, {
      dryRun: options.dryRun,
      jsonOnly: options.jsonOnly,
      maxPages: options.maxPages,
      fromRaw: options.fromRaw,
      skipConnect: !options.dryRun && !options.jsonOnly,
    });
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
  config: CategoryScrapeConfig,
  options: {
    dryRun: boolean;
    jsonOnly: boolean;
    maxPages: number;
    fromRaw?: string;
    output?: string;
  }
): Promise<void> => {
  if (!options.dryRun && !options.jsonOnly) {
    await connectDB();
  }

  const result = await runScrapeJob(config, {
    dryRun: options.dryRun,
    jsonOnly: options.jsonOnly,
    maxPages: options.maxPages,
    fromRaw: options.fromRaw,
    outputPath: options.output,
    skipConnect: false,
  });

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
  const maxPages = Number(args['max-pages'] ?? '40');
  const fromRaw = args['from-raw']?.trim();
  const configPath = args.config?.trim();

  const shared = { dryRun, jsonOnly, maxPages, fromRaw };

  if (configPath || args.all === 'true') {
    await runBatch(
      configPath ?? path.join(__dirname, 'categories.example.json'),
      shared
    );
    return;
  }

  if (!args['category-filter']) {
    console.error(
      'Usage:\n' +
        '  npm run scrape:nykaa:all\n' +
        '  npm run scrape:nykaa -- --config src/scraping/nykaa/categories.example.json\n' +
        '  npm run scrape:nykaa -- --category-filter 4497 --category tops --price-min 100 --price-max 200'
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
