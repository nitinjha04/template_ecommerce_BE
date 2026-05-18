import { getImageKit } from '../config/imagekit';
import { ApiError } from '../utils/ApiError';

export class UploadService {
  static async uploadImage(
    file: Express.Multer.File,
    folder = 'products'
  ): Promise<{ url: string; fileId: string; name: string }> {
    if (!file?.buffer) {
      throw new ApiError(400, 'No file provided');
    }

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
