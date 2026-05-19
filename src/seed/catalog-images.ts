import { ProductCategory } from '../types';

const slugSeed = (name: string, category: ProductCategory): string =>
  `${category}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Stable, hotlink-friendly product images (Picsum seeds — one unique image per product).
 */
export const catalogImages = (
  name: string,
  category: ProductCategory
): string[] => {
  const seed = slugSeed(name, category);
  return [
    `https://picsum.photos/seed/${seed}/800/1000`,
    `https://picsum.photos/seed/${seed}-alt/800/1000`,
  ];
};

export const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const type = res.headers.get('content-type') ?? '';
    return res.ok && type.startsWith('image/');
  } catch {
    return false;
  }
};
