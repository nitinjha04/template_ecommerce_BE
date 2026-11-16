"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productQueryValidator = exports.productIdValidator = exports.updateProductValidator = exports.createProductValidator = void 0;
const express_validator_1 = require("express-validator");
const productImages_1 = require("../constants/productImages");
const imagesValidator = (0, express_validator_1.body)('images')
    .optional()
    .isArray({ max: productImages_1.MAX_PRODUCT_IMAGES })
    .withMessage(`Maximum ${productImages_1.MAX_PRODUCT_IMAGES} images allowed`)
    .custom((value) => {
    if (value === undefined)
        return true;
    if (!Array.isArray(value))
        return false;
    const urls = value.filter((u) => typeof u === 'string' && u.trim());
    if (urls.length === 0) {
        throw new Error('At least one product image is required');
    }
    if (urls.length > productImages_1.MAX_PRODUCT_IMAGES) {
        throw new Error(`Maximum ${productImages_1.MAX_PRODUCT_IMAGES} images allowed`);
    }
    return true;
});
const optionalString = (field) => (0, express_validator_1.body)(field).optional({ values: 'null' }).isString().trim();
const optionalDate = (field) => (0, express_validator_1.body)(field).optional({ values: 'null' }).isISO8601().toDate();
const detailFields = [
    optionalString('fabricComposition'),
    optionalString('garmentLength'),
    optionalString('packageContains'),
    optionalString('washCare'),
    optionalString('neckline'),
    optionalString('sleeveLength'),
    optionalString('fitting'),
    optionalString('weight'),
    optionalString('dimensions'),
    optionalString('breadcrumbCategory'),
    (0, express_validator_1.body)('originalPrice').optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)('stockQuantity').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('isHot').optional().isBoolean(),
    (0, express_validator_1.body)('isPublished').optional().isBoolean(),
    optionalDate('deliveryStartDate'),
    optionalDate('deliveryEndDate'),
];
exports.createProductValidator = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('price')
        .isFloat({ min: 500, max: 1000 })
        .withMessage('Price must be between ₹500 and ₹1000'),
    (0, express_validator_1.body)('category').trim().notEmpty().withMessage('Category is required'),
    (0, express_validator_1.body)('description').trim().notEmpty().withMessage('Description is required'),
    (0, express_validator_1.body)('sizes').optional().isArray(),
    (0, express_validator_1.body)('colors').optional().isArray(),
    imagesValidator,
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 1, max: 200 }),
    (0, express_validator_1.body)('metaTitle').optional().trim().isLength({ max: 200 }),
    (0, express_validator_1.body)('metaDescription').optional().trim().isLength({ max: 500 }),
    (0, express_validator_1.body)('metaKeywords').optional().isArray(),
    (0, express_validator_1.body)('inStock').optional().isBoolean(),
    (0, express_validator_1.body)('featured').optional().isBoolean(),
    (0, express_validator_1.body)('isPublished').optional().isBoolean(),
    ...detailFields,
];
exports.updateProductValidator = [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid product id'),
    (0, express_validator_1.body)('name').optional().trim().notEmpty(),
    (0, express_validator_1.body)('price').optional().isFloat({ min: 500, max: 1000 }),
    (0, express_validator_1.body)('category').optional().trim().notEmpty(),
    (0, express_validator_1.body)('description').optional().trim().notEmpty(),
    (0, express_validator_1.body)('sizes').optional().isArray(),
    (0, express_validator_1.body)('colors').optional().isArray(),
    imagesValidator,
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 1, max: 200 }),
    (0, express_validator_1.body)('metaTitle').optional().trim().isLength({ max: 200 }),
    (0, express_validator_1.body)('metaDescription').optional().trim().isLength({ max: 500 }),
    (0, express_validator_1.body)('metaKeywords').optional().isArray(),
    (0, express_validator_1.body)('inStock').optional().isBoolean(),
    (0, express_validator_1.body)('featured').optional().isBoolean(),
    (0, express_validator_1.body)('isPublished').optional().isBoolean(),
    ...detailFields,
];
exports.productIdValidator = [
    (0, express_validator_1.param)('id')
        .trim()
        .notEmpty()
        .withMessage('Product identifier is required')
        .isLength({ min: 1, max: 200 }),
];
exports.productQueryValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('category').optional().isString().trim(),
    (0, express_validator_1.query)('featured').optional().isIn(['true', 'false']),
    (0, express_validator_1.query)('inStock').optional().isIn(['true', 'false']),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('sort').optional().isIn([
        'price_asc',
        'price_desc',
        'newest',
        'oldest',
        'random',
    ]),
    (0, express_validator_1.query)('minPrice').optional().isFloat({ min: 0 }),
    (0, express_validator_1.query)('maxPrice').optional().isFloat({ min: 0 }),
    (0, express_validator_1.query)('sizes').optional().isString(),
    (0, express_validator_1.query)('subcategory').optional().isString(),
    (0, express_validator_1.query)('includeUnpublished').optional().isIn(['true', 'false']),
];
