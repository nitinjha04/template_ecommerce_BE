"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
const ApiError_1 = require("../utils/ApiError");
const ApiResponse_1 = require("../views/ApiResponse");
const env_1 = require("../config/env");
const notFound = (req, _res, next) => {
    next(new ApiError_1.ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
exports.notFound = notFound;
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof ApiError_1.ApiError) {
        ApiResponse_1.ApiResponse.error(res, err.message, err.statusCode, err.errors);
        return;
    }
    if (err.name === 'ValidationError') {
        ApiResponse_1.ApiResponse.error(res, err.message, 400);
        return;
    }
    if (err.code === 11000) {
        ApiResponse_1.ApiResponse.error(res, 'Duplicate field value entered', 409);
        return;
    }
    if (err.name === 'CastError') {
        ApiResponse_1.ApiResponse.error(res, 'Invalid resource identifier', 400);
        return;
    }
    if (err.name === 'JsonWebTokenError') {
        ApiResponse_1.ApiResponse.error(res, 'Invalid token', 401);
        return;
    }
    if (err.name === 'TokenExpiredError') {
        ApiResponse_1.ApiResponse.error(res, 'Token expired', 401);
        return;
    }
    console.error(err);
    const message = env_1.env.nodeEnv === 'production' ? 'Internal server error' : err.message;
    ApiResponse_1.ApiResponse.error(res, message, 500);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map