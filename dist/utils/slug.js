"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueSlug = exports.slugify = void 0;
const slugify = (text) => text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
exports.slugify = slugify;
const uniqueSlug = async (base, model, excludeId) => {
    const root = (0, exports.slugify)(base) || 'product';
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const filter = { slug: candidate };
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await model.findOne(filter).select('_id');
        if (!exists)
            return candidate;
        attempt += 1;
    }
    return `${root}-${Date.now()}`;
};
exports.uniqueSlug = uniqueSlug;
