"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productQueryValidator = exports.productIdValidator = exports.updateProductValidator = exports.createProductValidator = void 0;
const express_validator_1 = require("express-validator");
const categories = ['Men', 'Women', 'Accessories'];
exports.createProductValidator = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('price')
        .isFloat({ min: 500, max: 1000 })
        .withMessage('Price must be between ₹500 and ₹1000'),
    (0, express_validator_1.body)('category').isIn(categories).withMessage('Invalid category'),
    (0, express_validator_1.body)('description').trim().notEmpty().withMessage('Description is required'),
    (0, express_validator_1.body)('sizes').optional().isArray(),
    (0, express_validator_1.body)('colors').optional().isArray(),
    (0, express_validator_1.body)('images').optional().isArray(),
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 1, max: 200 }),
    (0, express_validator_1.body)('metaTitle').optional().trim().isLength({ max: 200 }),
    (0, express_validator_1.body)('metaDescription').optional().trim().isLength({ max: 500 }),
    (0, express_validator_1.body)('metaKeywords').optional().isArray(),
    (0, express_validator_1.body)('inStock').optional().isBoolean(),
    (0, express_validator_1.body)('featured').optional().isBoolean(),
];
exports.updateProductValidator = [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid product id'),
    (0, express_validator_1.body)('name').optional().trim().notEmpty(),
    (0, express_validator_1.body)('price').optional().isFloat({ min: 500, max: 1000 }),
    (0, express_validator_1.body)('category').optional().isIn(categories),
    (0, express_validator_1.body)('description').optional().trim().notEmpty(),
    (0, express_validator_1.body)('sizes').optional().isArray(),
    (0, express_validator_1.body)('colors').optional().isArray(),
    (0, express_validator_1.body)('images').optional().isArray(),
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 1, max: 200 }),
    (0, express_validator_1.body)('metaTitle').optional().trim().isLength({ max: 200 }),
    (0, express_validator_1.body)('metaDescription').optional().trim().isLength({ max: 500 }),
    (0, express_validator_1.body)('metaKeywords').optional().isArray(),
    (0, express_validator_1.body)('inStock').optional().isBoolean(),
    (0, express_validator_1.body)('featured').optional().isBoolean(),
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
    (0, express_validator_1.query)('category').optional().isIn(categories),
    (0, express_validator_1.query)('featured').optional().isIn(['true', 'false']),
    (0, express_validator_1.query)('inStock').optional().isIn(['true', 'false']),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('sort').optional().isIn(['price_asc', 'price_desc', 'newest', 'oldest']),
];
