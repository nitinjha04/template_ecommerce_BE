"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeScrapedProduct = exports.replaceSourceBrandWithNexa = void 0;
const BRAND_PATTERN = /\b(max|landmark|urb_n)\b/gi;
const brandForMatch = (match) => {
    if (match.toUpperCase() === 'URB_N')
        return 'Nexa Skyline';
    if (match === match.toUpperCase())
        return 'NEXA SKYLINE';
    if (match[0] === match[0].toUpperCase())
        return 'Nexa Skyline';
    return 'nexa skyline';
};
const replaceSourceBrandWithNexa = (text) => text.replace(BRAND_PATTERN, brandForMatch);
exports.replaceSourceBrandWithNexa = replaceSourceBrandWithNexa;
const sanitizeString = (value) => (0, exports.replaceSourceBrandWithNexa)(value);
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
