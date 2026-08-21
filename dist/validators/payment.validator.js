"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayValidator = exports.createProviderPaymentValidator = exports.paymentIdValidator = exports.updatePaymentStatusValidator = void 0;
const express_validator_1 = require("express-validator");
const paymentStatuses = ['Completed', 'Pending', 'Failed'];
const paymentProviders = [
    'dsa_deeplink',
    'payu',
    'phonepe',
    'direct_upi',
    'razorpay',
];
exports.updatePaymentStatusValidator = [
    (0, express_validator_1.param)('id').isMongoId(),
    (0, express_validator_1.body)('status').isIn(paymentStatuses),
];
exports.paymentIdValidator = [(0, express_validator_1.param)('id').isMongoId()];
exports.createProviderPaymentValidator = [
    (0, express_validator_1.body)('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
    (0, express_validator_1.body)('provider')
        .trim()
        .isIn(paymentProviders)
        .withMessage('provider is invalid'),
    (0, express_validator_1.body)('gatewayId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('gatewayId must be a positive integer'),
    (0, express_validator_1.body)('email').optional().trim().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .isLength({ min: 8, max: 18 })
        .withMessage('Valid phone is required'),
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 1 }).withMessage('Valid name is required'),
];
exports.verifyRazorpayValidator = [
    (0, express_validator_1.body)('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
    (0, express_validator_1.body)('razorpay_order_id')
        .trim()
        .notEmpty()
        .withMessage('razorpay_order_id is required'),
    (0, express_validator_1.body)('razorpay_payment_id')
        .trim()
        .notEmpty()
        .withMessage('razorpay_payment_id is required'),
    (0, express_validator_1.body)('razorpay_signature')
        .trim()
        .notEmpty()
        .withMessage('razorpay_signature is required'),
    (0, express_validator_1.body)('email').optional().trim().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .isLength({ min: 8, max: 18 })
        .withMessage('Valid phone is required'),
];
