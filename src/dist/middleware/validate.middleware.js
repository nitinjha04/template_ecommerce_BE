"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const express_validator_1 = require("express-validator");
const ApiError_1 = require("../utils/ApiError");
const validate = (chains) => async (req, _res, next) => {
    await Promise.all(chains.map((chain) => chain.run(req)));
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new ApiError_1.ApiError(400, 'Validation failed', errors.array());
    }
    next();
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map