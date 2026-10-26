import { EMPRESS_BASE_URL } from './constants';
import type { EmpressProductRaw, ShopifyProductsResponse } from './types';
import type { EmpressSortOrder } from './category-config';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Approximate INR shown on site (USD list price × ~95). */
export const estimateInrFromShopifyPrice = (usdPrice: number): number =>
  Math.round(usdPrice * 95);

export const getProductListPriceUsd = (raw: EmpressProductRaw): number => {
  const prices = (raw.variants ?? [])
    .map((v) => Number.parseFloat(v.price ?? ''))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length === 0) return 0;
  return Math.min(...prices);
};

export const sortProductPool = (
  pool: EmpressProductRaw[],
  sort: EmpressSortOrder
): EmpressProductRaw[] => {
  const sorted = [...pool].sort((a, b) => {
    const pa = getProductListPriceUsd(a);
    const pb = getProductListPriceUsd(b);
    return pa - pb;
  });
  return sort === 'high-to-low' ? sorted.reverse() : sorted;
};

export const buildCollectionProductsUrl = (
  collectionHandle: string,
  page: number,
  limit = 250
): string => {
  const search = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  return `${EMPRESS_BASE_URL}/collections/${collectionHandle}/products.json?${search}`;
};

export const fetchCollectionProductsPage = async (
  collectionHandle: string,
  page: number,
  retries = 3
): Promise<EmpressProductRaw[]> => {
  const url = buildCollectionProductsUrl(collectionHandle, page);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const json = JSON.parse(text) as ShopifyProductsResponse;
      return json.products ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await sleep(600 * attempt);
      }
    }
  }

  throw lastError ?? new Error('Fetch failed');
};

export const fetchProductPool = async (options: {
  collectionHandle: string;
  needed: number;
  maxPages: number;
  sort?: EmpressSortOrder;
  pageDelayMs?: number;
  onPage?: (page: number, batchSize: number, total: number) => void;
}): Promise<{ products: EmpressProductRaw[]; pagesFetched: number }> => {
  const seen = new Set<string>();
  const pool: EmpressProductRaw[] = [];
  const delay = options.pageDelayMs ?? 350;
  let pagesFetched = 0;

  for (let page = 1; page <= options.maxPages; page += 1) {
    const batch = await fetchCollectionProductsPage(options.collectionHandle, page);
    pagesFetched = page;

    if (batch.length === 0) break;

    for (const p of batch) {
      const id = String(p.id ?? '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      pool.push(p);
    }

    options.onPage?.(page, batch.length, pool.length);

    if (pool.length >= options.needed) break;
    if (batch.length < 250) break;

    if (page < options.maxPages) await sleep(delay);
  }

  const sorted = sortProductPool(pool, options.sort ?? 'low-to-high');
  return { products: sorted, pagesFetched };
};
