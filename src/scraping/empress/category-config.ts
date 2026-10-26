import * as fs from 'fs';
import * as path from 'path';

export type EmpressSortOrder = 'low-to-high' | 'high-to-low';

export type EmpressCategoryScrapeConfig = {
  /** Shopify collection handle (URL segment). */
  collectionHandle: string;
  /** Full collection URL for logging / manifest. */
  collectionUrl?: string;
  categoryName: string;
  priceMin: number;
  priceMax: number;
  limit?: number;
  sort?: EmpressSortOrder;
};

export type EmpressCategoryConfigFile = EmpressCategoryScrapeConfig[];

const DEFAULT_CONFIG_PATH = path.join(__dirname, 'categories.example.json');

export const normalizeSort = (sort?: string): EmpressSortOrder => {
  const s = sort?.trim().toLowerCase();
  if (s === 'high-to-low' || s === 'high_to_low') return 'high-to-low';
  return 'low-to-high';
};

const buildCollectionUrl = (handle: string): string =>
  `https://empress-clothing.com/collections/${handle}`;

const validateEntry = (entry: unknown, index: number): EmpressCategoryScrapeConfig => {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`categories[${index}]: must be an object`);
  }

  const row = entry as Record<string, unknown>;
  const collectionHandle = String(
    row.collectionHandle ?? row.categoryFilter ?? ''
  ).trim();
  const categoryName = String(row.categoryName ?? '').trim();
  const priceMin = Number(row.priceMin);
  const priceMax = Number(row.priceMax);

  if (!collectionHandle) {
    throw new Error(`categories[${index}]: collectionHandle is required`);
  }
  if (!categoryName) throw new Error(`categories[${index}]: categoryName is required`);
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
    throw new Error(`categories[${index}]: invalid priceMin / priceMax`);
  }

  const config: EmpressCategoryScrapeConfig = {
    collectionHandle,
    collectionUrl:
      String(row.collectionUrl ?? '').trim() || buildCollectionUrl(collectionHandle),
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

  return config;
};

export const loadCategoryConfigFile = (filePath?: string): EmpressCategoryConfigFile => {
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
