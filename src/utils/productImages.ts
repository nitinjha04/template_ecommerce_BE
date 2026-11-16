import { ApiError } from './ApiError';
import {
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_BYTES,
} from '../constants/productImages';

export const normalizeProductImages = (images: unknown): string[] => {
  if (!Array.isArray(images)) {
    throw new ApiError(400, 'Images must be an array');
  }

  const urls = images
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  if (urls.length === 0) {
    throw new ApiError(400, 'At least one product image is required');
  }

  if (urls.length > MAX_PRODUCT_IMAGES) {
    throw new ApiError(
      400,
      `Maximum ${MAX_PRODUCT_IMAGES} images allowed per product`
    );
  }

  return urls;
};

export const assertUploadFilesWithinLimits = (
  files: Express.Multer.File[]
): void => {
  if (files.length === 0) {
    throw new ApiError(400, 'No images provided');
  }

  if (files.length > MAX_PRODUCT_IMAGES) {
    throw new ApiError(
      400,
      `Maximum ${MAX_PRODUCT_IMAGES} images per upload`
    );
  }

  for (const file of files) {
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      throw new ApiError(
        400,
        `Each image must be ${MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)}MB or smaller`
      );
    }
  }
};
