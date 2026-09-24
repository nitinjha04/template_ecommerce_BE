"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapNykaaToProductDocument = exports.buildNykaaSlug = exports.buildNykaaProductName = exports.collectNykaaSizes = exports.collectNykaaImages = void 0;
const slug_1 = require("../../utils/slug");
const random_product_details_1 = require("../../seed/v2/random-product-details");
const sanitize_brand_1 = require("./sanitize-brand");
const stripQuery = (url) => url.split('?')[0] ?? url;
const collectNykaaImages = (raw) => {
    const urls = [];
    const seen = new Set();
    const add = (url) => {
        if (!url)
            return;
        const clean = stripQuery(url.trim());
        if (!clean || seen.has(clean))
            return;
        seen.add(clean);
        urls.push(clean);
    };
    const bridgeImages = raw.plp_pdp_bridge?.images ?? [];
    const sorted = [...bridgeImages].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
    for (const img of sorted)
        add(img.url);
    add(raw.imageUrl);
    return urls;
};
exports.collectNykaaImages = collectNykaaImages;
const collectNykaaSizes = (raw) => {
    const fromBridge = (raw.plp_pdp_bridge?.variants?.size ?? [])
        .map((s) => s.name?.trim())
        .filter((s) => Boolean(s));
    if (fromBridge.length > 0)
        return [...new Set(fromBridge)];
    const fromVariation = (raw.sizeVariation ?? [])
        .map((s) => s.title?.trim())
        .filter((s) => Boolean(s));
    return [...new Set(fromVariation)];
};
exports.collectNykaaSizes = collectNykaaSizes;
const buildNykaaProductName = (raw) => {
    const brand = (raw.title ?? '').trim();
    const subtitle = (raw.subTitle ?? '').trim();
    if (brand && subtitle)
        return `${brand} — ${subtitle}`;
    return subtitle || brand || '';
};
exports.buildNykaaProductName = buildNykaaProductName;
const buildNykaaSlug = (raw, categoryName) => {
    const url = raw.actionUrl?.trim();
    if (url) {
        const slugPath = url.replace(/\/p\/\d+\/?$/i, '').replace(/^\/+/, '');
        if (slugPath && !/^\d+$/.test(slugPath)) {
            return (0, slug_1.slugify)(slugPath);
        }
    }
    const base = (0, slug_1.slugify)((0, exports.buildNykaaProductName)(raw) || categoryName);
    const id = raw.id?.trim() ?? raw.sku?.trim() ?? '';
    return id ? `${base}-${id}` : base;
};
exports.buildNykaaSlug = buildNykaaSlug;
const toV2Shim = (raw, assignedPrice) => ({
    name: (0, exports.buildNykaaProductName)(raw),
    description: raw.subTitle,
    basePrice: raw.price,
    salePrice: assignedPrice,
    finalPrice: assignedPrice,
    tags: raw.tag,
    availableSizes: (0, exports.collectNykaaSizes)(raw),
    totalStock: raw.isOutOfStock === 1 ? 0 : undefined,
    isSoldOut: raw.isOutOfStock === 1,
});
const mapNykaaToProductDocument = (raw, options) => {
    const name = (0, exports.buildNykaaProductName)(raw);
    if (!name)
        return null;
    const images = (0, exports.collectNykaaImages)(raw);
    if (images.length === 0)
        return null;
    const assignedPrice = options.assignedPrice;
    const v2 = toV2Shim(raw, assignedPrice);
    const details = (0, random_product_details_1.buildRandomProductDetails)(v2, options.categoryName, assignedPrice);
    const mrp = typeof raw.price === 'number' && raw.price > assignedPrice ? raw.price : details.originalPrice;
    const sizes = (0, exports.collectNykaaSizes)(raw);
    const description = `${raw.subTitle?.trim() ?? name}. Premium ${options.categoryName} from our curated collection.`.slice(0, 2000);
    const tags = (raw.tag ?? [])
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, 20);
    const slug = (0, exports.buildNykaaSlug)(raw, options.categoryName);
    const inStock = raw.isOutOfStock !== 1 && details.stockQuantity > 0;
    const doc = {
        name: name.length > 180 ? `${name.slice(0, 177).trim()}...` : name,
        slug,
        price: assignedPrice,
        originalPrice: Math.round(mrp),
        category: options.categoryName,
        description,
        metaTitle: name.slice(0, 70),
        metaDescription: description.slice(0, 160),
        metaKeywords: tags.length > 0 ? tags : [options.categoryName, 'women', 'fashion'],
        sizes: sizes.length > 0 ? sizes : ['Free Size'],
        colors: ['Multi'],
        images,
        tags: tags.length > 0 ? tags : [options.categoryName],
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
            nykaaId: raw.id ?? '',
            sku: raw.sku,
            categoryFilter: options.categoryFilter,
            assignedPriceTier: assignedPrice,
        },
    };
    return (0, sanitize_brand_1.sanitizeScrapedProduct)(doc);
};
exports.mapNykaaToProductDocument = mapNykaaToProductDocument;
