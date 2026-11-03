"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeScrapedProduct = exports.replaceAachhoWithProtico = void 0;
const AACHHO_PATTERN = /\baachho\b/gi;
const brandForMatch = () => 'Protico';
const replaceAachhoWithProtico = (text) => text.replace(AACHHO_PATTERN, brandForMatch);
exports.replaceAachhoWithProtico = replaceAachhoWithProtico;
const sanitizeString = (value) => (0, exports.replaceAachhoWithProtico)(value);
const sanitizeArray = (items) => items.map(sanitizeString);
const sanitizeScrapedProduct = (doc) => ({
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
exports.sanitizeScrapedProduct = sanitizeScrapedProduct;
