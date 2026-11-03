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
 * Remove partial Nexa categories/products and scrape verified fallback categories.
 *
 *   npm run scrape:nexa:fix-partial
 *   npm run scrape:nexa:fix-partial -- --dry-run
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../config/db");
const store_context_1 = require("../../context/store.context");
const models_1 = require("../../models");
const storeScope_1 = require("../../utils/storeScope");
const api_client_1 = require("./api-client");
const ensure_store_1 = require("./ensure-store");
const scrape_job_1 = require("./scrape-job");
const run_report_1 = require("../nykaa/run-report");
const dryRun = process.argv.includes('--dry-run');
const loadRemediation = () => {
    const abs = path.join(__dirname, 'partial-remediation.json');
    return JSON.parse(fs.readFileSync(abs, 'utf-8'));
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
const rebuildCategoriesConfig = (replacements) => {
    const current = JSON.parse(fs.readFileSync(path.join(__dirname, 'categories.example.json'), 'utf-8'));
    const kept = current.filter((c) => KEEP_SLUGS.has(c.categorySlug));
    return [...kept, ...replacements];
};
const main = async () => {
    const remediation = loadRemediation();
    await (0, db_1.connectDB)();
    const storeId = await (0, ensure_store_1.ensureNexaStore)();
    console.log(`Nexa Skyline store: ${storeId}`);
    if (dryRun)
        console.log('DRY RUN\n');
    const removeNames = remediation.removeCategoryNames.map((n) => n.trim().toLowerCase());
    const productsToRemove = await models_1.Product.find((0, storeScope_1.mergeStoreFilter)({}, storeId))
        .select('name category')
        .lean();
    const matching = productsToRemove.filter((p) => removeNames.includes(p.category.trim().toLowerCase()));
    console.log(`\nRemoving ${matching.length} products in partial categories…`);
    if (!dryRun && matching.length > 0) {
        const result = await models_1.Product.deleteMany({
            ...(0, storeScope_1.mergeStoreFilter)({}, storeId),
            category: {
                $in: remediation.removeCategoryNames,
            },
        });
        console.log(`  Deleted ${result.deletedCount} products`);
    }
    for (const name of remediation.removeCategoryNames) {
        const cat = await models_1.Category.findOne((0, storeScope_1.mergeStoreFilter)({
            name: {
                $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            },
        }));
        if (!cat)
            continue;
        const remaining = await models_1.Product.countDocuments((0, storeScope_1.mergeStoreFilter)({ category: cat.name }, storeId));
        if (remaining > 0) {
            console.warn(`  Category "${cat.name}" still has ${remaining} products — not deleted`);
            continue;
        }
        if (dryRun) {
            console.log(`  [dry] would delete category "${cat.name}"`);
        }
        else {
            await models_1.Category.findOneAndDelete((0, storeScope_1.mergeStoreFilter)({ _id: cat._id }));
            console.log(`  Deleted category "${cat.name}"`);
        }
    }
    const verified = [];
    console.log('\nChecking fallback catalog counts…');
    for (const candidate of remediation.replacements) {
        const needed = candidate.limit ?? 50;
        const count = await (0, api_client_1.fetchCatalogCount)(candidate.categorySlug);
        const ok = count >= needed;
        console.log(`  ${ok ? '✓' : '✗'} ${candidate.categoryName} (${candidate.categorySlug}): ${count}/${needed}`);
        if (ok)
            verified.push(candidate);
    }
    if (verified.length === 0) {
        console.log('\nNo fallback categories with sufficient catalog count.');
        process.exit(0);
    }
    const usedProductIds = new Set();
    const usedImageKeys = await (0, scrape_job_1.loadStoreImageKeys)(storeId);
    const results = [];
    const startedAt = new Date();
    for (const config of verified) {
        const result = await (0, store_context_1.runWithStoreContext)({
            storeId,
            storeSlug: 'nexa-skyline',
            storeDomain: 'nexa-skyline.com',
            storeName: 'Nexa Skyline',
        }, () => (0, scrape_job_1.runScrapeJob)(config, {
            storeId,
            usedProductIds,
            usedImageKeys,
            skipConnect: true,
            dryRun,
        }));
        results.push(result);
    }
    if (!dryRun) {
        const updated = rebuildCategoriesConfig(verified);
        const configPath = path.join(__dirname, 'categories.example.json');
        fs.writeFileSync(configPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
        console.log(`\nUpdated ${configPath}`);
    }
    const report = (0, run_report_1.buildBatchReport)('partial-remediation', startedAt, results);
    (0, run_report_1.printBatchSummary)(report, (0, run_report_1.saveBatchReport)(report));
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
