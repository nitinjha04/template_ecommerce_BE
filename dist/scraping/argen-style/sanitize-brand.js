"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeScrapedProduct = exports.sanitizeText = exports.stripPakistanReferences = exports.replaceNykaaWithArgen = void 0;
const NYKAA_PATTERN = /nykaa/gi;
const PAKISTAN_PATTERN = /\bpakistan(i)?\b/gi;
const brandForMatch = (match) => {
    if (match === match.toUpperCase())
        return 'ARGEN STYLE';
    if (match[0] === match[0].toUpperCase())
        return 'Argen Style';
    return 'argen style';
};
const replaceNykaaWithArgen = (text) => text.replace(NYKAA_PATTERN, brandForMatch);
exports.replaceNykaaWithArgen = replaceNykaaWithArgen;
const stripPakistanReferences = (text) => text.replace(PAKISTAN_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
exports.stripPakistanReferences = stripPakistanReferences;
const sanitizeText = (text) => (0, exports.stripPakistanReferences)((0, exports.replaceNykaaWithArgen)(text));
exports.sanitizeText = sanitizeText;
const sanitizeArray = (items) => items.map(exports.sanitizeText).filter(Boolean);
/** Argen Style text cleanup; image URLs unchanged. */
const sanitizeScrapedProduct = (doc) => ({
    ...doc,
    name: (0, exports.sanitizeText)(doc.name),
    slug: (0, exports.sanitizeText)(doc.slug),
    category: (0, exports.sanitizeText)(doc.category),
    description: (0, exports.sanitizeText)(doc.description),
    metaTitle: (0, exports.sanitizeText)(doc.metaTitle),
    metaDescription: (0, exports.sanitizeText)(doc.metaDescription),
    metaKeywords: sanitizeArray(doc.metaKeywords),
    sizes: sanitizeArray(doc.sizes),
    colors: sanitizeArray(doc.colors),
    tags: sanitizeArray(doc.tags),
    fabricComposition: (0, exports.sanitizeText)(doc.fabricComposition),
    garmentLength: (0, exports.sanitizeText)(doc.garmentLength),
    packageContains: (0, exports.sanitizeText)(doc.packageContains),
    washCare: (0, exports.sanitizeText)(doc.washCare),
    neckline: (0, exports.sanitizeText)(doc.neckline),
    sleeveLength: (0, exports.sanitizeText)(doc.sleeveLength),
    fitting: (0, exports.sanitizeText)(doc.fitting),
    weight: (0, exports.sanitizeText)(doc.weight),
    dimensions: (0, exports.sanitizeText)(doc.dimensions),
    breadcrumbCategory: (0, exports.sanitizeText)(doc.breadcrumbCategory),
    images: doc.images,
    _source: doc._source,
});
exports.sanitizeScrapedProduct = sanitizeScrapedProduct;
