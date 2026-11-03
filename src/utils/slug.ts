import { Model } from 'mongoose';

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const uniqueSlug = async (
  base: string,
  model: Model<unknown>,
  excludeId?: string
): Promise<string> => {
  const root = slugify(base) || 'product';
  let attempt = 0;

  while (attempt < 100) {
    const candidate = attempt === 0 ? root : `${root}-${attempt}`;
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };

    const exists = await model.findOne(filter).select('_id');
    if (!exists) return candidate;
    attempt += 1;
  }

  return `${root}-${Date.now()}`;
};
