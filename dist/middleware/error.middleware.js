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
        const mongooseErr = err;
        const details = mongooseErr.errors
            ? Object.values(mongooseErr.errors).map((e) => ({
                field: e.path,
                message: e.message || 'Invalid value',
            }))
            : undefined;
        const summary = details?.map((d) => d.message).join('. ') || err.message || 'Validation failed';
        ApiResponse_1.ApiResponse.error(res, summary, 400, details);
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
    const multerCode = err.code;
    if (multerCode === 'LIMIT_FILE_SIZE') {
        ApiResponse_1.ApiResponse.error(res, 'Each image must be 5MB or smaller', 400);
        return;
    }
    if (multerCode === 'LIMIT_FILE_COUNT' || multerCode === 'LIMIT_UNEXPECTED_FILE') {
        ApiResponse_1.ApiResponse.error(res, 'Too many images in one upload (max 5)', 400);
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
