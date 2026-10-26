"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const imagekit_1 = require("../config/imagekit");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
const localUpload_service_1 = require("./localUpload.service");
const mapImageKitError = (err) => {
    const message = err instanceof Error ? err.message : 'Image upload failed';
    if (/authenticated|authentication|unauthorized|401/i.test(message)) {
        return new ApiError_1.ApiError(503, 'ImageKit credentials are invalid. Set valid IMAGEKIT_* keys in .env or use image URLs only.');
    }
    return new ApiError_1.ApiError(502, message || 'Image upload failed');
};
class UploadService {
    static async uploadImage(file, folder = 'products') {
        if (!file?.buffer) {
            throw new ApiError_1.ApiError(400, 'No file provided');
        }
        if (!(0, env_1.isImageKitConfigured)()) {
            return (0, localUpload_service_1.saveFileLocally)(file, folder);
        }
        try {
            const imagekit = (0, imagekit_1.getImageKit)();
            const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            const result = await imagekit.upload({
                file: file.buffer,
                fileName,
                folder,
                useUniqueFileName: true,
            });
            return {
                url: result.url,
                fileId: result.fileId,
                name: result.name,
            };
        }
        catch (err) {
            throw mapImageKitError(err);
        }
    }
    static async uploadMultiple(files, folder = 'products') {
        if (!files?.length) {
            throw new ApiError_1.ApiError(400, 'No files provided');
        }
        return Promise.all(files.map((file) => this.uploadImage(file, folder)));
    }
}
exports.UploadService = UploadService;
