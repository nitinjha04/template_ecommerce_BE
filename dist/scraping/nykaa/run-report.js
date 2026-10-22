"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBatchReport = exports.printBatchSummary = exports.saveBatchReport = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const OUTPUT_DIR = path.join(__dirname, '../output');
const saveBatchReport = (report) => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const stamp = report.finishedAt.replace(/[:.]/g, '-');
    const filePath = path.join(OUTPUT_DIR, `run-report-${stamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    return filePath;
};
exports.saveBatchReport = saveBatchReport;
const printBatchSummary = (report, reportPath) => {
    const { totals, results } = report;
    console.log('\n' + '='.repeat(60));
    console.log('SCRAPE RUN SUMMARY');
    console.log('='.repeat(60));
    console.log(`Config: ${report.configFile}`);
    console.log(`Report saved: ${reportPath}\n`);
    for (const row of results) {
        const icon = row.status === 'success' ? '✓' : row.status === 'partial' ? '!' : '✗';
        const line = row.status === 'failed'
            ? `${icon} ${row.categoryName} (filter ${row.categoryFilter}) — FAILED: ${row.error}`
            : `${icon} ${row.categoryName} — added ${row.inserted}/${row.requested} products (skipped ${row.skipped}, scraped ${row.scraped}) | ₹${row.priceMin}–${row.priceMax} | sort ${row.sort}`;
        console.log(line);
    }
    console.log('\n' + '-'.repeat(60));
    console.log(`Categories: ${totals.categories} total | ${totals.succeeded} ok | ${totals.partial} partial | ${totals.failed} failed`);
    console.log(`Products: ${totals.productsInserted} inserted | ${totals.productsSkipped} skipped | ${totals.productsScraped} scraped`);
    console.log('='.repeat(60) + '\n');
};
exports.printBatchSummary = printBatchSummary;
const buildBatchReport = (configFile, startedAt, results) => {
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
exports.buildBatchReport = buildBatchReport;
