"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminListQueryValidator = void 0;
const express_validator_1 = require("express-validator");
exports.adminListQueryValidator = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('search').optional().isString().trim(),
    (0, express_validator_1.query)('status').optional().isString().trim(),
];
