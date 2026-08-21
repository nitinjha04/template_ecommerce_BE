import { Types } from 'mongoose';

/** Parse optional `storeId` from admin list/dashboard query (omit = all stores). */
export const pickStoreIdFromQuery = (
  value: unknown
): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const id = value.trim();
  if (!Types.ObjectId.isValid(id)) return undefined;
  return id;
};
