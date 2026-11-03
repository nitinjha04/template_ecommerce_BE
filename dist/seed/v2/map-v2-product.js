"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapV2ToProduct = exports.resolvePrice = exports.collectSizes = exports.collectColors = exports.collectImages = exports.resolveMediaUrl = exports.V2_MEDIA_BASE_URL = exports.resolveSalePrice = void 0;
const random_product_details_1 = require("./random-product-details");
const SALE_MIN = 500;
const SALE_MAX = 1000;
const randomSalePrice = () => Math.floor(Math.random() * (SALE_MAX - SALE_MIN + 1)) + SALE_MIN;
/** Sale price in ₹500–₹1000 (uses v2 price when already in range). */
const resolveSalePrice = (raw) => {
    const fromV2 = (0, exports.resolvePrice)(raw);
    if (fromV2 >= SALE_MIN && fromV2 <= SALE_MAX)
        return Math.round(fromV2);
    if (fromV2 > SALE_MAX)
        return SALE_MAX;
    if (fromV2 > 0 && fromV2 < SALE_MIN)
        return SALE_MIN;
    return randomSalePrice();
};
exports.resolveSalePrice = resolveSalePrice;
const stripHtml = (html) => html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u003C/g, '<')
    .replace(/\u003E/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const normalizeName = (name) => {
    const trimmed = name.trim();
    return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
};
/** Default CDN for v2 JSON relative paths (`/media/products/...`). */
exports.V2_MEDIA_BASE_URL = 'https://uat.tangerineluxury.com';
const resolveMediaUrl = (url, mediaBase) => {
    const u = url.trim();
    if (!u)
        return u;
    if (/^https?:\/\//i.test(u))
        return u;
    const base = (mediaBase ??
        process.env.SEED_MEDIA_BASE_URL ??
        exports.V2_MEDIA_BASE_URL).replace(/\/$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return `${base}${path}`;
};
exports.resolveMediaUrl = resolveMediaUrl;
const collectImages = (raw, mediaBase) => {
    const urls = [];
    const seen = new Set();
    const add = (url) => {
        if (!url)
            return;
        const resolved = (0, exports.resolveMediaUrl)(url, mediaBase);
        if (!resolved || seen.has(resolved))
            return;
        seen.add(resolved);
        urls.push(resolved);
    };
    add(raw.mainImage?.url);
    const gallery = [...(raw.galleryImages ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const img of gallery) {
        add(img.url);
    }
    return urls;
};
exports.collectImages = collectImages;
const collectColors = (raw) => {
    const fromAvailable = (raw.availableColors ?? []).map((c) => c.trim()).filter(Boolean);
    if (fromAvailable.length > 0)
        return [...new Set(fromAvailable)];
    const fromVariants = (raw.colors ?? [])
        .map((c) => c.colorName?.trim())
        .filter((c) => Boolean(c));
    return [...new Set(fromVariants)];
};
exports.collectColors = collectColors;
const collectSizes = (raw) => {
    const fromAvailable = (raw.availableSizes ?? []).map((s) => s.trim()).filter(Boolean);
    if (fromAvailable.length > 0)
        return [...new Set(fromAvailable)];
    const fromVariants = [];
    for (const color of raw.colors ?? []) {
        for (const size of color.sizes ?? []) {
            const name = size.sizeName?.trim();
            if (name)
                fromVariants.push(name);
        }
    }
    return [...new Set(fromVariants)];
};
exports.collectSizes = collectSizes;
const resolvePrice = (raw) => {
    const sale = raw.salePrice ?? 0;
    if (sale > 0)
        return sale;
    if (typeof raw.finalPrice === 'number' && raw.finalPrice > 0)
        return raw.finalPrice;
    if (typeof raw.ourPrice === 'number' && raw.ourPrice > 0)
        return raw.ourPrice;
    if (typeof raw.basePrice === 'number' && raw.basePrice > 0)
        return raw.basePrice;
    return 0;
};
exports.resolvePrice = resolvePrice;
const mapV2ToProduct = (raw, category, index, slug, mediaBase) => {
    const name = normalizeName(raw.name ?? '');
    if (!name)
        return null;
    const descriptionRaw = raw.description?.trim() ?? '';
    const description = stripHtml(descriptionRaw) || `${name} — ${category} collection.`;
    const price = (0, exports.resolveSalePrice)(raw);
    if (price <= 0)
        return null;
    const images = (0, exports.collectImages)(raw, mediaBase);
    if (images.length === 0)
        return null;
    const sizes = (0, exports.collectSizes)(raw);
    const colors = (0, exports.collectColors)(raw);
    const details = (0, random_product_details_1.buildRandomProductDetails)(raw, category, price);
    const tags = (raw.tags ?? [])
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, 20);
    const inStock = raw.isSoldOut !== true &&
        raw.isActive !== false &&
        raw.isPublished !== false &&
        details.stockQuantity > 0;
    return {
        name,
        slug,
        price,
        originalPrice: details.originalPrice,
        category,
        description,
        sizes: sizes.length > 0 ? sizes : ['Free Size'],
        colors: colors.length > 0 ? colors : ['Multi'],
        images,
        tags,
        inStock,
        featured: index < 4,
        isHot: details.isHot,
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
        deliveryStartDate: details.deliveryStartDate,
        deliveryEndDate: details.deliveryEndDate,
        breadcrumbCategory: details.breadcrumbCategory,
        metaTitle: name.slice(0, 70),
        metaDescription: description.slice(0, 160),
        metaKeywords: tags.slice(0, 12),
    };
};
exports.mapV2ToProduct = mapV2ToProduct;
