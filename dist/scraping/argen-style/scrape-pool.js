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
exports.loadCategoryMapFile = exports.runPoolScrape = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../config/db");
const api_client_1 = require("../nykaa/api-client");
const price_quota_1 = require("../nykaa/price-quota");
const resolve_category_1 = require("./resolve-category");
const map_product_1 = require("./map-product");
const product_filters_1 = require("./product-filters");
const pool_config_1 = require("./pool-config");
const scrape_session_1 = require("./scrape-session");
const import_products_1 = require("./import-products");
const OUTPUT_DIR = path.join(__dirname, '../output');
const bandOutputPath = (priceMin, priceMax) => path.join(OUTPUT_DIR, `argen-pool-${priceMin}-${priceMax}.json`);
const allBandsFull = (bands) => bands.every((b) => b.filled >= b.limit);
const runPoolScrape = async (config, categoryMap, options = {}) => {
    const maxPages = options.maxPages ?? 200;
    const rejectStats = {};
    const bumpReject = (reason) => {
        rejectStats[reason] = (rejectStats[reason] ?? 0) + 1;
    };
    const bands = config.priceBands.map((b) => ({
        ...b,
        filled: 0,
        products: [],
    }));
    let currentBandIndex = 0;
    let pagesFetched = 0;
    const seenPageIds = new Set();
    try {
        if (!options.skipConnect) {
            await (0, db_1.connectDB)();
        }
        const session = await scrape_session_1.ScrapeSession.create(config.storeId, options.blocklistPath);
        const needed = (0, pool_config_1.totalProductsNeeded)(config);
        console.log(`\nArgen Style pool scrape | store ${config.storeId}\n` +
            `Filter: ${config.categoryFilter}\n` +
            `Target: ${needed} products across ${bands.length} price bands (₹${bands[0].priceMin}–${bands[bands.length - 1].priceMax})\n`);
        for (let page = 1; page <= maxPages; page += 1) {
            if (allBandsFull(bands))
                break;
            const batch = await (0, api_client_1.fetchCategoryProductsPage)({
                categoryFilter: config.categoryFilter,
                categoryId: config.categoryId,
                currentPage: page,
                pageSize: config.pageSize,
                sort: config.sort,
            });
            pagesFetched = page;
            if (batch.length === 0) {
                console.log(`  page ${page}: empty — stopping`);
                break;
            }
            let acceptedThisPage = 0;
            for (const raw of batch) {
                if (allBandsFull(bands))
                    break;
                const pageId = raw.id?.trim();
                if (!pageId || seenPageIds.has(pageId))
                    continue;
                seenPageIds.add(pageId);
                while (currentBandIndex < bands.length && bands[currentBandIndex].filled >= bands[currentBandIndex].limit) {
                    currentBandIndex += 1;
                }
                if (currentBandIndex >= bands.length)
                    break;
                const band = bands[currentBandIndex];
                const reject = session.rejectReason(raw);
                if (reject) {
                    bumpReject(reject);
                    continue;
                }
                const categoryName = (0, resolve_category_1.resolveCategoryFromProduct)(raw, categoryMap);
                if (!categoryName) {
                    bumpReject('no-category');
                    continue;
                }
                const assignedPrice = (0, price_quota_1.randomPriceInRange)(band.priceMin, band.priceMax);
                const doc = (0, map_product_1.mapArgenProduct)(raw, {
                    categoryName,
                    categoryFilter: config.categoryFilter,
                    assignedPrice,
                    index: band.filled,
                });
                if (!doc) {
                    bumpReject('map-failed');
                    continue;
                }
                const images = (0, product_filters_1.collectArgenImages)(raw);
                session.markAccepted(raw, images);
                band.products.push(doc);
                band.filled += 1;
                acceptedThisPage += 1;
            }
            const scraped = bands.reduce((s, b) => s + b.filled, 0);
            console.log(`  page ${page}: batch ${batch.length} | +${acceptedThisPage} accepted | total ${scraped}/${needed}`);
            if (batch.length < config.pageSize)
                break;
        }
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        const bandResults = [];
        let totalInserted = 0;
        for (const band of bands) {
            const outputPath = bandOutputPath(band.priceMin, band.priceMax);
            const manifest = {
                scrapedAt: new Date().toISOString(),
                storeId: config.storeId,
                categoryFilter: config.categoryFilter,
                categoryName: 'pool-mixed',
                priceMin: band.priceMin,
                priceMax: band.priceMax,
                categoryId: config.categoryId,
                priceMode: 'random',
                sort: config.sort,
                totalProducts: band.products.length,
                pagesFetched,
                products: band.products,
            };
            fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
            let inserted = 0;
            let skipped = 0;
            if (!options.jsonOnly && band.products.length > 0) {
                const importResult = await (0, import_products_1.importProducts)(band.products, {
                    storeId: config.storeId,
                    dryRun: options.dryRun,
                    skipConnect: true,
                });
                inserted = importResult.inserted;
                skipped = importResult.skipped;
            }
            else if (options.dryRun) {
                inserted = band.products.length;
            }
            totalInserted += inserted;
            bandResults.push({
                priceMin: band.priceMin,
                priceMax: band.priceMax,
                requested: band.limit,
                scraped: band.products.length,
                inserted,
                skipped,
                products: band.products,
                outputPath,
            });
            console.log(`  band ₹${band.priceMin}–${band.priceMax}: ${band.products.length}/${band.limit} scraped` +
                (options.jsonOnly ? '' : `, ${inserted} inserted`));
        }
        const totalScraped = bandResults.reduce((s, b) => s + b.scraped, 0);
        const totalRequested = bandResults.reduce((s, b) => s + b.requested, 0);
        console.log('\nReject summary:', rejectStats);
        let status = 'success';
        if (totalScraped === 0)
            status = 'failed';
        else if (totalScraped < totalRequested)
            status = 'partial';
        return {
            status,
            pagesFetched,
            totalRequested,
            totalScraped,
            totalInserted,
            rejectStats,
            bands: bandResults,
        };
    }
    catch (err) {
        return {
            status: 'failed',
            pagesFetched,
            totalRequested: (0, pool_config_1.totalProductsNeeded)(config),
            totalScraped: 0,
            totalInserted: 0,
            rejectStats,
            bands: [],
            error: err instanceof Error ? err.message : String(err),
        };
    }
};
exports.runPoolScrape = runPoolScrape;
const loadCategoryMapFile = (filePath) => {
    const abs = path.resolve(filePath?.trim() || path.join(__dirname, 'category-map.json'));
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    return (0, resolve_category_1.loadCategoryMap)(parsed);
};
exports.loadCategoryMapFile = loadCategoryMapFile;
