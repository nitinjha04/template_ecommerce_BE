import * as fs from 'fs';
import * as path from 'path';
import type { NykaaSortOrder } from '../nykaa/category-config';
import { normalizeSort } from '../nykaa/category-config';

export type NexaCategoryScrapeConfig = {
  categorySlug: string;
  categoryName: string;
  priceMin: number;
  priceMax: number;
  limit?: number;
  sort?: NykaaSortOrder;
};

export type NexaCategoryConfigFile = NexaCategoryScrapeConfig[];

const DEFAULT_CONFIG_PATH = path.join(__dirname, 'categories.example.json');

const slugToName = (slug: string): string => {
  const leaf = slug.split('-').pop() ?? slug;
  return leaf.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/and/g, ' and ');
};

const validateEntry = (entry: unknown, index: number): NexaCategoryScrapeConfig => {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`categories[${index}]: must be an object`);
  }

  const row = entry as Record<string, unknown>;
  const categorySlug = String(row.categorySlug ?? row.categoryFilter ?? '').trim();
  const categoryName = String(row.categoryName ?? '').trim() || slugToName(categorySlug);
  const priceMin = Number(row.priceMin);
  const priceMax = Number(row.priceMax);

  if (!categorySlug) {
    throw new Error(`categories[${index}]: categorySlug is required`);
  }
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
    throw new Error(`categories[${index}]: invalid priceMin / priceMax`);
  }

  const config: NexaCategoryScrapeConfig = {
    categorySlug,
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

export const loadCategoryConfigFile = (filePath?: string): NexaCategoryConfigFile => {
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

export const loadAllCategoriesFile = (filePath?: string): string[] => {
  const abs = path.resolve(filePath?.trim() || path.join(__dirname, 'allCategories.json'));
  const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8')) as { categories?: string[] };
  if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
    throw new Error('allCategories.json must contain a non-empty categories array');
  }
  return parsed.categories.map((c) => String(c).trim()).filter(Boolean);
};
