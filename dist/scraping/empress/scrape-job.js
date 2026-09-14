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
exports.runScrapeJob = exports.resolveLimit = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const api_client_1 = require("./api-client");
const category_config_1 = require("./category-config");
const constants_1 = require("./constants");
const import_manifest_1 = require("./import-manifest");
const map_empress_product_1 = require("./map-empress-product");
const price_quota_1 = require("../nykaa/price-quota");
const DEFAULT_LIMIT = 15;
const defaultOutputPath = (category, priceMin, priceMax) => {
    const safe = category.toLowerCase().replace(/[^\w-]+/g, '-');
    return path.join(__dirname, '../output', `empress-${safe}-${priceMin}-${priceMax}.json`);
};
const loadRawPool = (filePath) => {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
        throw new Error(`File not found: ${abs}`);
    }
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    if (Array.isArray(parsed))
        return parsed;
    if (parsed &&
        typeof parsed === 'object' &&
        'products' in parsed &&
        Array.isArray(parsed.products)) {
        const inner = parsed.products;
        if (inner.length > 0 && inner[0] && typeof inner[0] === 'object' && 'title' in inner[0]) {
            return inner;
        }
        return parsed.products;
    }
    throw new Error('Raw file must be a product array or scrape manifest JSON');
};
const resolveLimit = (config) => config.limit !== undefined && config.limit > 0 ? Math.floor(config.limit) : DEFAULT_LIMIT;
exports.resolveLimit = resolveLimit;
const runScrapeJob = async (config, options = {}) => {
    const sort = (0, category_config_1.normalizeSort)(config.sort);
    const needed = (0, exports.resolveLimit)(config);
    const maxPages = options.maxPages ?? 20;
    const storeId = options.storeId?.trim() || constants_1.EMPRESS_STORE_ID;
    const base = {
        categoryName: config.categoryName,
        categoryFilter: config.collectionHandle,
        collectionHandle: config.collectionHandle,
        status: 'failed',
        requested: needed,
        scraped: 0,
        inserted: 0,
        skipped: 0,
        priceMin: config.priceMin,
        priceMax: config.priceMax,
        sort,
    };
    try {
        console.log('\n' + '─'.repeat(50));
        console.log(`▶ ${config.categoryName} (${config.collectionHandle}) | ₹${config.priceMin}–${config.priceMax} | limit ${needed} | sort ${sort}`);
        let pool;
        let pagesFetched = 0;
        if (options.fromRaw) {
            pool = loadRawPool(options.fromRaw);
            console.log(`  Loaded ${pool.length} products from raw file`);
        }
        else {
            const result = await (0, api_client_1.fetchProductPool)({
                collectionHandle: config.collectionHandle,
                needed: needed + 10,
                maxPages: Number.isFinite(maxPages) ? maxPages : 20,
                sort,
                onPage: (page, batch, total) => {
                    console.log(`  page ${page}: +${batch} (pool ${total})`);
                },
            });
            pool = result.products;
            pagesFetched = result.pagesFetched;
            console.log(`  Fetched ${pool.length} unique products (${pagesFetched} page(s))`);
        }
        if (pool.length < needed) {
            console.warn(`  Warning: only ${pool.length} in pool; wanted ${needed}`);
        }
        const usedIds = new Set();
        const documents = [];
        let poolIndex = 0;
        const takeNext = () => {
            while (poolIndex < pool.length) {
                const raw = pool[poolIndex];
                poolIndex += 1;
                const id = String(raw.id ?? '').trim();
                if (!id || usedIds.has(id))
                    continue;
                usedIds.add(id);
                return raw;
            }
            return null;
        };
        for (let i = 0; i < needed; i += 1) {
            const raw = takeNext();
            if (!raw)
                break;
            const assignedPrice = (0, price_quota_1.randomPriceInRange)(config.priceMin, config.priceMax);
            const doc = (0, map_empress_product_1.mapEmpressToProductDocument)(raw, {
                categoryName: config.categoryName,
                collectionHandle: config.collectionHandle,
                assignedPrice,
                index: i,
            });
            if (!doc) {
                i -= 1;
                continue;
            }
            documents.push(doc);
        }
        const outputPath = options.outputPath ??
            defaultOutputPath(config.categoryName, config.priceMin, config.priceMax);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const manifest = {
            scrapedAt: new Date().toISOString(),
            categoryFilter: config.collectionHandle,
            categoryName: config.categoryName,
            collectionHandle: config.collectionHandle,
            collectionUrl: config.collectionUrl ?? '',
            priceMin: config.priceMin,
            priceMax: config.priceMax,
            categoryId: config.collectionHandle,
            storeId,
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
        if (options.jsonOnly) {
            base.status =
                documents.length >= needed ? 'success' : documents.length > 0 ? 'partial' : 'failed';
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
            storeId,
        });
        base.inserted = importResult.inserted;
        base.skipped = importResult.skipped;
        if (importResult.inserted === 0 && documents.length > 0) {
            base.status = 'failed';
            base.error = 'All products skipped during import';
        }
        else if (importResult.inserted < needed) {
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
