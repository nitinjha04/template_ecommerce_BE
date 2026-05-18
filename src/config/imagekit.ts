import ImageKit from 'imagekit';
import { env, isImageKitConfigured } from './env';

let imagekitClient: ImageKit | null = null;

export const getImageKit = (): ImageKit => {
  if (!isImageKitConfigured()) {
    throw new Error(
      'ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in .env'
    );
  }

  if (!imagekitClient) {
    imagekitClient = new ImageKit({
      publicKey: env.imagekit.publicKey,
      privateKey: env.imagekit.privateKey,
      urlEndpoint: env.imagekit.urlEndpoint,
    });
  }

  return imagekitClient;
};
