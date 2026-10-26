import { IProduct } from '../models';
import { shortenCategoryLabel } from './category-label';

type ProductLike = Record<string, unknown> & {
  _id?: unknown;
  id?: string;
  toJSON?: () => Record<string, unknown>;
};

/** Ensures API responses always expose `id` (aggregate results only have `_id`). */
export const serializeProduct = (doc: ProductLike | IProduct): Record<string, unknown> => {
  const plain: Record<string, unknown> =
    typeof (doc as ProductLike).toJSON === 'function'
      ? ((doc as IProduct).toJSON() as Record<string, unknown>)
      : { ...(doc as Record<string, unknown>) };

  if (plain._id != null && (plain.id == null || plain.id === '')) {
    plain.id = String(plain._id);
  }

  delete plain._rand;
  delete plain._id;
  delete plain.__v;

  if (typeof plain.category === 'string') {
    plain.category = shortenCategoryLabel(plain.category);
  }
  if (typeof plain.breadcrumbCategory === 'string') {
    plain.breadcrumbCategory = shortenCategoryLabel(plain.breadcrumbCategory);
  }

  return plain;
};

export const serializeProducts = (
  docs: Array<ProductLike | IProduct>
): Record<string, unknown>[] => docs.map((d) => serializeProduct(d));
