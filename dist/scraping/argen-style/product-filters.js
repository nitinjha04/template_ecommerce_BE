"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasBlockedText = exports.productTextBlob = exports.collectArgenImages = void 0;
const map_nykaa_product_1 = require("../nykaa/map-nykaa-product");
const image_utils_1 = require("./image-utils");
const BLOCKED_TEXT = /\b(nykaa|pakistan|pakistani)\b/i;
const collectArgenImages = (raw) => (0, image_utils_1.filterProductImages)((0, map_nykaa_product_1.collectNykaaImages)(raw));
exports.collectArgenImages = collectArgenImages;
const productTextBlob = (raw) => {
    const name = (0, map_nykaa_product_1.buildNykaaProductName)(raw);
    const tags = (raw.tag ?? []).join(' ');
    return `${name} ${raw.subTitle ?? ''} ${tags}`;
};
exports.productTextBlob = productTextBlob;
const hasBlockedText = (raw) => BLOCKED_TEXT.test((0, exports.productTextBlob)(raw));
exports.hasBlockedText = hasBlockedText;
