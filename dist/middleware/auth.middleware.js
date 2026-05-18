"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const ApiError_1 = require("../utils/ApiError");
const jwt_1 = require("../utils/jwt");
const authenticate = (req, _res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            throw new ApiError_1.ApiError(401, 'Authentication required');
        }
        const token = header.split(' ')[1];
        req.user = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => (req, _res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, 'Authentication required');
        }
        if (!roles.includes(req.user.role)) {
            throw new ApiError_1.ApiError(403, 'You do not have permission to perform this action');
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.authorize = authorize;
