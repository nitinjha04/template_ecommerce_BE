import { Response } from 'express';
import { Request } from 'express';
import { UploadService } from '../services/upload.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../views/ApiResponse';
import { assertUploadFilesWithinLimits } from '../utils/productImages';

export class UploadController {
  static uploadSingle = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(400, 'No image provided');
    }
    assertUploadFilesWithinLimits([req.file]);

    const folder = (req.body.folder as string) || 'products';
    const result = await UploadService.uploadImage(req.file, folder);
    ApiResponse.success(res, result, 'Image uploaded successfully');
  });

  static uploadMultiple = asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    assertUploadFilesWithinLimits(files);

    const folder = (req.body.folder as string) || 'products';
    const results = await UploadService.uploadMultiple(files, folder);
    ApiResponse.success(res, results, 'Images uploaded successfully');
  });
}
