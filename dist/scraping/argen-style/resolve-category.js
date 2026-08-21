"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCategoryFromProduct = exports.loadCategoryMap = void 0;
const loadCategoryMap = (raw) => {
    const out = {};
    for (const [id, name] of Object.entries(raw)) {
        const key = String(id).trim();
        const label = String(name).trim();
        if (key && label)
            out[key] = label;
    }
    return out;
};
exports.loadCategoryMap = loadCategoryMap;
/** Pick the first Nykaa leaf category id present on the product. */
const resolveCategoryFromProduct = (raw, categoryMap) => {
    const ids = raw.categoryId ?? [];
    for (const id of ids) {
        const key = String(id).trim();
        if (categoryMap[key])
            return categoryMap[key];
    }
    return null;
};
exports.resolveCategoryFromProduct = resolveCategoryFromProduct;
