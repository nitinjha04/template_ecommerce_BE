"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapArgenProduct = void 0;
const random_product_details_1 = require("../../seed/v2/random-product-details");
const map_nykaa_product_1 = require("../nykaa/map-nykaa-product");
const product_filters_1 = require("./product-filters");
const sanitize_brand_1 = require("./sanitize-brand");
const toV2Shim = (raw, assignedPrice) => ({
    name: (0, map_nykaa_product_1.buildNykaaProductName)(raw),
    description: raw.subTitle,
    basePrice: raw.price,
    salePrice: assignedPrice,
    finalPrice: assignedPrice,
    tags: raw.tag,
    availableSizes: (0, map_nykaa_product_1.collectNykaaSizes)(raw),
    totalStock: raw.isOutOfStock === 1 ? 0 : undefined,
    isSoldOut: raw.isOutOfStock === 1,
});
const mapArgenProduct = (raw, options) => {
    const name = (0, map_nykaa_product_1.buildNykaaProductName)(raw);
    if (!name)
        return null;
    const images = (0, product_filters_1.collectArgenImages)(raw);
    if (images.length === 0)
        return null;
    const assignedPrice = options.assignedPrice;
    const v2 = toV2Shim(raw, assignedPrice);
    const details = (0, random_product_details_1.buildRandomProductDetails)(v2, options.categoryName, assignedPrice);
    const mrp = typeof raw.price === 'number' && raw.price > assignedPrice
        ? raw.price
        : details.originalPrice;
    const sizes = (0, map_nykaa_product_1.collectNykaaSizes)(raw);
    const description = `${raw.subTitle?.trim() ?? name}. Premium ${options.categoryName} from our curated collection.`.slice(0, 2000);
    const tags = (raw.tag ?? [])
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, 20);
    const slug = (0, map_nykaa_product_1.buildNykaaSlug)(raw, options.categoryName);
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
        metaKeywords: tags.length > 0 ? tags : [options.categoryName, 'women', 'ethnic'],
        sizes: sizes.length > 0 ? sizes : ['Free Size'],
        colors: ['Multi'],
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
            nykaaId: raw.id ?? '',
            sku: raw.sku,
            categoryFilter: options.categoryFilter,
            assignedPriceTier: assignedPrice,
        },
    };
    return (0, sanitize_brand_1.sanitizeScrapedProduct)(doc);
};
exports.mapArgenProduct = mapArgenProduct;
