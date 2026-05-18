"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const imagekit_1 = require("../config/imagekit");
const ApiError_1 = require("../utils/ApiError");
class UploadService {
    static async uploadImage(file, folder = 'products') {
        if (!file?.buffer) {
            throw new ApiError_1.ApiError(400, 'No file provided');
        }
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
    static async uploadMultiple(files, folder = 'products') {
        if (!files?.length) {
            throw new ApiError_1.ApiError(400, 'No files provided');
        }
        return Promise.all(files.map((file) => this.uploadImage(file, folder)));
    }
}
exports.UploadService = UploadService;
