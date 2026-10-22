"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryIdValidator = exports.updateCategoryValidator = exports.createCategoryValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createCategoryValidator = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Category name is required'),
    (0, express_validator_1.body)('sortOrder').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
];
exports.updateCategoryValidator = [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid category id'),
    (0, express_validator_1.body)('name').optional().trim().notEmpty(),
    (0, express_validator_1.body)('sortOrder').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
];
exports.categoryIdValidator = [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid category id'),
];
