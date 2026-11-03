"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderIdValidator = exports.updateOrderStatusValidator = exports.createOrderValidator = void 0;
const express_validator_1 = require("express-validator");
const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
exports.createOrderValidator = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone').trim().notEmpty().withMessage('Phone is required'),
    (0, express_validator_1.body)('shippingAddress.firstName').trim().notEmpty(),
    (0, express_validator_1.body)('shippingAddress.lastName').trim().notEmpty(),
    (0, express_validator_1.body)('shippingAddress.phone').trim().notEmpty(),
    (0, express_validator_1.body)('shippingAddress.street').trim().notEmpty(),
    (0, express_validator_1.body)('shippingAddress.city').trim().notEmpty(),
    (0, express_validator_1.body)('shippingAddress.state').trim().notEmpty(),
    (0, express_validator_1.body)('shippingAddress.country').trim().notEmpty(),
    (0, express_validator_1.body)('shippingAddress.postalCode').trim().notEmpty(),
    (0, express_validator_1.body)('orderNote').optional().isString().trim(),
    (0, express_validator_1.body)('paymentMethod')
        .equals('cod')
        .withMessage('Only Cash on Delivery is accepted'),
    (0, express_validator_1.body)('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),
    (0, express_validator_1.body)('items.*.productId').isMongoId(),
    (0, express_validator_1.body)('items.*.quantity').isInt({ min: 1 }),
    (0, express_validator_1.body)('items.*.size').trim().notEmpty(),
    (0, express_validator_1.body)('items.*.color').trim().notEmpty(),
];
exports.updateOrderStatusValidator = [
    (0, express_validator_1.param)('id').isMongoId(),
    (0, express_validator_1.body)('status').isIn(orderStatuses),
];
exports.orderIdValidator = [(0, express_validator_1.param)('id').isMongoId()];
//# sourceMappingURL=order.validator.js.map