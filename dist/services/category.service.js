"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const slug_1 = require("../utils/slug");
const storeScope_1 = require("../utils/storeScope");
const ensureUniqueSlug = async (base, excludeId) => {
    const root = (0, slug_1.slugify)(base) || 'category';
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const filter = (0, storeScope_1.mergeStoreFilter)({ slug: candidate });
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await models_1.Category.findOne(filter).select('_id').lean();
        if (!exists)
            return candidate;
        attempt += 1;
    }
    return `${root}-${Date.now()}`;
};
class CategoryService {
    static async listActive() {
        return models_1.Category.find((0, storeScope_1.mergeStoreFilter)({ isActive: { $ne: false } }))
            .select('name slug sortOrder isActive')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
    }
    static async listAll() {
        return models_1.Category.find((0, storeScope_1.mergeStoreFilter)())
            .select('name slug sortOrder isActive')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
    }
    static async create(data) {
        const name = data.name.trim();
        if (!name) {
            throw new ApiError_1.ApiError(400, 'Category name is required');
        }
        const existing = await models_1.Category.findOne((0, storeScope_1.mergeStoreFilter)({
            name: {
                $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            },
        }));
        if (existing) {
            throw new ApiError_1.ApiError(409, 'Category already exists');
        }
        const slug = await ensureUniqueSlug(name);
        return models_1.Category.create((0, storeScope_1.withStoreId)({
            name,
            slug,
            sortOrder: data.sortOrder ?? 0,
            isActive: data.isActive ?? true,
        }));
    }
    static async update(id, data) {
        const category = await models_1.Category.findOne((0, storeScope_1.mergeStoreFilter)({ _id: id }));
        if (!category) {
            throw new ApiError_1.ApiError(404, 'Category not found');
        }
        if (data.name !== undefined) {
            const name = data.name.trim();
            if (!name) {
                throw new ApiError_1.ApiError(400, 'Category name is required');
            }
            const duplicate = await models_1.Category.findOne((0, storeScope_1.mergeStoreFilter)({
                _id: { $ne: id },
                name: {
                    $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                },
            }));
            if (duplicate) {
                throw new ApiError_1.ApiError(409, 'Category name already in use');
            }
            const oldName = category.name;
            category.name = name;
            category.slug = await ensureUniqueSlug(name, id);
            if (oldName !== name) {
                await models_1.Product.updateMany((0, storeScope_1.mergeStoreFilter)({ category: oldName }), { $set: { category: name } });
            }
        }
        if (data.sortOrder !== undefined)
            category.sortOrder = data.sortOrder;
        if (data.isActive !== undefined)
            category.isActive = data.isActive;
        await category.save();
        return category;
    }
    static async remove(id) {
        const category = await models_1.Category.findOne((0, storeScope_1.mergeStoreFilter)({ _id: id }));
        if (!category) {
            throw new ApiError_1.ApiError(404, 'Category not found');
        }
        const productCount = await models_1.Product.countDocuments((0, storeScope_1.mergeStoreFilter)({ category: category.name }));
        if (productCount > 0) {
            throw new ApiError_1.ApiError(400, `Cannot delete category with ${productCount} product(s). Reassign products first.`);
        }
        await models_1.Category.findOneAndDelete((0, storeScope_1.mergeStoreFilter)({ _id: id }));
    }
    /** Ensures category exists when saving a product (by display name). */
    static async resolveProductCategory(name) {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new ApiError_1.ApiError(400, 'Category is required');
        }
        const existing = await models_1.Category.findOne((0, storeScope_1.mergeStoreFilter)({
            name: {
                $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            },
        })).lean();
        if (!existing) {
            const created = await CategoryService.create({ name: trimmed });
            return created.name;
        }
        if (!existing.isActive) {
            throw new ApiError_1.ApiError(400, 'Category is disabled');
        }
        return existing.name;
    }
}
exports.CategoryService = CategoryService;
