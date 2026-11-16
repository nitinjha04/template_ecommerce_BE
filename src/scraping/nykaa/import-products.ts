/**
 * Re-import a previously saved scrape JSON (optional — scrape.ts imports by default).
 *
 * Usage:
 *   npm run scrape:nykaa:import -- --file src/scraping/output/tops-100-200.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { importManifest } from './import-manifest';
import type { ScrapeManifest } from './types';

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

const loadManifest = (filePath: string): ScrapeManifest => {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as ScrapeManifest;
  if (!parsed.products || !Array.isArray(parsed.products)) {
    throw new Error('JSON must contain a "products" array');
  }
  return parsed;
};

const main = async (): Promise<void> => {
  const args = parseArgs();
  const file = args.file?.trim();
  if (!file) {
    console.error('Usage: npm run scrape:nykaa:import -- --file <path-to.json> [--dry-run]');
    process.exit(1);
  }

  const manifest = loadManifest(file);
  await importManifest(manifest, { dryRun: args['dry-run'] === 'true' });
  process.exit(0);
};

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
