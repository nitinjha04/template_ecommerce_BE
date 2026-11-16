"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeProducts = exports.serializeProduct = void 0;
const category_label_1 = require("./category-label");
/** Ensures API responses always expose `id` (aggregate results only have `_id`). */
const serializeProduct = (doc) => {
    const plain = typeof doc.toJSON === 'function'
        ? doc.toJSON()
        : { ...doc };
    if (plain._id != null && (plain.id == null || plain.id === '')) {
        plain.id = String(plain._id);
    }
    delete plain._rand;
    delete plain._id;
    delete plain.__v;
    if (typeof plain.category === 'string') {
        plain.category = (0, category_label_1.shortenCategoryLabel)(plain.category);
    }
    if (typeof plain.breadcrumbCategory === 'string') {
        plain.breadcrumbCategory = (0, category_label_1.shortenCategoryLabel)(plain.breadcrumbCategory);
    }
    return plain;
};
exports.serializeProduct = serializeProduct;
const serializeProducts = (docs) => docs.map((d) => (0, exports.serializeProduct)(d));
exports.serializeProducts = serializeProducts;
