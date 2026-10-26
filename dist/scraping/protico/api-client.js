"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProductPool = exports.fetchCatalogCount = exports.fetchFilterPage = exports.buildFilterUrl = void 0;
const constants_1 = require("./constants");
const DEFAULT_HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const buildFilterUrl = (filterValue, page) => {
    const search = new URLSearchParams();
    search.set('filter_id', constants_1.GLOBO_FILTER_ID);
    search.set('collection', constants_1.GLOBO_COLLECTION);
    search.set('sort_by', 'manual');
    search.set('shop', constants_1.GLOBO_SHOP);
    search.set('market_id', constants_1.GLOBO_MARKET_ID);
    search.set('country', constants_1.GLOBO_COUNTRY);
    search.set('event', 'loadmore');
    search.append(`filter[${constants_1.GLOBO_FILTER_KEY}][]`, filterValue);
    search.set('page', String(page));
    search.set('cid', constants_1.GLOBO_CID);
    search.set('did', constants_1.GLOBO_DID);
    search.set('page_type', 'collection');
    return `${constants_1.GLOBO_API_URL}?${search.toString()}`;
};
exports.buildFilterUrl = buildFilterUrl;
const fetchFilterPage = async (filterValue, page, retries = 3) => {
    const url = (0, exports.buildFilterUrl)(filterValue, page);
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, { headers: DEFAULT_HEADERS });
            const text = await res.text();
            if (!res.ok)
                throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
            const json = JSON.parse(text);
            return {
                products: json.products ?? [],
                total: json.pagination?.total ?? json.products?.length ?? 0,
            };
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < retries)
                await sleep(500 * attempt);
        }
    }
    throw lastError ?? new Error('Globo fetch failed');
};
exports.fetchFilterPage = fetchFilterPage;
const fetchCatalogCount = async (filterValue) => {
    const { total } = await (0, exports.fetchFilterPage)(filterValue, 1);
    return total;
};
exports.fetchCatalogCount = fetchCatalogCount;
const fetchProductPool = async (options) => {
    const seen = new Set();
    const pool = [];
    const delay = options.pageDelayMs ?? 400;
    let pagesFetched = 0;
    let catalogTotal = 0;
    for (let page = 1; page <= options.maxPages; page += 1) {
        const { products, total } = await (0, exports.fetchFilterPage)(options.filterValue, page);
        pagesFetched = page;
        catalogTotal = total;
        if (products.length === 0)
            break;
        for (const product of products) {
            const id = String(product.id ?? '').trim();
            if (!id || seen.has(id))
                continue;
            seen.add(id);
            pool.push(product);
        }
        options.onPage?.(page, products.length, pool.length, catalogTotal);
        if (pool.length >= options.needed)
            break;
        if (pool.length >= catalogTotal)
            break;
        if (page < options.maxPages)
            await sleep(delay);
    }
    return { products: pool, pagesFetched, catalogTotal };
};
exports.fetchProductPool = fetchProductPool;
