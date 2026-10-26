"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProductPool = exports.fetchCollectionProductsPage = exports.buildCollectionProductsUrl = exports.sortProductPool = exports.getProductListPriceUsd = exports.estimateInrFromShopifyPrice = void 0;
const constants_1 = require("./constants");
const DEFAULT_HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** Approximate INR shown on site (USD list price × ~95). */
const estimateInrFromShopifyPrice = (usdPrice) => Math.round(usdPrice * 95);
exports.estimateInrFromShopifyPrice = estimateInrFromShopifyPrice;
const getProductListPriceUsd = (raw) => {
    const prices = (raw.variants ?? [])
        .map((v) => Number.parseFloat(v.price ?? ''))
        .filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length === 0)
        return 0;
    return Math.min(...prices);
};
exports.getProductListPriceUsd = getProductListPriceUsd;
const sortProductPool = (pool, sort) => {
    const sorted = [...pool].sort((a, b) => {
        const pa = (0, exports.getProductListPriceUsd)(a);
        const pb = (0, exports.getProductListPriceUsd)(b);
        return pa - pb;
    });
    return sort === 'high-to-low' ? sorted.reverse() : sorted;
};
exports.sortProductPool = sortProductPool;
const buildCollectionProductsUrl = (collectionHandle, page, limit = 250) => {
    const search = new URLSearchParams({
        limit: String(limit),
        page: String(page),
    });
    return `${constants_1.EMPRESS_BASE_URL}/collections/${collectionHandle}/products.json?${search}`;
};
exports.buildCollectionProductsUrl = buildCollectionProductsUrl;
const fetchCollectionProductsPage = async (collectionHandle, page, retries = 3) => {
    const url = (0, exports.buildCollectionProductsUrl)(collectionHandle, page);
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, { headers: DEFAULT_HEADERS });
            const text = await res.text();
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
            }
            const json = JSON.parse(text);
            return json.products ?? [];
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < retries) {
                await sleep(600 * attempt);
            }
        }
    }
    throw lastError ?? new Error('Fetch failed');
};
exports.fetchCollectionProductsPage = fetchCollectionProductsPage;
const fetchProductPool = async (options) => {
    const seen = new Set();
    const pool = [];
    const delay = options.pageDelayMs ?? 350;
    let pagesFetched = 0;
    for (let page = 1; page <= options.maxPages; page += 1) {
        const batch = await (0, exports.fetchCollectionProductsPage)(options.collectionHandle, page);
        pagesFetched = page;
        if (batch.length === 0)
            break;
        for (const p of batch) {
            const id = String(p.id ?? '').trim();
            if (!id || seen.has(id))
                continue;
            seen.add(id);
            pool.push(p);
        }
        options.onPage?.(page, batch.length, pool.length);
        if (pool.length >= options.needed)
            break;
        if (batch.length < 250)
            break;
        if (page < options.maxPages)
            await sleep(delay);
    }
    const sorted = (0, exports.sortProductPool)(pool, options.sort ?? 'low-to-high');
    return { products: sorted, pagesFetched };
};
exports.fetchProductPool = fetchProductPool;
