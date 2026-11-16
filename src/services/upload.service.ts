import { getImageKit } from '../config/imagekit';
import { isImageKitConfigured } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { saveFileLocally } from './localUpload.service';

const mapImageKitError = (err: unknown): ApiError => {
  const message =
    err instanceof Error ? err.message : 'Image upload failed';

  if (/authenticated|authentication|unauthorized|401/i.test(message)) {
    return new ApiError(
      503,
      'ImageKit credentials are invalid. Set valid IMAGEKIT_* keys in .env or use image URLs only.'
    );
  }

  return new ApiError(502, message || 'Image upload failed');
};

export class UploadService {
  static async uploadImage(
    file: Express.Multer.File,
    folder = 'products'
  ): Promise<{ url: string; fileId: string; name: string }> {
    if (!file?.buffer) {
      throw new ApiError(400, 'No file provided');
    }

    if (!isImageKitConfigured()) {
      return saveFileLocally(file, folder);
    }

    try {
      const imagekit = getImageKit();
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
    } catch (err) {
      throw mapImageKitError(err);
    }
  }

  static async uploadMultiple(
    files: Express.Multer.File[],
    folder = 'products'
  ) {
    if (!files?.length) {
      throw new ApiError(400, 'No files provided');
    }

    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }
}
