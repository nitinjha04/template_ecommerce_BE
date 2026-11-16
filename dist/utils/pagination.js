"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySearchOr = exports.searchRegex = exports.escapeRegex = exports.buildPaginationMeta = exports.parsePagination = void 0;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const parsePagination = (query, defaultLimit = DEFAULT_LIMIT) => {
    const page = Math.max(1, Number(query.page) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || defaultLimit));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.parsePagination = parsePagination;
const buildPaginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
});
exports.buildPaginationMeta = buildPaginationMeta;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
exports.escapeRegex = escapeRegex;
const searchRegex = (term) => {
    const trimmed = term.trim();
    if (!trimmed)
        return null;
    return new RegExp((0, exports.escapeRegex)(trimmed), 'i');
};
exports.searchRegex = searchRegex;
const applySearchOr = (filter, term, fields) => {
    const regex = term ? (0, exports.searchRegex)(term) : null;
    if (!regex)
        return filter;
    return {
        ...filter,
        $or: fields.map((field) => ({ [field]: regex })),
    };
};
exports.applySearchOr = applySearchOr;
