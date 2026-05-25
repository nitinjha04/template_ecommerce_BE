"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackOrderValidator = exports.orderIdValidator = exports.updateOrderStatusValidator = exports.createOrderValidator = void 0;
const express_validator_1 = require("express-validator");
const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const requiredField = (path, label) => (0, express_validator_1.body)(path).trim().notEmpty().withMessage(`${label} is required`);
const phoneDigitsRule = (path, label) => (0, express_validator_1.body)(path)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .custom((value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
        throw new Error(`${label} must be 10–15 digits`);
    }
    return true;
});
exports.createOrderValidator = [
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    phoneDigitsRule('phone', 'Phone'),
    requiredField('shippingAddress.firstName', 'First name'),
    requiredField('shippingAddress.lastName', 'Last name'),
    (0, express_validator_1.body)('shippingAddress.company').optional({ values: 'falsy' }).trim().isString(),
    (0, express_validator_1.body)('shippingAddress.phone').optional({ values: 'falsy' }).trim().isString(),
    requiredField('shippingAddress.street', 'Street address'),
    requiredField('shippingAddress.city', 'City'),
    requiredField('shippingAddress.state', 'State'),
    requiredField('shippingAddress.country', 'Country'),
    requiredField('shippingAddress.postalCode', 'Postal code'),
    (0, express_validator_1.body)('orderNote').optional({ values: 'falsy' }).isString().trim(),
    (0, express_validator_1.body)('paymentMethod')
        .equals('cod')
        .withMessage('Only Cash on Delivery is accepted'),
    (0, express_validator_1.body)('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),
    (0, express_validator_1.body)('items.*.productId').isMongoId().withMessage('Invalid product'),
    (0, express_validator_1.body)('items.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
    (0, express_validator_1.body)('items.*.size')
        .customSanitizer((value) => {
        const s = typeof value === 'string' ? value.trim() : '';
        return s || 'One Size';
    })
        .isString()
        .notEmpty()
        .withMessage('Size is required'),
    (0, express_validator_1.body)('items.*.color')
        .customSanitizer((value) => {
        const c = typeof value === 'string' ? value.trim() : '';
        return c || 'Default';
    })
        .isString()
        .notEmpty()
        .withMessage('Color is required'),
];
exports.updateOrderStatusValidator = [
    (0, express_validator_1.param)('id').isMongoId(),
    (0, express_validator_1.body)('status').isIn(orderStatuses),
];
exports.orderIdValidator = [(0, express_validator_1.param)('id').isMongoId()];
exports.trackOrderValidator = [
    (0, express_validator_1.body)('query').trim().notEmpty().withMessage('Enter order ID, email, or phone'),
];
