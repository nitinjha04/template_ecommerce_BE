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
/**
 * Scrape Max Fashion (Unbxd category API) → JSON → MongoDB (Mineview store).
 *
 *   npm run scrape:maxfashion:all
 *   npm run scrape:maxfashion -- --category-slug maxwomen-bottoms --category bottoms --price-min 300 --price-max 399
 */
const path = __importStar(require("path"));
const db_1 = require("../../config/db");
const store_context_1 = require("../../context/store.context");
const category_config_1 = require("../nykaa/category-config");
const run_report_1 = require("../nykaa/run-report");
const category_config_2 = require("./category-config");
const constants_1 = require("./constants");
const ensure_store_1 = require("./ensure-store");
const scrape_job_1 = require("./scrape-job");
const parseArgs = () => {
    const out = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg.startsWith('--'))
            continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            out[key] = next;
            i += 1;
        }
        else {
            out[key] = 'true';
        }
    }
    return out;
};
const requireArg = (args, key) => {
    const v = args[key]?.trim();
    if (!v) {
        console.error(`Missing required flag: --${key}`);
        process.exit(1);
    }
    return v;
};
const configFromCliArgs = (args) => ({
    categorySlug: requireArg(args, 'category-slug'),
    categoryName: requireArg(args, 'category'),
    priceMin: Number(requireArg(args, 'price-min')),
    priceMax: Number(requireArg(args, 'price-max')),
    limit: args.limit?.trim() ? Number(args.limit) : undefined,
    sort: (0, category_config_1.normalizeSort)(args.sort),
});
const main = async () => {
    const args = parseArgs();
    const dryRun = args['dry-run'] === 'true';
    const jsonOnly = args['json-only'] === 'true';
    const maxPages = Number(args['max-pages'] ?? '40');
    const configPath = args.config?.trim();
    await (0, db_1.connectDB)();
    const storeId = await (0, ensure_store_1.ensureMineviewStore)();
    const usedProductIds = new Set();
    const usedImageKeys = await (0, scrape_job_1.loadStoreImageKeys)(storeId);
    console.log(`Mineview store: ${storeId} (${constants_1.MINEVIEW_STORE_DOMAIN})`);
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
    const storeContext = {
        storeId,
        storeSlug: constants_1.MINEVIEW_STORE_SLUG,
        storeDomain: constants_1.MINEVIEW_STORE_DOMAIN,
        storeName: constants_1.MINEVIEW_STORE_NAME,
    };
    const runBatch = async (absConfig) => {
        const categories = (0, category_config_2.loadCategoryConfigFile)(absConfig);
        const startedAt = new Date();
        const results = [];
        for (const config of categories) {
            const result = await (0, store_context_1.runWithStoreContext)(storeContext, () => (0, scrape_job_1.runScrapeJob)(config, shared));
            results.push(result);
        }
        const report = (0, run_report_1.buildBatchReport)(absConfig, startedAt, results);
        const reportPath = (0, run_report_1.saveBatchReport)(report);
        (0, run_report_1.printBatchSummary)(report, reportPath);
        if (report.totals.failed > 0)
            process.exit(1);
    };
    if (configPath || args.all === 'true') {
        await runBatch(configPath ?? path.join(__dirname, 'categories.example.json'));
        return;
    }
    if (!args['category-slug']) {
        console.error('Usage:\n' +
            '  npm run scrape:maxfashion:all\n' +
            '  npm run scrape:maxfashion -- --category-slug maxwomen-bottoms --category bottoms --price-min 300 --price-max 399');
        process.exit(1);
    }
    const config = configFromCliArgs(args);
    const result = await (0, store_context_1.runWithStoreContext)(storeContext, () => (0, scrape_job_1.runScrapeJob)(config, shared));
    const report = (0, run_report_1.buildBatchReport)('single CLI run', new Date(), [result]);
    (0, run_report_1.printBatchSummary)(report, (0, run_report_1.saveBatchReport)(report));
    if (result.status === 'failed')
        process.exit(1);
};
main().catch((err) => {
    console.error('Scrape failed:', err);
    process.exit(1);
});
