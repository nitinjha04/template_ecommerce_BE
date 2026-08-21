"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStoreValidator = exports.createStoreValidator = exports.storeIdValidator = void 0;
const express_validator_1 = require("express-validator");
exports.storeIdValidator = [(0, express_validator_1.param)('id').isMongoId().withMessage('Invalid store id')];
exports.createStoreValidator = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Store name is required'),
    (0, express_validator_1.body)('domain').trim().notEmpty().withMessage('Domain is required'),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 2, max: 80 }),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
];
exports.updateStoreValidator = [
    ...exports.storeIdValidator,
    (0, express_validator_1.body)('name').optional().trim().notEmpty(),
    (0, express_validator_1.body)('domain').optional().trim().notEmpty(),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 2, max: 80 }),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
];
