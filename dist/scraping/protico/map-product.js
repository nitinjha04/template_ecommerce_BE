"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productImageKeys = exports.mapProticoToProductDocument = exports.buildProticoSlug = exports.extractColorFromTags = exports.collectProticoSizes = exports.collectProticoImages = void 0;
const slug_1 = require("../../utils/slug");
const random_product_details_1 = require("../../seed/v2/random-product-details");
const image_utils_1 = require("../argen-style/image-utils");
const sanitize_brand_1 = require("./sanitize-brand");
const normalizeImageUrl = (url) => (url.trim().startsWith('//') ? `https:${url.trim()}` : url.trim()).split('?')[0];
const collectProticoImages = (raw) => {
    const urls = [];
    const seen = new Set();
    const add = (url) => {
        if (!url)
            return;
        const clean = normalizeImageUrl(url);
        if (!clean || seen.has(clean))
            return;
        seen.add(clean);
        urls.push(clean);
    };
    const sorted = [...(raw.images ?? [])].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
    for (const img of sorted)
        add(img.src);
    add(raw.image?.src);
    return urls.slice(0, 8);
};
exports.collectProticoImages = collectProticoImages;
const collectProticoSizes = (raw) => {
    const sizeOption = (raw.options ?? []).find((o) => /size/i.test(o.name ?? ''));
    const fromOptions = (sizeOption?.values ?? []).map((v) => v.trim()).filter(Boolean);
    if (fromOptions.length > 0)
        return [...new Set(fromOptions)];
    const fromVariants = (raw.variants ?? [])
        .map((v) => v.title?.trim())
        .filter((t) => t && !/^default/i.test(t));
    if (fromVariants.length > 0)
        return [...new Set(fromVariants)];
    return ['Free Size', 'S', 'M', 'L', 'XL'];
};
exports.collectProticoSizes = collectProticoSizes;
const extractColorFromTags = (raw) => {
    for (const tag of raw.tags ?? []) {
        const m = String(tag).match(/^color[_-](.+)$/i);
        if (m?.[1]) {
            return m[1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }
    }
    const words = raw.title?.trim().split(/\s+/) ?? [];
    return words[0] ?? 'Multi';
};
exports.extractColorFromTags = extractColorFromTags;
const buildProticoSlug = (raw) => {
    const handle = raw.handle?.trim();
    if (handle)
        return (0, slug_1.slugify)(handle);
    const base = (0, slug_1.slugify)(raw.title ?? 'product');
    const id = String(raw.id ?? '');
    return id ? `${base}-${id}` : base;
};
exports.buildProticoSlug = buildProticoSlug;
const listPriceInr = (raw) => {
    const prices = (raw.variants ?? [])
        .map((v) => Number(v.price))
        .filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length === 0)
        return 0;
    return Math.round(Math.min(...prices));
};
const toV2Shim = (raw, assignedPrice) => {
    const list = listPriceInr(raw);
    return {
        name: raw.title ?? '',
        basePrice: list > assignedPrice ? list : assignedPrice + 200,
        salePrice: assignedPrice,
        finalPrice: assignedPrice,
        availableSizes: (0, exports.collectProticoSizes)(raw),
        totalStock: raw.available === false ? 0 : undefined,
        isSoldOut: raw.available === false,
    };
};
const mapProticoToProductDocument = (raw, options) => {
    const name = raw.title?.trim();
    if (!name)
        return null;
    const images = (0, exports.collectProticoImages)(raw);
    if (images.length === 0)
        return null;
    const assignedPrice = options.assignedPrice;
    const v2 = toV2Shim(raw, assignedPrice);
    const details = (0, random_product_details_1.buildRandomProductDetails)(v2, options.categoryName, assignedPrice);
    const list = listPriceInr(raw);
    const originalPrice = list > assignedPrice ? list : details.originalPrice;
    const description = (`${name}. Premium ${options.categoryName} from our curated ethnic collection.`).slice(0, 2000);
    const tags = (raw.tags ?? [])
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, 20);
    const slug = (0, exports.buildProticoSlug)(raw);
    const inStock = raw.available !== false && details.stockQuantity > 0;
    const doc = {
        name: name.length > 180 ? `${name.slice(0, 177).trim()}...` : name,
        slug,
        price: assignedPrice,
        originalPrice,
        category: options.categoryName,
        description,
        metaTitle: name.slice(0, 70),
        metaDescription: description.slice(0, 160),
        metaKeywords: tags.length > 0 ? tags : [options.categoryName, 'women', 'ethnic'],
        sizes: (0, exports.collectProticoSizes)(raw),
        colors: [(0, exports.extractColorFromTags)(raw)],
        images,
        tags: tags.length > 0 ? tags : [options.categoryName, 'ethnic wear'],
        inStock,
        featured: options.index < 4,
        isHot: details.isHot,
        isPublished: true,
        fabricComposition: details.fabricComposition,
        garmentLength: details.garmentLength,
        packageContains: details.packageContains,
        washCare: details.washCare,
        neckline: details.neckline,
        sleeveLength: details.sleeveLength,
        fitting: details.fitting,
        weight: details.weight,
        dimensions: details.dimensions,
        stockQuantity: details.stockQuantity,
        deliveryStartDate: details.deliveryStartDate.toISOString(),
        deliveryEndDate: details.deliveryEndDate.toISOString(),
        breadcrumbCategory: details.breadcrumbCategory,
        _source: {
            nykaaId: String(raw.id ?? ''),
            categoryFilter: options.filterValue,
            assignedPriceTier: assignedPrice,
        },
    };
    return (0, sanitize_brand_1.sanitizeScrapedProduct)(doc);
};
exports.mapProticoToProductDocument = mapProticoToProductDocument;
const productImageKeys = (raw) => (0, exports.collectProticoImages)(raw).map((url) => (0, image_utils_1.imageDedupeKey)(url));
exports.productImageKeys = productImageKeys;
