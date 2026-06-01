import * as fs from 'fs';
import * as path from 'path';
import {
  ARGEN_STORE_ID,
  DEFAULT_CATEGORY_FILTER,
  DEFAULT_CATEGORY_ID,
  DEFAULT_PAGE_SIZE,
} from './constants';
import type { NykaaSortOrder } from '../nykaa/category-config';
import { normalizeSort } from '../nykaa/category-config';

export type PriceBandConfig = {
  priceMin: number;
  priceMax: number;
  limit: number;
};

export type PoolScrapeConfig = {
  storeId: string;
  categoryFilter: string;
  categoryId: string;
  pageSize: number;
  sort: NykaaSortOrder;
  priceBands: PriceBandConfig[];
};

const DEFAULT_CONFIG = path.join(__dirname, 'pool-config.json');

const validateBand = (row: unknown, index: number): PriceBandConfig => {
  if (!row || typeof row !== 'object') {
    throw new Error(`priceBands[${index}]: must be an object`);
  }
  const band = row as Record<string, unknown>;
  const priceMin = Number(band.priceMin);
  const priceMax = Number(band.priceMax);
  const limit = Number(band.limit ?? 50);

  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
    throw new Error(`priceBands[${index}]: invalid priceMin / priceMax`);
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`priceBands[${index}]: limit must be positive`);
  }

  return { priceMin, priceMax, limit: Math.floor(limit) };
};

export const loadPoolConfig = (filePath?: string): PoolScrapeConfig => {
  const abs = path.resolve(filePath?.trim() || DEFAULT_CONFIG);
  if (!fs.existsSync(abs)) {
    throw new Error(`Config not found: ${abs}`);
  }

  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as Record<string, unknown>;
  const bandsRaw = parsed.priceBands;
  if (!Array.isArray(bandsRaw) || bandsRaw.length === 0) {
    throw new Error('pool-config.json must include a non-empty priceBands array');
  }

  return {
    storeId: String(parsed.storeId ?? ARGEN_STORE_ID).trim(),
    categoryFilter: String(parsed.categoryFilter ?? DEFAULT_CATEGORY_FILTER).trim(),
    categoryId: String(parsed.categoryId ?? DEFAULT_CATEGORY_ID).trim(),
    pageSize: Number(parsed.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE,
    sort: normalizeSort(String(parsed.sort ?? 'low-to-high')),
    priceBands: bandsRaw.map((band, i) => validateBand(band, i)),
  };
};

export const totalProductsNeeded = (config: PoolScrapeConfig): number =>
  config.priceBands.reduce((sum, b) => sum + b.limit, 0);
