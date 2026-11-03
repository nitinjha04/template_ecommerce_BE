import {
  DEFAULT_PAGE_SIZE,
  UNBXD_FIELDS,
  UNBXD_SEARCH_URL,
} from './constants';
import type { NexaProductRaw, NexaSortOrder, UnbxdSearchResponse } from './types';

export type { NexaSortOrder };

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const toSortParam = (sort: NexaSortOrder): string =>
  sort === 'high-to-low' ? 'price desc' : 'price asc';

export const buildSearchUrl = (params: {
  categorySlug: string;
  page: number;
  rows?: number;
  sort?: NexaSortOrder;
}): string => {
  const search = new URLSearchParams();
  search.set('rows', String(params.rows ?? DEFAULT_PAGE_SIZE));
  search.set('page', String(params.page));
  search.set('pagetype', 'boolean');
  search.set('p', `allCategories_uFilter:${params.categorySlug}`);
  search.set('facet', 'true');
  search.set('selectedfacet', 'true');
  search.set('facet.multiselect', 'true');
  search.set('fields', UNBXD_FIELDS);
  search.append('filter', `allCategories:"${params.categorySlug}"`);
  search.append('filter', 'inStock:"1"');
  search.append('filter', 'approvalStatus:"1"');
  search.set('stats', 'price');
  search.set('q', '*');
  search.set('sort', toSortParam(params.sort ?? 'low-to-high'));

  return `${UNBXD_SEARCH_URL}?${search.toString()}`;
};

export const fetchCategoryPage = async (
  params: {
    categorySlug: string;
    page: number;
    rows?: number;
    sort?: NexaSortOrder;
  },
  retries = 3
): Promise<{ products: NexaProductRaw[]; total: number }> => {
  const url = buildSearchUrl(params);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const json = JSON.parse(text) as UnbxdSearchResponse;
      return {
        products: json.response?.products ?? [],
        total: json.response?.numberOfProducts ?? 0,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) await sleep(500 * attempt);
    }
  }

  throw lastError ?? new Error('Unbxd fetch failed');
};

/** In-stock approved product count for a category slug. */
export const fetchCatalogCount = async (categorySlug: string): Promise<number> => {
  const { total } = await fetchCategoryPage({ categorySlug, page: 1, rows: 1 });
  return total;
};

export const fetchProductPool = async (options: {
  categorySlug: string;
  needed: number;
  maxPages: number;
  sort?: NexaSortOrder;
  pageSize?: number;
  pageDelayMs?: number;
  onPage?: (page: number, batchSize: number, total: number, catalogTotal: number) => void;
}): Promise<{ products: NexaProductRaw[]; pagesFetched: number; catalogTotal: number }> => {
  const seen = new Set<string>();
  const pool: NexaProductRaw[] = [];
  const delay = options.pageDelayMs ?? 350;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  let pagesFetched = 0;
  let catalogTotal = 0;

  for (let page = 1; page <= options.maxPages; page += 1) {
    const { products, total } = await fetchCategoryPage({
      categorySlug: options.categorySlug,
      page,
      rows: pageSize,
      sort: options.sort,
    });
    pagesFetched = page;
    catalogTotal = total;

    if (products.length === 0) break;

    for (const product of products) {
      const id = product.uniqueId?.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      pool.push(product);
    }

    options.onPage?.(page, products.length, pool.length, catalogTotal);

    if (pool.length >= options.needed) break;
    if (products.length < pageSize) break;
    if (page * pageSize >= catalogTotal) break;

    if (page < options.maxPages) await sleep(delay);
  }

  return { products: pool, pagesFetched, catalogTotal };
};
