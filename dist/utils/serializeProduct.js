"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeProducts = exports.serializeProduct = void 0;
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
    return plain;
};
exports.serializeProduct = serializeProduct;
const serializeProducts = (docs) => docs.map((d) => (0, exports.serializeProduct)(d));
exports.serializeProducts = serializeProducts;
