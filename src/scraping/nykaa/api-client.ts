import type { NykaaSortOrder } from './category-config';
import type { NykaaProductRaw, NykaaProductsApiResponse } from './types';

const BASE_URL =
  'https://www.nykaafashion.com/rest/appapi/V2/categories/products';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-IN,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://www.nykaafashion.com/',
  Origin: 'https://www.nykaafashion.com',
};

export type FetchCategoryProductsParams = {
  categoryFilter: string;
  categoryId?: string;
  currentPage: number;
  pageSize?: number;
  sort?: NykaaSortOrder;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const buildProductsUrl = (params: FetchCategoryProductsParams): string => {
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

export const fetchCategoryProductsPage = async (
  params: FetchCategoryProductsParams,
  retries = 3
): Promise<NykaaProductRaw[]> => {
  const url = buildProductsUrl(params);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      if (text.trimStart().startsWith('<')) {
        throw new Error(
          'Blocked by CDN (HTML response). Run the script on your machine or save API pages and use --from-raw.'
        );
      }

      const json = JSON.parse(text) as NykaaProductsApiResponse;
      if (json.status !== 'success' || !json.response?.products) {
        throw new Error(json.message ?? 'Unexpected API response');
      }

      return json.response.products;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await sleep(800 * attempt);
      }
    }
  }

  throw lastError ?? new Error('Fetch failed');
};

/** Paginate until `needed` unique products or `maxPages` reached. */
export const fetchProductPool = async (options: {
  categoryFilter: string;
  categoryId: string;
  needed: number;
  maxPages: number;
  sort?: NykaaSortOrder;
  pageSize?: number;
  pageDelayMs?: number;
  onPage?: (page: number, batchSize: number, total: number) => void;
}): Promise<{ products: NykaaProductRaw[]; pagesFetched: number }> => {
  const seen = new Set<string>();
  const pool: NykaaProductRaw[] = [];
  const delay = options.pageDelayMs ?? 400;
  let pagesFetched = 0;

  for (let page = 1; page <= options.maxPages; page += 1) {
    const batch = await fetchCategoryProductsPage({
      categoryFilter: options.categoryFilter,
      categoryId: options.categoryId,
      currentPage: page,
      pageSize: options.pageSize,
      sort: options.sort,
    });
    pagesFetched = page;

    if (batch.length === 0) break;

    for (const p of batch) {
      const id = p.id?.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      pool.push(p);
    }

    options.onPage?.(page, batch.length, pool.length);

    if (pool.length >= options.needed) break;
    const pageSize = options.pageSize ?? 50;
    if (batch.length < pageSize) break;

    if (page < options.maxPages) await sleep(delay);
  }

  return { products: pool, pagesFetched };
};
