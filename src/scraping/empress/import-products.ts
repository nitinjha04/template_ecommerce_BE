/**
 * Re-import a previously saved Empress scrape JSON.
 *
 * Usage:
 *   npm run scrape:empress:import -- --file src/scraping/output/empress-sarees-1000-1499.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { connectDB } from '../../config/db';
import { EMPRESS_STORE_ID } from './constants';
import { importManifest } from './import-manifest';
import type { EmpressScrapeManifest } from './types';

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

const loadManifest = (filePath: string): EmpressScrapeManifest => {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as EmpressScrapeManifest;
  if (!parsed.products || !Array.isArray(parsed.products)) {
    throw new Error('JSON must contain a "products" array');
  }
  if (!parsed.storeId) {
    parsed.storeId = EMPRESS_STORE_ID;
  }
  return parsed;
};

const main = async (): Promise<void> => {
  const args = parseArgs();
  const file = args.file?.trim();
  if (!file) {
    console.error('Usage: npm run scrape:empress:import -- --file <path-to.json> [--dry-run]');
    process.exit(1);
  }

  await connectDB();
  const manifest = loadManifest(file);
  await importManifest(manifest, {
    dryRun: args['dry-run'] === 'true',
    storeId: args['store-id']?.trim() || manifest.storeId,
  });
  process.exit(0);
};

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
