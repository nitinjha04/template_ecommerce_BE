import fs from 'fs/promises';
import path from 'path';
import { getApiPublicOrigin } from '../config/env';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

const safeSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

export const saveFileLocally = async (
  file: Express.Multer.File,
  folder = 'products'
): Promise<{ url: string; fileId: string; name: string }> => {
  const safeFolder = safeSegment(folder) || 'products';
  const dir = path.join(UPLOAD_ROOT, safeFolder);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.originalname || '') || '.jpg';
  const base = safeSegment(path.basename(file.originalname || 'image', ext)) || 'image';
  const fileName = `${Date.now()}-${base}${ext}`;
  const diskPath = path.join(dir, fileName);

  await fs.writeFile(diskPath, file.buffer);

  const origin = getApiPublicOrigin();
  const url = `${origin}/uploads/${safeFolder}/${fileName}`;

  return { url, fileId: fileName, name: fileName };
};
