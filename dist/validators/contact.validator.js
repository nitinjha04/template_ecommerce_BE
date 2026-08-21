"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactIdValidator = exports.createContactValidator = void 0;
const express_validator_1 = require("express-validator");
exports.createContactValidator = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('subject').trim().notEmpty().withMessage('Subject is required'),
    (0, express_validator_1.body)('message').trim().notEmpty().withMessage('Message is required'),
];
exports.contactIdValidator = [(0, express_validator_1.param)('id').isMongoId()];
