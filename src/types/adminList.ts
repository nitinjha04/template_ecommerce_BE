export type AdminListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  /** When set, scope list to this store; omit for all stores (admin). */
  storeId?: string;
};
