"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImageUrl = exports.catalogImages = void 0;
const slugSeed = (name, category) => `${category}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
/**
 * Stable, hotlink-friendly product images (Picsum seeds — one unique image per product).
 */
const catalogImages = (name, category) => {
    const seed = slugSeed(name, category);
    return [
        `https://picsum.photos/seed/${seed}/800/1000`,
        `https://picsum.photos/seed/${seed}-alt/800/1000`,
    ];
};
exports.catalogImages = catalogImages;
const validateImageUrl = async (url) => {
    try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        const type = res.headers.get('content-type') ?? '';
        return res.ok && type.startsWith('image/');
    }
    catch {
        return false;
    }
};
exports.validateImageUrl = validateImageUrl;
