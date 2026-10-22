import { FilterQuery } from 'mongoose';

export type PaginationInput = {
  page?: number;
  limit?: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export const parsePagination = (
  query: PaginationInput,
  defaultLimit = DEFAULT_LIMIT
): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, Number(query.page) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(query.limit) || defaultLimit)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
});

export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchRegex = (term: string): RegExp | null => {
  const trimmed = term.trim();
  if (!trimmed) return null;
  return new RegExp(escapeRegex(trimmed), 'i');
};

export const applySearchOr = <T>(
  filter: FilterQuery<T>,
  term: string | undefined,
  fields: string[]
): FilterQuery<T> => {
  const regex = term ? searchRegex(term) : null;
  if (!regex) return filter;
  return {
    ...filter,
    $or: fields.map((field) => ({ [field]: regex })),
  };
};
