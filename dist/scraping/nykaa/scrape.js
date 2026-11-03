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
 * Scrape Nykaa Fashion → JSON → MongoDB.
 *
 * Single category:
 *   npm run scrape:nykaa -- --category-filter 4497 --category tops --price-min 100 --price-max 200 --limit 50
 *
 * All categories from JSON config:
 *   npm run scrape:nykaa:all
 *   npm run scrape:nykaa -- --config src/scraping/nykaa/categories.example.json
 */
const path = __importStar(require("path"));
const db_1 = require("../../config/db");
const category_config_1 = require("./category-config");
const run_report_1 = require("./run-report");
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
    categoryFilter: requireArg(args, 'category-filter'),
    categoryName: requireArg(args, 'category'),
    priceMin: Number(requireArg(args, 'price-min')),
    priceMax: Number(requireArg(args, 'price-max')),
    limit: args.limit?.trim() ? Number(args.limit) : undefined,
    sort: (0, category_config_1.normalizeSort)(args.sort),
    categoryId: args['category-id']?.trim(),
});
const runBatch = async (configPath, options) => {
    const absConfig = path.resolve(configPath);
    const categories = (0, category_config_1.loadCategoryConfigFile)(absConfig);
    const startedAt = new Date();
    console.log(`Running ${categories.length} categories from:\n  ${absConfig}\n`);
    if (!options.dryRun && !options.jsonOnly) {
        await (0, db_1.connectDB)();
    }
    const results = [];
    for (let i = 0; i < categories.length; i += 1) {
        const config = categories[i];
        const result = await (0, scrape_job_1.runScrapeJob)(config, {
            dryRun: options.dryRun,
            jsonOnly: options.jsonOnly,
            maxPages: options.maxPages,
            fromRaw: options.fromRaw,
            skipConnect: !options.dryRun && !options.jsonOnly,
        });
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
    const result = await (0, scrape_job_1.runScrapeJob)(config, {
        dryRun: options.dryRun,
        jsonOnly: options.jsonOnly,
        maxPages: options.maxPages,
        fromRaw: options.fromRaw,
        outputPath: options.output,
        skipConnect: false,
    });
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
    const maxPages = Number(args['max-pages'] ?? '40');
    const fromRaw = args['from-raw']?.trim();
    const configPath = args.config?.trim();
    const shared = { dryRun, jsonOnly, maxPages, fromRaw };
    if (configPath || args.all === 'true') {
        await runBatch(configPath ?? path.join(__dirname, 'categories.example.json'), shared);
        return;
    }
    if (!args['category-filter']) {
        console.error('Usage:\n' +
            '  npm run scrape:nykaa:all\n' +
            '  npm run scrape:nykaa -- --config src/scraping/nykaa/categories.example.json\n' +
            '  npm run scrape:nykaa -- --category-filter 4497 --category tops --price-min 100 --price-max 200');
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
