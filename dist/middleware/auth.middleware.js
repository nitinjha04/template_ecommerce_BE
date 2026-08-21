"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ApiError_1 = require("../utils/ApiError");
const jwt_1 = require("../utils/jwt");
const getBearerToken = (header) => {
    if (!header?.startsWith('Bearer '))
        return null;
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
};
const toAuthError = (err) => {
    if (err instanceof ApiError_1.ApiError)
        return err;
    if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
        return new ApiError_1.ApiError(401, 'Session expired. Please sign in again.');
    }
    if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
        return new ApiError_1.ApiError(401, 'Invalid or expired token. Please sign in again.');
    }
    return new ApiError_1.ApiError(401, 'Authentication required');
};
/** Requires `Authorization: Bearer <token>` on protected routes. */
const authenticate = (req, _res, next) => {
    try {
        const token = getBearerToken(req.headers.authorization);
        if (!token) {
            throw new ApiError_1.ApiError(401, 'Authentication required. Send Bearer token in Authorization header.');
        }
        req.user = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch (err) {
        next(toAuthError(err));
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
        next(err instanceof ApiError_1.ApiError ? err : new ApiError_1.ApiError(403, 'Forbidden'));
    }
};
exports.authorize = authorize;
