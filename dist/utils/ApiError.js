"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    errors;
    /** Optional structured payload for clients (e.g. gateway diagnostics). */
    data;
    constructor(statusCode, message, errors, data) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.data = data;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}
exports.ApiError = ApiError;
