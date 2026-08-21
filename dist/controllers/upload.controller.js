"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const upload_service_1 = require("../services/upload.service");
const ApiError_1 = require("../utils/ApiError");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiResponse_1 = require("../views/ApiResponse");
const productImages_1 = require("../utils/productImages");
class UploadController {
    static uploadSingle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'No image provided');
        }
        (0, productImages_1.assertUploadFilesWithinLimits)([req.file]);
        const folder = req.body.folder || 'products';
        const result = await upload_service_1.UploadService.uploadImage(req.file, folder);
        ApiResponse_1.ApiResponse.success(res, result, 'Image uploaded successfully');
    });
    static uploadMultiple = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const files = req.files || [];
        (0, productImages_1.assertUploadFilesWithinLimits)(files);
        const folder = req.body.folder || 'products';
        const results = await upload_service_1.UploadService.uploadMultiple(files, folder);
        ApiResponse_1.ApiResponse.success(res, results, 'Images uploaded successfully');
    });
}
exports.UploadController = UploadController;
