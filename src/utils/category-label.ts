/**
 * PLT (and similar) scrapes sometimes store a full breadcrumb as the category:
 *   "Brands > Clauneck > Clauneck Clothing > Clauneck Denim"
 * Shop filters and header chips should show only the leaf: "Denim".
 */

const BRAND_PREFIX =
  /^(pretty\s*little\s*thing|plt(\s+shape)?|clauneck|nextriva|higreenny|bhojak|mohdeep|bros)\s+/i;

const JUNK_LEAF =
  /^(brands?|clothing|clothes|women'?s?|men'?s?|shop by fit|shop)$/i;

export const isPathStyleCategory = (value?: string | null): boolean =>
  String(value ?? '').includes('>');

export const shortenCategoryLabel = (value?: string | null): string => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (!isPathStyleCategory(text)) return text;

  const parts = text
    .split(/\s*>\s*/)
    .map((part) => part.trim().replace(BRAND_PREFIX, '').trim())
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const leaf = parts[i];
    if (leaf && !JUNK_LEAF.test(leaf)) return leaf;
  }

  return parts[parts.length - 1] || text;
};
