"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageKeysFromUrls = exports.filterProductImages = exports.isBlockedImageUrl = exports.imageDedupeKey = exports.normalizeImageUrl = void 0;
const DESIGNEDIT_PATTERN = /designedit_image/i;
const normalizeImageUrl = (url) => {
    const trimmed = url.trim();
    if (!trimmed)
        return '';
    const withProtocol = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    return withProtocol.split('?')[0] ?? withProtocol;
};
exports.normalizeImageUrl = normalizeImageUrl;
/** Stable key for deduplication (pathname, lowercased). */
const imageDedupeKey = (url) => {
    const normalized = (0, exports.normalizeImageUrl)(url).toLowerCase();
    try {
        const parsed = new URL(normalized.startsWith('http') ? normalized : `https:${normalized}`);
        return parsed.pathname || normalized;
    }
    catch {
        return normalized;
    }
};
exports.imageDedupeKey = imageDedupeKey;
const isBlockedImageUrl = (url) => DESIGNEDIT_PATTERN.test(url);
exports.isBlockedImageUrl = isBlockedImageUrl;
/** Remove designedit images; dedupe by pathname. */
const filterProductImages = (urls) => {
    const out = [];
    const seen = new Set();
    for (const raw of urls) {
        if (!raw || (0, exports.isBlockedImageUrl)(raw))
            continue;
        const clean = (0, exports.normalizeImageUrl)(raw);
        if (!clean)
            continue;
        const key = (0, exports.imageDedupeKey)(clean);
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(clean);
    }
    return out;
};
exports.filterProductImages = filterProductImages;
const imageKeysFromUrls = (urls) => urls.map((u) => (0, exports.imageDedupeKey)(u)).filter(Boolean);
exports.imageKeysFromUrls = imageKeysFromUrls;
