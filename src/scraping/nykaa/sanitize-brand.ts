import type { ScrapedProductDocument } from './types';

/** Match "nykaa" in any casing (e.g. Nykaa, NYKAA, nykaafashion → casaqfashion). */
const NYKAA_PATTERN = /nykaa/gi;

const casaqForMatch = (match: string): string => {
  if (match === match.toUpperCase()) return 'CASAQ';
  if (match[0] === match[0].toUpperCase()) return 'Casaq';
  return 'casaq';
};

/** Replace Nykaa branding with Casaq in customer-facing text (not image URLs). */
export const replaceNykaaWithCasaq = (text: string): string =>
  text.replace(NYKAA_PATTERN, casaqForMatch);

const sanitizeString = (value: string): string => replaceNykaaWithCasaq(value);

const sanitizeOptional = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : sanitizeString(value);

const sanitizeArray = (items: string[]): string[] => items.map(sanitizeString);

/** Strip Nykaa from all stored product text fields; leaves `images` unchanged. */
export const sanitizeScrapedProduct = (
  doc: ScrapedProductDocument
): ScrapedProductDocument => ({
  ...doc,
  name: sanitizeString(doc.name),
  slug: sanitizeString(doc.slug),
  category: sanitizeString(doc.category),
  description: sanitizeString(doc.description),
  metaTitle: sanitizeString(doc.metaTitle),
  metaDescription: sanitizeString(doc.metaDescription),
  metaKeywords: sanitizeArray(doc.metaKeywords),
  sizes: sanitizeArray(doc.sizes),
  colors: sanitizeArray(doc.colors),
  tags: sanitizeArray(doc.tags),
  fabricComposition: sanitizeString(doc.fabricComposition),
  garmentLength: sanitizeString(doc.garmentLength),
  packageContains: sanitizeString(doc.packageContains),
  washCare: sanitizeString(doc.washCare),
  neckline: sanitizeString(doc.neckline),
  sleeveLength: sanitizeString(doc.sleeveLength),
  fitting: sanitizeString(doc.fitting),
  weight: sanitizeString(doc.weight),
  dimensions: sanitizeString(doc.dimensions),
  breadcrumbCategory: sanitizeString(doc.breadcrumbCategory),
  images: doc.images,
  _source: doc._source
    ? {
        ...doc._source,
        sku: sanitizeOptional(doc._source.sku),
      }
    : undefined,
});
