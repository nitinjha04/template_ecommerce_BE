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
exports.runScrapeJob = exports.loadStoreImageKeys = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const models_1 = require("../../models");
const storeScope_1 = require("../../utils/storeScope");
const image_utils_1 = require("../argen-style/image-utils");
const category_config_1 = require("../nykaa/category-config");
const price_quota_1 = require("../nykaa/price-quota");
const api_client_1 = require("./api-client");
const import_manifest_1 = require("./import-manifest");
const map_product_1 = require("./map-product");
const constants_1 = require("./constants");
const defaultOutputPath = (category, priceMin, priceMax) => {
    const safe = category.toLowerCase().replace(/[^\w-]+/g, '-');
    return path.join(__dirname, '../output', `protico-${safe}-${priceMin}-${priceMax}.json`);
};
const loadStoreImageKeys = async (storeId) => {
    const rows = await models_1.Product.find((0, storeScope_1.mergeStoreFilter)({}, storeId))
        .select('images')
        .lean();
    const keys = new Set();
    for (const row of rows) {
        for (const url of row.images ?? []) {
            if (url)
                keys.add((0, image_utils_1.imageDedupeKey)(url));
        }
    }
    return keys;
};
exports.loadStoreImageKeys = loadStoreImageKeys;
const shouldSkipProduct = (raw, usedProductIds, usedImageKeys) => {
    const id = String(raw.id ?? '').trim();
    if (!id)
        return 'missing-id';
    if (usedProductIds.has(id))
        return 'duplicate-id';
    const keys = (0, map_product_1.productImageKeys)(raw);
    if (keys.length === 0)
        return 'no-images';
    for (const key of keys) {
        if (usedImageKeys.has(key))
            return 'duplicate-image';
    }
    return null;
};
const markAccepted = (raw, usedProductIds, usedImageKeys) => {
    const id = String(raw.id ?? '').trim();
    if (id)
        usedProductIds.add(id);
    for (const key of (0, map_product_1.productImageKeys)(raw)) {
        usedImageKeys.add(key);
    }
};
const runScrapeJob = async (config, options) => {
    const sort = (0, category_config_1.normalizeSort)(config.sort);
    const requested = Math.floor(config.limit);
    const maxPages = options.maxPages ?? 60;
    const usedProductIds = options.usedProductIds ?? new Set();
    const usedImageKeys = options.usedImageKeys ?? new Set();
    const base = {
        categoryName: config.categoryName,
        categoryFilter: config.filterValue,
        categorySlug: config.filterValue,
        status: 'failed',
        requested,
        scraped: 0,
        inserted: 0,
        skipped: 0,
        priceMin: config.priceMin,
        priceMax: config.priceMax,
        sort,
    };
    try {
        console.log('\n' + '─'.repeat(50));
        console.log(`▶ ${config.categoryName} (${config.filterValue}) | ₹${config.priceMin}–${config.priceMax} | limit ${requested} | sort ${sort}`);
        const catalogCount = await (0, api_client_1.fetchCatalogCount)(config.filterValue);
        console.log(`  Catalog available: ${catalogCount}`);
        if (catalogCount === 0) {
            console.warn('  Skipped — empty catalog');
            base.status = 'skipped';
            base.error = 'Empty catalog';
            return base;
        }
        const target = Math.min(requested, catalogCount);
        if (target < requested) {
            console.warn(`  Partial target ${target} (catalog ${catalogCount} < requested ${requested})`);
        }
        const { products: pool, pagesFetched, catalogTotal } = await (0, api_client_1.fetchProductPool)({
            filterValue: config.filterValue,
            needed: target + 30,
            maxPages,
            onPage: (page, batch, total, catalog) => {
                console.log(`  page ${page}: +${batch} (pool ${total} / catalog ${catalog})`);
            },
        });
        console.log(`  Fetched pool ${pool.length} (${pagesFetched} page(s), catalog ${catalogTotal})`);
        const documents = [];
        let poolIndex = 0;
        let rejectCount = 0;
        while (documents.length < target && poolIndex < pool.length) {
            const raw = pool[poolIndex];
            poolIndex += 1;
            const reject = shouldSkipProduct(raw, usedProductIds, usedImageKeys);
            if (reject) {
                rejectCount += 1;
                continue;
            }
            const assignedPrice = (0, price_quota_1.randomPriceInRange)(config.priceMin, config.priceMax);
            const doc = (0, map_product_1.mapProticoToProductDocument)(raw, {
                categoryName: config.categoryName,
                filterValue: config.filterValue,
                assignedPrice,
                index: documents.length,
            });
            if (!doc) {
                rejectCount += 1;
                continue;
            }
            markAccepted(raw, usedProductIds, usedImageKeys);
            documents.push(doc);
        }
        if (documents.length < target) {
            console.warn(`  Warning: only ${documents.length} accepted (${rejectCount} skipped in pool)`);
        }
        const outputPath = options.outputPath ??
            defaultOutputPath(config.categoryName, config.priceMin, config.priceMax);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const manifest = {
            scrapedAt: new Date().toISOString(),
            categoryFilter: config.filterValue,
            categoryName: config.categoryName,
            categorySlug: config.filterValue,
            storeId: options.storeId,
            storeDomain: constants_1.PROTICO_STORE_DOMAIN,
            filterValue: config.filterValue,
            priceMin: config.priceMin,
            priceMax: config.priceMax,
            categoryId: config.filterValue,
            priceMode: 'random',
            sort,
            totalProducts: documents.length,
            pagesFetched,
            products: documents,
        };
        fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log(`  Saved JSON: ${outputPath}`);
        base.scraped = documents.length;
        base.outputPath = outputPath;
        base.requested = target;
        if (options.jsonOnly) {
            base.status =
                documents.length >= target ? 'success' : documents.length > 0 ? 'partial' : 'failed';
            if (base.status === 'failed')
                base.error = 'No products scraped';
            return base;
        }
        if (documents.length === 0) {
            base.error = 'No products to import';
            return base;
        }
        const importResult = await (0, import_manifest_1.importManifest)(manifest, {
            dryRun: options.dryRun,
            skipConnect: options.skipConnect,
        });
        base.inserted = importResult.inserted;
        base.skipped = importResult.skipped;
        if (importResult.inserted === 0 && documents.length > 0) {
            base.status = 'failed';
            base.error = 'All products skipped during import';
        }
        else if (importResult.inserted < target) {
            base.status = 'partial';
        }
        else {
            base.status = 'success';
        }
        return base;
    }
    catch (err) {
        base.error = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${config.categoryName} failed: ${base.error}`);
        return base;
    }
};
exports.runScrapeJob = runScrapeJob;
