import { Response } from 'express';
import { Request } from 'express';
import { isImageKitConfigured } from '../config/env';
import { UploadService } from '../services/upload.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../views/ApiResponse';

export class UploadController {
  static uploadSingle = asyncHandler(async (req: Request, res: Response) => {
    if (!isImageKitConfigured()) {
      throw new ApiError(503, 'Image upload service is not configured');
    }

    const folder = (req.body.folder as string) || 'products';
    const result = await UploadService.uploadImage(req.file!, folder);
    ApiResponse.success(res, result, 'Image uploaded successfully');
  });

  static uploadMultiple = asyncHandler(async (req: Request, res: Response) => {
    if (!isImageKitConfigured()) {
      throw new ApiError(503, 'Image upload service is not configured');
    }

    const folder = (req.body.folder as string) || 'products';
    const files = req.files as Express.Multer.File[];
    const results = await UploadService.uploadMultiple(files, folder);
    ApiResponse.success(res, results, 'Images uploaded successfully');
  });
}
