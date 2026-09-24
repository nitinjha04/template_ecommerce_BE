import type { EmpressScrapedProductDocument } from './types';

const EMPRESS_PATTERN = /empress/gi;

const casaqForMatch = (match: string): string => {
  if (match === match.toUpperCase()) return 'CASAQ';
  if (match[0] === match[0].toUpperCase()) return 'Casaq';
  return 'casaq';
};

export const replaceEmpressWithCasaq = (text: string): string =>
  text.replace(EMPRESS_PATTERN, casaqForMatch);

const sanitizeString = (value: string): string => replaceEmpressWithCasaq(value);

const sanitizeArray = (items: string[]): string[] => items.map(sanitizeString);

export const sanitizeScrapedProduct = (
  doc: EmpressScrapedProductDocument
): EmpressScrapedProductDocument => ({
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
  _source: doc._source,
});
