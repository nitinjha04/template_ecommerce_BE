/**
 * Remove partial Nexa categories/products and scrape verified fallback categories.
 *
 *   npm run scrape:nexa:fix-partial
 *   npm run scrape:nexa:fix-partial -- --dry-run
 */
import * as fs from 'fs';
import * as path from 'path';
import { connectDB } from '../../config/db';
import { runWithStoreContext } from '../../context/store.context';
import { Category, Product } from '../../models';
import { mergeStoreFilter } from '../../utils/storeScope';
import type { NexaCategoryScrapeConfig } from './category-config';
import { fetchCatalogCount } from './api-client';
import { ensureNexaStore } from './ensure-store';
import { loadStoreImageKeys, runScrapeJob } from './scrape-job';
import {
  buildBatchReport,
  printBatchSummary,
  saveBatchReport,
} from '../nykaa/run-report';

type RemediationFile = {
  removeCategoryNames: string[];
  replacements: NexaCategoryScrapeConfig[];
};

const dryRun = process.argv.includes('--dry-run');

const loadRemediation = (): RemediationFile => {
  const abs = path.join(__dirname, 'partial-remediation.json');
  return JSON.parse(fs.readFileSync(abs, 'utf-8')) as RemediationFile;
};

const KEEP_SLUGS = new Set([
  'maxwomen-ethnicwear-kurtasandkurtis',
  'maxwomen-ethnicwear-salwarsuits',
  'maxwomen-ethnicwear-dresses',
  'maxwomen-ethnicwear-tops',
  'maxwomen-ethnicwear-palazzosandculottes',
  'maxwomen-ethnicwear-churidars',
  'maxwomen-ethnicwear-winterkurtas',
]);

const rebuildCategoriesConfig = (
  replacements: NexaCategoryScrapeConfig[]
): NexaCategoryScrapeConfig[] => {
  const current = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'categories.example.json'), 'utf-8')
  ) as NexaCategoryScrapeConfig[];

  const kept = current.filter((c) => KEEP_SLUGS.has(c.categorySlug));
  return [...kept, ...replacements];
};

const main = async (): Promise<void> => {
  const remediation = loadRemediation();
  await connectDB();
  const storeId = await ensureNexaStore();

  console.log(`Nexa Skyline store: ${storeId}`);
  if (dryRun) console.log('DRY RUN\n');

  const removeNames = remediation.removeCategoryNames.map((n) => n.trim().toLowerCase());

  const productsToRemove = await Product.find(mergeStoreFilter({}, storeId))
    .select('name category')
    .lean<{ _id: unknown; name: string; category: string }[]>();

  const matching = productsToRemove.filter((p) =>
    removeNames.includes(p.category.trim().toLowerCase())
  );

  console.log(`\nRemoving ${matching.length} products in partial categories…`);
  if (!dryRun && matching.length > 0) {
    const result = await Product.deleteMany({
      ...mergeStoreFilter({}, storeId),
      category: {
        $in: remediation.removeCategoryNames,
      },
    });
    console.log(`  Deleted ${result.deletedCount} products`);
  }

  for (const name of remediation.removeCategoryNames) {
    const cat = await Category.findOne(
      mergeStoreFilter({
        name: {
          $regex: new RegExp(
            `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          ),
        },
      })
    );
    if (!cat) continue;

    const remaining = await Product.countDocuments(
      mergeStoreFilter({ category: cat.name }, storeId)
    );
    if (remaining > 0) {
      console.warn(`  Category "${cat.name}" still has ${remaining} products — not deleted`);
      continue;
    }

    if (dryRun) {
      console.log(`  [dry] would delete category "${cat.name}"`);
    } else {
      await Category.findOneAndDelete(mergeStoreFilter({ _id: cat._id }));
      console.log(`  Deleted category "${cat.name}"`);
    }
  }

  const verified: NexaCategoryScrapeConfig[] = [];
  console.log('\nChecking fallback catalog counts…');

  for (const candidate of remediation.replacements) {
    const needed = candidate.limit ?? 50;
    const count = await fetchCatalogCount(candidate.categorySlug);
    const ok = count >= needed;
    console.log(
      `  ${ok ? '✓' : '✗'} ${candidate.categoryName} (${candidate.categorySlug}): ${count}/${needed}`
    );
    if (ok) verified.push(candidate);
  }

  if (verified.length === 0) {
    console.log('\nNo fallback categories with sufficient catalog count.');
    process.exit(0);
  }

  const usedProductIds = new Set<string>();
  const usedImageKeys = await loadStoreImageKeys(storeId);
  const results = [];
  const startedAt = new Date();

  for (const config of verified) {
    const result = await runWithStoreContext(
      {
        storeId,
        storeSlug: 'nexa-skyline',
        storeDomain: 'nexa-skyline.com',
        storeName: 'Nexa Skyline',
      },
      () =>
        runScrapeJob(config, {
          storeId,
          usedProductIds,
          usedImageKeys,
          skipConnect: true,
          dryRun,
        })
    );
    results.push(result);
  }

  if (!dryRun) {
    const updated = rebuildCategoriesConfig(verified);
    const configPath = path.join(__dirname, 'categories.example.json');
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
    console.log(`\nUpdated ${configPath}`);
  }

  const report = buildBatchReport('partial-remediation', startedAt, results);
  printBatchSummary(report, saveBatchReport(report));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
