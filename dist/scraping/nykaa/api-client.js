"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProductPool = exports.fetchCategoryProductsPage = exports.buildProductsUrl = void 0;
const BASE_URL = 'https://www.nykaafashion.com/rest/appapi/V2/categories/products';
const DEFAULT_HEADERS = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-IN,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Referer: 'https://www.nykaafashion.com/',
    Origin: 'https://www.nykaafashion.com',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const buildProductsUrl = (params) => {
    const search = new URLSearchParams({
        PageSize: String(params.pageSize ?? 50),
        filter_format: 'v2',
        apiVersion: '6',
        currency: 'INR',
        country_code: 'IN',
        deviceType: 'WEBSITE',
        sort: params.sort ?? 'low-to-high',
        device_os: 'desktop',
        categoryId: params.categoryId ?? '6557',
        currentPage: String(params.currentPage),
        category_filter: params.categoryFilter,
        sort_algo: 'ltr_pinning',
    });
    return `${BASE_URL}?${search.toString()}`;
};
exports.buildProductsUrl = buildProductsUrl;
const fetchCategoryProductsPage = async (params, retries = 3) => {
    const url = (0, exports.buildProductsUrl)(params);
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, { headers: DEFAULT_HEADERS });
            const text = await res.text();
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
            }
            if (text.trimStart().startsWith('<')) {
                throw new Error('Blocked by CDN (HTML response). Run the script on your machine or save API pages and use --from-raw.');
            }
            const json = JSON.parse(text);
            if (json.status !== 'success' || !json.response?.products) {
                throw new Error(json.message ?? 'Unexpected API response');
            }
            return json.response.products;
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < retries) {
                await sleep(800 * attempt);
            }
        }
    }
    throw lastError ?? new Error('Fetch failed');
};
exports.fetchCategoryProductsPage = fetchCategoryProductsPage;
/** Paginate until `needed` unique products or `maxPages` reached. */
const fetchProductPool = async (options) => {
    const seen = new Set();
    const pool = [];
    const delay = options.pageDelayMs ?? 400;
    let pagesFetched = 0;
    for (let page = 1; page <= options.maxPages; page += 1) {
        const batch = await (0, exports.fetchCategoryProductsPage)({
            categoryFilter: options.categoryFilter,
            categoryId: options.categoryId,
            currentPage: page,
            sort: options.sort,
        });
        pagesFetched = page;
        if (batch.length === 0)
            break;
        for (const p of batch) {
            const id = p.id?.trim();
            if (!id || seen.has(id))
                continue;
            seen.add(id);
            pool.push(p);
        }
        options.onPage?.(page, batch.length, pool.length);
        if (pool.length >= options.needed)
            break;
        if (batch.length < 50)
            break;
        if (page < options.maxPages)
            await sleep(delay);
    }
    return { products: pool, pagesFetched };
};
exports.fetchProductPool = fetchProductPool;
