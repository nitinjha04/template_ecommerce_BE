"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const cart_controller_1 = require("../controllers/cart.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', cart_controller_1.CartController.get);
router.post('/merge', (0, validate_middleware_1.validate)([
    (0, express_validator_1.body)('items').isArray({ min: 0 }).withMessage('items must be an array'),
    (0, express_validator_1.body)('items.*.productId').trim().notEmpty().withMessage('productId is required'),
    (0, express_validator_1.body)('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be >= 1'),
    (0, express_validator_1.body)('items.*.size').optional({ values: 'falsy' }).isString(),
    (0, express_validator_1.body)('items.*.color').optional({ values: 'falsy' }).isString(),
]), cart_controller_1.CartController.merge);
router.post('/items', (0, validate_middleware_1.validate)([
    (0, express_validator_1.body)('productId').trim().notEmpty().withMessage('productId is required'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1 }).withMessage('quantity must be >= 1'),
    (0, express_validator_1.body)('size').optional({ values: 'falsy' }).isString(),
    (0, express_validator_1.body)('color').optional({ values: 'falsy' }).isString(),
]), cart_controller_1.CartController.upsertLine);
router.delete('/items', (0, validate_middleware_1.validate)([
    (0, express_validator_1.body)('productId').trim().notEmpty().withMessage('productId is required'),
    (0, express_validator_1.body)('size').optional({ values: 'falsy' }).isString(),
    (0, express_validator_1.body)('color').optional({ values: 'falsy' }).isString(),
]), cart_controller_1.CartController.removeLine);
router.delete('/', cart_controller_1.CartController.clear);
exports.default = router;
