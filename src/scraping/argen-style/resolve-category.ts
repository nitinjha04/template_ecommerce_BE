import type { NykaaProductRaw } from '../nykaa/types';

export type CategoryIdMap = Record<string, string>;

export const loadCategoryMap = (raw: CategoryIdMap): CategoryIdMap => {
  const out: CategoryIdMap = {};
  for (const [id, name] of Object.entries(raw)) {
    const key = String(id).trim();
    const label = String(name).trim();
    if (key && label) out[key] = label;
  }
  return out;
};

/** Pick the first Nykaa leaf category id present on the product. */
export const resolveCategoryFromProduct = (
  raw: NykaaProductRaw,
  categoryMap: CategoryIdMap
): string | null => {
  const ids = raw.categoryId ?? [];
  for (const id of ids) {
    const key = String(id).trim();
    if (categoryMap[key]) return categoryMap[key];
  }
  return null;
};
