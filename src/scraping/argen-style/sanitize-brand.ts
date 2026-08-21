import type { ScrapedProductDocument } from '../nykaa/types';

const NYKAA_PATTERN = /nykaa/gi;
const PAKISTAN_PATTERN = /\bpakistan(i)?\b/gi;

const brandForMatch = (match: string): string => {
  if (match === match.toUpperCase()) return 'ARGEN STYLE';
  if (match[0] === match[0].toUpperCase()) return 'Argen Style';
  return 'argen style';
};

export const replaceNykaaWithArgen = (text: string): string =>
  text.replace(NYKAA_PATTERN, brandForMatch);

export const stripPakistanReferences = (text: string): string =>
  text.replace(PAKISTAN_PATTERN, '').replace(/\s{2,}/g, ' ').trim();

export const sanitizeText = (text: string): string =>
  stripPakistanReferences(replaceNykaaWithArgen(text));

const sanitizeArray = (items: string[]): string[] =>
  items.map(sanitizeText).filter(Boolean);

/** Argen Style text cleanup; image URLs unchanged. */
export const sanitizeScrapedProduct = (
  doc: ScrapedProductDocument
): ScrapedProductDocument => ({
  ...doc,
  name: sanitizeText(doc.name),
  slug: sanitizeText(doc.slug),
  category: sanitizeText(doc.category),
  description: sanitizeText(doc.description),
  metaTitle: sanitizeText(doc.metaTitle),
  metaDescription: sanitizeText(doc.metaDescription),
  metaKeywords: sanitizeArray(doc.metaKeywords),
  sizes: sanitizeArray(doc.sizes),
  colors: sanitizeArray(doc.colors),
  tags: sanitizeArray(doc.tags),
  fabricComposition: sanitizeText(doc.fabricComposition),
  garmentLength: sanitizeText(doc.garmentLength),
  packageContains: sanitizeText(doc.packageContains),
  washCare: sanitizeText(doc.washCare),
  neckline: sanitizeText(doc.neckline),
  sleeveLength: sanitizeText(doc.sleeveLength),
  fitting: sanitizeText(doc.fitting),
  weight: sanitizeText(doc.weight),
  dimensions: sanitizeText(doc.dimensions),
  breadcrumbCategory: sanitizeText(doc.breadcrumbCategory),
  images: doc.images,
  _source: doc._source,
});
