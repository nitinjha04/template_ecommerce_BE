"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.formatValidatorErrors = void 0;
const express_validator_1 = require("express-validator");
const ApiError_1 = require("../utils/ApiError");
const formatValidatorErrors = (items) => items.map((err) => ({
    field: 'path' in err ? String(err.path) : undefined,
    message: err.msg,
}));
exports.formatValidatorErrors = formatValidatorErrors;
const validate = (chains) => async (req, _res, next) => {
    try {
        await Promise.all(chains.map((chain) => chain.run(req)));
        const result = (0, express_validator_1.validationResult)(req);
        if (!result.isEmpty()) {
            const formatted = (0, exports.formatValidatorErrors)(result.array());
            const summary = formatted.map((e) => e.message).join('. ') || 'Validation failed';
            next(new ApiError_1.ApiError(400, summary, formatted));
            return;
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.validate = validate;
