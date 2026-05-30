import { AsyncLocalStorage } from 'async_hooks';
import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError';

export type StoreContextValue = {
  storeId: string;
  storeSlug: string;
  storeDomain: string;
  storeName: string;
};

const storage = new AsyncLocalStorage<StoreContextValue>();

export const runWithStoreContext = <T>(
  value: StoreContextValue,
  fn: () => T
): T => storage.run(value, fn);

export const getStoreContext = (): StoreContextValue | undefined =>
  storage.getStore();

export const getStoreId = (): string | undefined => getStoreContext()?.storeId;

export const requireStoreId = (): string => {
  const id = getStoreId();
  if (!id) {
    throw new ApiError(400, 'Could not resolve store for this request');
  }
  return id;
};

export const getStoreObjectId = (): Types.ObjectId =>
  new Types.ObjectId(requireStoreId());
