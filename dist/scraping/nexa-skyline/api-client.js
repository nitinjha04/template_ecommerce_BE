"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProductPool = exports.fetchCatalogCount = exports.fetchCategoryPage = exports.buildSearchUrl = void 0;
const constants_1 = require("./constants");
const DEFAULT_HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toSortParam = (sort) => sort === 'high-to-low' ? 'price desc' : 'price asc';
const buildSearchUrl = (params) => {
    const search = new URLSearchParams();
    search.set('rows', String(params.rows ?? constants_1.DEFAULT_PAGE_SIZE));
    search.set('page', String(params.page));
    search.set('pagetype', 'boolean');
    search.set('p', `allCategories_uFilter:${params.categorySlug}`);
    search.set('facet', 'true');
    search.set('selectedfacet', 'true');
    search.set('facet.multiselect', 'true');
    search.set('fields', constants_1.UNBXD_FIELDS);
    search.append('filter', `allCategories:"${params.categorySlug}"`);
    search.append('filter', 'inStock:"1"');
    search.append('filter', 'approvalStatus:"1"');
    search.set('stats', 'price');
    search.set('q', '*');
    search.set('sort', toSortParam(params.sort ?? 'low-to-high'));
    return `${constants_1.UNBXD_SEARCH_URL}?${search.toString()}`;
};
exports.buildSearchUrl = buildSearchUrl;
const fetchCategoryPage = async (params, retries = 3) => {
    const url = (0, exports.buildSearchUrl)(params);
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, { headers: DEFAULT_HEADERS });
            const text = await res.text();
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
            }
            const json = JSON.parse(text);
            return {
                products: json.response?.products ?? [],
                total: json.response?.numberOfProducts ?? 0,
            };
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < retries)
                await sleep(500 * attempt);
        }
    }
    throw lastError ?? new Error('Unbxd fetch failed');
};
exports.fetchCategoryPage = fetchCategoryPage;
/** In-stock approved product count for a category slug. */
const fetchCatalogCount = async (categorySlug) => {
    const { total } = await (0, exports.fetchCategoryPage)({ categorySlug, page: 1, rows: 1 });
    return total;
};
exports.fetchCatalogCount = fetchCatalogCount;
const fetchProductPool = async (options) => {
    const seen = new Set();
    const pool = [];
    const delay = options.pageDelayMs ?? 350;
    const pageSize = options.pageSize ?? constants_1.DEFAULT_PAGE_SIZE;
    let pagesFetched = 0;
    let catalogTotal = 0;
    for (let page = 1; page <= options.maxPages; page += 1) {
        const { products, total } = await (0, exports.fetchCategoryPage)({
            categorySlug: options.categorySlug,
            page,
            rows: pageSize,
            sort: options.sort,
        });
        pagesFetched = page;
        catalogTotal = total;
        if (products.length === 0)
            break;
        for (const product of products) {
            const id = product.uniqueId?.trim();
            if (!id || seen.has(id))
                continue;
            seen.add(id);
            pool.push(product);
        }
        options.onPage?.(page, products.length, pool.length, catalogTotal);
        if (pool.length >= options.needed)
            break;
        if (products.length < pageSize)
            break;
        if (page * pageSize >= catalogTotal)
            break;
        if (page < options.maxPages)
            await sleep(delay);
    }
    return { products: pool, pagesFetched, catalogTotal };
};
exports.fetchProductPool = fetchProductPool;
