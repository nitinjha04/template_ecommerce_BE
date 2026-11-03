"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDomainFromRequest = exports.normalizeStoreDomain = void 0;
/** Normalize hostname for store lookup (no protocol, no www, lowercase). */
const normalizeStoreDomain = (raw) => {
    let value = raw.trim().toLowerCase();
    if (!value)
        return '';
    try {
        if (value.includes('://')) {
            value = new URL(value).hostname;
        }
        else if (value.includes('/')) {
            value = new URL(`https://${value}`).hostname;
        }
    }
    catch {
        value = value.split('/')[0] ?? value;
    }
    value = value.split(':')[0] ?? value;
    if (value.startsWith('www.')) {
        value = value.slice(4);
    }
    return value;
};
exports.normalizeStoreDomain = normalizeStoreDomain;
const extractDomainFromRequest = (input) => {
    const candidates = [
        input.headerDomain,
        input.origin,
        input.referer,
        input.host,
    ];
    for (const raw of candidates) {
        if (!raw?.trim())
            continue;
        const normalized = (0, exports.normalizeStoreDomain)(raw);
        if (normalized)
            return normalized;
    }
    return undefined;
};
exports.extractDomainFromRequest = extractDomainFromRequest;
