"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildV3Product = void 0;
const parse_category_data_1 = require("../parse-category-data");
const random_product_details_1 = require("../v2/random-product-details");
const EMPTY_V2 = {};
const normalizeName = (name) => {
    const trimmed = name.trim();
    return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
};
const categoryForSizes = (category) => {
    if (category === 'Lehenga' || category === 'Saree')
        return 'Women';
    return category;
};
const buildV3Product = (row, category, index, slug) => {
    const name = normalizeName(row.name);
    const price = (0, parse_category_data_1.randomPriceInr)();
    const details = (0, random_product_details_1.buildRandomProductDetails)(EMPTY_V2, categoryForSizes(category), price);
    const baseTags = (0, parse_category_data_1.tagsFromName)(name, categoryForSizes(category));
    const tags = new Set(baseTags);
    tags.add(category.toLowerCase());
    if (row.tag)
        tags.add(row.tag.toLowerCase().replace(/\s+/g, '-'));
    if (category === 'Lehenga')
        tags.add('lehenga');
    if (category === 'Saree')
        tags.add('saree');
    if (category === 'Men')
        tags.add('mens-wedding');
    const tagList = [...tags].slice(0, 20);
    const description = (0, parse_category_data_1.buildDescription)(name, categoryForSizes(category));
    return {
        name,
        slug,
        price,
        originalPrice: details.originalPrice,
        category,
        description,
        sizes: (0, parse_category_data_1.sizesForCategory)(categoryForSizes(category)),
        colors: (0, parse_category_data_1.inferColorsFromName)(name, categoryForSizes(category)),
        images: row.images,
        tags: tagList,
        inStock: true,
        featured: index < 4,
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
        deliveryStartDate: details.deliveryStartDate,
        deliveryEndDate: details.deliveryEndDate,
        breadcrumbCategory: category,
        metaTitle: name.slice(0, 70),
        metaDescription: description.slice(0, 160),
        metaKeywords: tagList.slice(0, 12),
    };
};
exports.buildV3Product = buildV3Product;
