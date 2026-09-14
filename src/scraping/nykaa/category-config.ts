import * as fs from 'fs';
import * as path from 'path';

export type NykaaSortOrder = 'low-to-high' | 'high-to-low';

export type CategoryScrapeConfig = {
  categoryFilter: string;
  categoryName: string;
  priceMin: number;
  priceMax: number;
  limit?: number;
  sort?: NykaaSortOrder;
  categoryId?: string;
};

export type CategoryConfigFile = CategoryScrapeConfig[];

const DEFAULT_CONFIG_PATH = path.join(__dirname, 'categories.example.json');

export const normalizeSort = (sort?: string): NykaaSortOrder => {
  const s = sort?.trim().toLowerCase();
  if (s === 'high-to-low' || s === 'high_to_low') return 'high-to-low';
  return 'low-to-high';
};

const validateEntry = (entry: unknown, index: number): CategoryScrapeConfig => {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`categories[${index}]: must be an object`);
  }

  const row = entry as Record<string, unknown>;
  const categoryFilter = String(row.categoryFilter ?? '').trim();
  const categoryName = String(row.categoryName ?? '').trim();
  const priceMin = Number(row.priceMin);
  const priceMax = Number(row.priceMax);

  if (!categoryFilter) throw new Error(`categories[${index}]: categoryFilter is required`);
  if (!categoryName) throw new Error(`categories[${index}]: categoryName is required`);
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
    throw new Error(`categories[${index}]: invalid priceMin / priceMax`);
  }

  const config: CategoryScrapeConfig = {
    categoryFilter,
    categoryName,
    priceMin,
    priceMax,
    sort: normalizeSort(row.sort as string | undefined),
  };

  if (row.limit !== undefined) {
    const limit = Number(row.limit);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new Error(`categories[${index}]: limit must be a positive number`);
    }
    config.limit = Math.floor(limit);
  }

  if (row.categoryId !== undefined) {
    config.categoryId = String(row.categoryId).trim();
  }

  return config;
};

export const loadCategoryConfigFile = (filePath?: string): CategoryConfigFile => {
  const abs = path.resolve(filePath?.trim() || DEFAULT_CONFIG_PATH);
  if (!fs.existsSync(abs)) {
    throw new Error(`Config file not found: ${abs}`);
  }

  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Config file must be a non-empty JSON array');
  }

  return parsed.map((entry, index) => validateEntry(entry, index));
};
