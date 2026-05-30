import { FilterQuery, Types } from 'mongoose';
import { getStoreId } from '../context/store.context';

const resolveStoreId = (explicitStoreId?: string): string | undefined => {
  if (explicitStoreId && Types.ObjectId.isValid(explicitStoreId)) {
    return explicitStoreId;
  }
  return getStoreId();
};

/** Merge store into filter: explicit/query storeId, else request store context, else all stores. */
export const mergeStoreFilter = <T>(
  filter: FilterQuery<T> = {},
  explicitStoreId?: string
): FilterQuery<T> => {
  const storeId = resolveStoreId(explicitStoreId);
  if (!storeId) return filter;
  return { ...filter, store: new Types.ObjectId(storeId) };
};

export const withStoreId = <T extends Record<string, unknown>>(
  payload: T,
  explicitStoreId?: string
): T & { store: Types.ObjectId } => {
  const storeId = resolveStoreId(explicitStoreId);
  if (!storeId) {
    return payload as T & { store: Types.ObjectId };
  }
  return { ...payload, store: new Types.ObjectId(storeId) };
};

export const requireStoreId = (explicitStoreId?: string): Types.ObjectId => {
  const storeId = resolveStoreId(explicitStoreId);
  if (!storeId) {
    throw new Error('storeId is required');
  }
  return new Types.ObjectId(storeId);
};
