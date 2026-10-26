"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productImageKeys = exports.mapMaxToProductDocument = exports.buildMaxSlug = exports.collectMaxColors = exports.collectMaxSizes = exports.collectMaxImages = void 0;
const slug_1 = require("../../utils/slug");
const random_product_details_1 = require("../../seed/v2/random-product-details");
const image_utils_1 = require("../argen-style/image-utils");
const sanitize_brand_1 = require("./sanitize-brand");
const normalizeImageUrl = (url) => {
    const trimmed = url.trim();
    if (!trimmed)
        return '';
    return (trimmed.startsWith('//') ? `https:${trimmed}` : trimmed).split('?')[0];
};
const collectMaxImages = (raw) => {
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
    for (const img of raw.gallaryImages ?? [])
        add(img);
    for (const img of raw.imageUrl ?? [])
        add(img);
    return urls.slice(0, 8);
};
exports.collectMaxImages = collectMaxImages;
const collectMaxSizes = (raw) => {
    const sizes = new Set();
    for (const row of raw.childDetail ?? []) {
        const parts = String(row).split('#');
        const size = parts[1]?.trim();
        if (size)
            sizes.add(size);
    }
    if (sizes.size > 0)
        return [...sizes];
    return ['Free Size', 'S', 'M', 'L', 'XL'];
};
exports.collectMaxSizes = collectMaxSizes;
const collectMaxColors = (raw) => {
    const colors = (raw.color ?? [])
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => c.charAt(0).toUpperCase() + c.slice(1));
    return colors.length > 0 ? [...new Set(colors)] : ['Multi'];
};
exports.collectMaxColors = collectMaxColors;
const buildMaxSlug = (raw) => {
    const url = raw.productUrl?.trim();
    if (url) {
        const match = url.match(/\/p\/([^/?#]+)/i);
        if (match?.[1])
            return (0, slug_1.slugify)(match[1]);
    }
    const base = (0, slug_1.slugify)(raw.name ?? 'product');
    const id = raw.uniqueId?.trim() ?? '';
    return id ? `${base}-${(0, slug_1.slugify)(id)}` : base;
};
exports.buildMaxSlug = buildMaxSlug;
const toV2Shim = (raw, assignedPrice) => {
    const listPrice = typeof raw.price === 'number' ? raw.price : assignedPrice;
    const was = typeof raw.wasPrice === 'number' ? raw.wasPrice : listPrice;
    return {
        name: raw.name ?? '',
        description: raw.summary,
        basePrice: was > assignedPrice ? was : assignedPrice + 150,
        salePrice: assignedPrice,
        finalPrice: assignedPrice,
        availableSizes: (0, exports.collectMaxSizes)(raw),
        totalStock: raw.inStock === 0 ? 0 : undefined,
        isSoldOut: raw.inStock === 0,
    };
};
const mapMaxToProductDocument = (raw, options) => {
    const name = raw.name?.trim();
    if (!name)
        return null;
    const images = (0, exports.collectMaxImages)(raw);
    if (images.length === 0)
        return null;
    const assignedPrice = options.assignedPrice;
    const v2 = toV2Shim(raw, assignedPrice);
    const details = (0, random_product_details_1.buildRandomProductDetails)(v2, options.categoryName, assignedPrice);
    const listPrice = typeof raw.price === 'number' ? raw.price : assignedPrice;
    const originalPrice = listPrice > assignedPrice ? Math.round(listPrice) : details.originalPrice;
    const description = (raw.summary?.trim() ||
        `${name}. Curated ${options.categoryName} from the Mineview collection.`).slice(0, 2000);
    const slug = (0, exports.buildMaxSlug)(raw);
    const inStock = raw.inStock !== 0 && details.stockQuantity > 0;
    const doc = {
        name: name.length > 180 ? `${name.slice(0, 177).trim()}...` : name,
        slug,
        price: assignedPrice,
        originalPrice,
        category: options.categoryName,
        description,
        metaTitle: name.slice(0, 70),
        metaDescription: description.slice(0, 160),
        metaKeywords: [options.categoryName, 'women', 'fashion'],
        sizes: (0, exports.collectMaxSizes)(raw),
        colors: (0, exports.collectMaxColors)(raw),
        images,
        tags: [options.categoryName, 'women', 'fashion'],
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
            nykaaId: raw.uniqueId ?? '',
            sku: raw.productCode,
            categoryFilter: options.categorySlug,
            assignedPriceTier: assignedPrice,
        },
    };
    return (0, sanitize_brand_1.sanitizeScrapedProduct)(doc);
};
exports.mapMaxToProductDocument = mapMaxToProductDocument;
const productImageKeys = (raw) => (0, exports.collectMaxImages)(raw).map((url) => (0, image_utils_1.imageDedupeKey)(url));
exports.productImageKeys = productImageKeys;
