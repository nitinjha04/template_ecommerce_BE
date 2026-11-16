import * as fs from 'fs';
import * as path from 'path';
import type { ScrapeJobResult } from './scrape-job';

export type BatchRunReport = {
  startedAt: string;
  finishedAt: string;
  configFile: string;
  totals: {
    categories: number;
    succeeded: number;
    failed: number;
    partial: number;
    productsInserted: number;
    productsSkipped: number;
    productsScraped: number;
  };
  results: ScrapeJobResult[];
};

const OUTPUT_DIR = path.join(__dirname, '../output');

export const saveBatchReport = (
  report: BatchRunReport
): string => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = report.finishedAt.replace(/[:.]/g, '-');
  const filePath = path.join(OUTPUT_DIR, `run-report-${stamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
};

export const printBatchSummary = (report: BatchRunReport, reportPath: string): void => {
  const { totals, results } = report;

  console.log('\n' + '='.repeat(60));
  console.log('SCRAPE RUN SUMMARY');
  console.log('='.repeat(60));
  console.log(`Config: ${report.configFile}`);
  console.log(`Report saved: ${reportPath}\n`);

  for (const row of results) {
    const icon = row.status === 'success' ? '✓' : row.status === 'partial' ? '!' : '✗';
    const line =
      row.status === 'failed'
        ? `${icon} ${row.categoryName} (filter ${row.categoryFilter}) — FAILED: ${row.error}`
        : `${icon} ${row.categoryName} — added ${row.inserted}/${row.requested} products (skipped ${row.skipped}, scraped ${row.scraped}) | ₹${row.priceMin}–${row.priceMax} | sort ${row.sort}`;

    console.log(line);
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Categories: ${totals.categories} total | ${totals.succeeded} ok | ${totals.partial} partial | ${totals.failed} failed`);
  console.log(
    `Products: ${totals.productsInserted} inserted | ${totals.productsSkipped} skipped | ${totals.productsScraped} scraped`
  );
  console.log('='.repeat(60) + '\n');
};

export const buildBatchReport = (
  configFile: string,
  startedAt: Date,
  results: ScrapeJobResult[]
): BatchRunReport => {
  const succeeded = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const partial = results.filter((r) => r.status === 'partial').length;

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    configFile,
    totals: {
      categories: results.length,
      succeeded,
      failed,
      partial,
      productsInserted: results.reduce((s, r) => s + r.inserted, 0),
      productsSkipped: results.reduce((s, r) => s + r.skipped, 0),
      productsScraped: results.reduce((s, r) => s + r.scraped, 0),
    },
    results,
  };
};
