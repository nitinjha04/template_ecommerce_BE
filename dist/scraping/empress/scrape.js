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
 * Scrape Empress Clothing (Shopify) → JSON → MongoDB.
 *
 * All categories (₹1000–₹7000 tiers, 15 products each):
 *   npm run scrape:empress:all
 *
 * Single collection:
 *   npm run scrape:empress -- --collection indo-western-wear --category "indo western wear" --price-min 1000 --price-max 1499 --limit 15
 */
const path = __importStar(require("path"));
const db_1 = require("../../config/db");
const store_context_1 = require("../../context/store.context");
const category_config_1 = require("./category-config");
const constants_1 = require("./constants");
const run_report_1 = require("../nykaa/run-report");
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
const configFromCliArgs = (args) => {
    const handle = requireArg(args, 'collection');
    return {
        collectionHandle: handle,
        collectionUrl: `https://empress-clothing.com/collections/${handle}`,
        categoryName: requireArg(args, 'category'),
        priceMin: Number(requireArg(args, 'price-min')),
        priceMax: Number(requireArg(args, 'price-max')),
        limit: args.limit?.trim() ? Number(args.limit) : undefined,
        sort: (0, category_config_1.normalizeSort)(args.sort),
    };
};
const runBatch = async (configPath, options) => {
    const absConfig = path.resolve(configPath);
    const categories = (0, category_config_1.loadCategoryConfigFile)(absConfig);
    const startedAt = new Date();
    console.log(`Running ${categories.length} Empress categories from:\n  ${absConfig}`);
    console.log(`Store ID: ${options.storeId}\n`);
    if (!options.dryRun && !options.jsonOnly) {
        await (0, db_1.connectDB)();
    }
    const results = [];
    for (const config of categories) {
        const result = await (0, store_context_1.runWithStoreContext)({
            storeId: options.storeId,
            storeSlug: 'empress-import',
            storeDomain: 'empress-clothing.com',
            storeName: 'Empress Import',
        }, () => (0, scrape_job_1.runScrapeJob)(config, {
            dryRun: options.dryRun,
            jsonOnly: options.jsonOnly,
            maxPages: options.maxPages,
            fromRaw: options.fromRaw,
            skipConnect: !options.dryRun && !options.jsonOnly,
            storeId: options.storeId,
        }));
        results.push(result);
    }
    const report = (0, run_report_1.buildBatchReport)(absConfig, startedAt, results);
    const reportPath = (0, run_report_1.saveBatchReport)(report);
    (0, run_report_1.printBatchSummary)(report, reportPath);
    if (report.totals.failed > 0) {
        process.exit(1);
    }
};
const runSingle = async (config, options) => {
    if (!options.dryRun && !options.jsonOnly) {
        await (0, db_1.connectDB)();
    }
    const result = await (0, store_context_1.runWithStoreContext)({
        storeId: options.storeId,
        storeSlug: 'empress-import',
        storeDomain: 'empress-clothing.com',
        storeName: 'Empress Import',
    }, () => (0, scrape_job_1.runScrapeJob)(config, {
        dryRun: options.dryRun,
        jsonOnly: options.jsonOnly,
        maxPages: options.maxPages,
        fromRaw: options.fromRaw,
        outputPath: options.output,
        skipConnect: false,
        storeId: options.storeId,
    }));
    const report = (0, run_report_1.buildBatchReport)('single CLI run', new Date(), [result]);
    const reportPath = (0, run_report_1.saveBatchReport)(report);
    (0, run_report_1.printBatchSummary)(report, reportPath);
    if (result.status === 'failed') {
        process.exit(1);
    }
};
const main = async () => {
    const args = parseArgs();
    const dryRun = args['dry-run'] === 'true';
    const jsonOnly = args['json-only'] === 'true';
    const maxPages = Number(args['max-pages'] ?? '20');
    const fromRaw = args['from-raw']?.trim();
    const configPath = args.config?.trim();
    const storeId = args['store-id']?.trim() || constants_1.EMPRESS_STORE_ID;
    const shared = { dryRun, jsonOnly, maxPages, fromRaw, storeId };
    if (configPath || args.all === 'true') {
        await runBatch(configPath ?? path.join(__dirname, 'categories.example.json'), shared);
        return;
    }
    if (!args.collection) {
        console.error('Usage:\n' +
            '  npm run scrape:empress:all\n' +
            '  npm run scrape:empress -- --config src/scraping/empress/categories.example.json\n' +
            '  npm run scrape:empress -- --collection sarees --category sarees --price-min 1000 --price-max 1499');
        process.exit(1);
    }
    const config = configFromCliArgs(args);
    if (!Number.isFinite(config.priceMin) ||
        !Number.isFinite(config.priceMax) ||
        config.priceMin > config.priceMax) {
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
