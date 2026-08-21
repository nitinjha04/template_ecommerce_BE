"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    static success(res, data, message = 'Success', statusCode = 200, meta) {
        const body = {
            success: true,
            message,
            data,
        };
        if (meta)
            body.meta = meta;
        return res.status(statusCode).json(body);
    }
    static created(res, data, message = 'Created successfully') {
        return ApiResponse.success(res, data, message, 201);
    }
    static error(res, message, statusCode = 500, errors, data) {
        const body = {
            success: false,
            message,
        };
        if (errors)
            body.errors = errors;
        if (data !== undefined)
            body.data = data;
        return res.status(statusCode).json(body);
    }
}
exports.ApiResponse = ApiResponse;
