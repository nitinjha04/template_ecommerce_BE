"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUploadFilesWithinLimits = exports.normalizeProductImages = void 0;
const ApiError_1 = require("./ApiError");
const productImages_1 = require("../constants/productImages");
const normalizeProductImages = (images) => {
    if (!Array.isArray(images)) {
        throw new ApiError_1.ApiError(400, 'Images must be an array');
    }
    const urls = images
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
    if (urls.length === 0) {
        throw new ApiError_1.ApiError(400, 'At least one product image is required');
    }
    if (urls.length > productImages_1.MAX_PRODUCT_IMAGES) {
        throw new ApiError_1.ApiError(400, `Maximum ${productImages_1.MAX_PRODUCT_IMAGES} images allowed per product`);
    }
    return urls;
};
exports.normalizeProductImages = normalizeProductImages;
const assertUploadFilesWithinLimits = (files) => {
    if (files.length === 0) {
        throw new ApiError_1.ApiError(400, 'No images provided');
    }
    if (files.length > productImages_1.MAX_PRODUCT_IMAGES) {
        throw new ApiError_1.ApiError(400, `Maximum ${productImages_1.MAX_PRODUCT_IMAGES} images per upload`);
    }
    for (const file of files) {
        if (file.size > productImages_1.MAX_PRODUCT_IMAGE_BYTES) {
            throw new ApiError_1.ApiError(400, `Each image must be ${productImages_1.MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)}MB or smaller`);
        }
    }
};
exports.assertUploadFilesWithinLimits = assertUploadFilesWithinLimits;
