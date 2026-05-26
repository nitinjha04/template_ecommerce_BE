"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendSignupOtpValidator = exports.resetPasswordValidator = exports.verifyOtpValidator = exports.forgotPasswordValidator = exports.loginValidator = exports.signupValidator = void 0;
const express_validator_1 = require("express-validator");
exports.signupValidator = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];
exports.loginValidator = [
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
];
exports.forgotPasswordValidator = [
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];
exports.verifyOtpValidator = [
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    (0, express_validator_1.body)('otp')
        .trim()
        .matches(/^\d{6}$/)
        .withMessage('OTP must be a 6-digit code'),
];
exports.resetPasswordValidator = [
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];
exports.resendSignupOtpValidator = [
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];
