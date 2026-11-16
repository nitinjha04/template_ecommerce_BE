"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailField = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validates email format and lowercases + trims only.
 * Do not use express-validator's normalizeEmail() — it strips Gmail +tags
 * (e.g. user+15@gmail.com → user@gmail.com).
 */
const emailField = (field = 'email') => (0, express_validator_1.body)(field)
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .customSanitizer((value) => value.toLowerCase());
exports.emailField = emailField;
