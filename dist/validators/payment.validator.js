"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIdValidator = exports.updatePaymentStatusValidator = void 0;
const express_validator_1 = require("express-validator");
const paymentStatuses = ['Completed', 'Pending', 'Failed'];
exports.updatePaymentStatusValidator = [
    (0, express_validator_1.param)('id').isMongoId(),
    (0, express_validator_1.body)('status').isIn(paymentStatuses),
];
exports.paymentIdValidator = [(0, express_validator_1.param)('id').isMongoId()];
