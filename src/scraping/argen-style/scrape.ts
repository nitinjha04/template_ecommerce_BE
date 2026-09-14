/**
 * Argen Style — Nykaa combined pool scrape (₹100–₹999 tiers, deduped by image).
 *
 *   npm run scrape:argen:pool
 *   npm run scrape:argen:pool -- --json-only --max-pages 30
 *   npm run scrape:argen:pool -- --dry-run
 */
import * as path from 'path';
import { loadPoolConfig } from './pool-config';
import { loadCategoryMapFile, runPoolScrape } from './scrape-pool';

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

const main = async (): Promise<void> => {
  const args = parseArgs();
  const configPath = args.config?.trim() || path.join(__dirname, 'pool-config.json');
  const categoryMapPath = args['category-map']?.trim();
  const blocklistPath = args.blocklist?.trim();

  const config = loadPoolConfig(configPath);
  const categoryMap = loadCategoryMapFile(categoryMapPath);

  const result = await runPoolScrape(config, categoryMap, {
    maxPages: Number(args['max-pages'] ?? '200'),
    dryRun: args['dry-run'] === 'true',
    jsonOnly: args['json-only'] === 'true',
    blocklistPath,
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Status: ${result.status}`);
  console.log(`Pages: ${result.pagesFetched} | Scraped: ${result.totalScraped}/${result.totalRequested}`);
  if (!args['json-only']) {
    console.log(`Inserted: ${result.totalInserted}`);
  }
  if (result.error) console.log(`Error: ${result.error}`);
  console.log('='.repeat(60));

  if (result.status === 'failed') process.exit(1);
};

main().catch((err) => {
  console.error('Pool scrape failed:', err);
  process.exit(1);
});
