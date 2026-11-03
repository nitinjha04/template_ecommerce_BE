"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const env_1 = require("../config/env");
const upload_service_1 = require("../services/upload.service");
const ApiError_1 = require("../utils/ApiError");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
class UploadController {
    static uploadSingle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        if (!(0, env_1.isImageKitConfigured)()) {
            throw new ApiError_1.ApiError(503, 'Image upload service is not configured');
        }
        const folder = req.body.folder || 'products';
        const result = await upload_service_1.UploadService.uploadImage(req.file, folder);
        ApiResponse_1.ApiResponse.success(res, result, 'Image uploaded successfully');
    });
    static uploadMultiple = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        if (!(0, env_1.isImageKitConfigured)()) {
            throw new ApiError_1.ApiError(503, 'Image upload service is not configured');
        }
        const folder = req.body.folder || 'products';
        const files = req.files;
        const results = await upload_service_1.UploadService.uploadMultiple(files, folder);
        ApiResponse_1.ApiResponse.success(res, results, 'Images uploaded successfully');
    });
}
exports.UploadController = UploadController;
//# sourceMappingURL=upload.controller.js.map