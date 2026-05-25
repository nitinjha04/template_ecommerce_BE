"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const slug_1 = require("../utils/slug");
const DEFAULT_CATEGORY_NAMES = ['Men', 'Lehenga', 'Saree', 'Accessories'];
const DEFAULT_SLUGS = {
    Men: 'men',
    Lehenga: 'lehenga',
    Saree: 'saree',
    Accessories: 'accessories',
};
let defaultsEnsured = false;
const ensureUniqueSlug = async (base, excludeId) => {
    const root = (0, slug_1.slugify)(base) || 'category';
    let attempt = 0;
    while (attempt < 100) {
        const candidate = attempt === 0 ? root : `${root}-${attempt}`;
        const filter = { slug: candidate };
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
    /** Run once at startup — not on every list request. */
    static async ensureDefaults() {
        if (defaultsEnsured)
            return;
        await models_1.Category.bulkWrite(DEFAULT_CATEGORY_NAMES.map((name, index) => ({
            updateOne: {
                filter: { name },
                update: {
                    $setOnInsert: {
                        name,
                        slug: DEFAULT_SLUGS[name],
                        sortOrder: index,
                        isActive: true,
                    },
                },
                upsert: true,
            },
        })));
        defaultsEnsured = true;
    }
    static async listActive() {
        return models_1.Category.find({ isActive: { $ne: false } })
            .select('name slug sortOrder isActive')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
    }
    static async listAll() {
        return models_1.Category.find()
            .select('name slug sortOrder isActive')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
    }
    static async create(data) {
        const name = data.name.trim();
        if (!name) {
            throw new ApiError_1.ApiError(400, 'Category name is required');
        }
        const existing = await models_1.Category.findOne({
            name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });
        if (existing) {
            throw new ApiError_1.ApiError(409, 'Category already exists');
        }
        const slug = await ensureUniqueSlug(name);
        return models_1.Category.create({
            name,
            slug,
            sortOrder: data.sortOrder ?? 0,
            isActive: data.isActive ?? true,
        });
    }
    static async update(id, data) {
        const category = await models_1.Category.findById(id);
        if (!category) {
            throw new ApiError_1.ApiError(404, 'Category not found');
        }
        if (data.name !== undefined) {
            const name = data.name.trim();
            if (!name) {
                throw new ApiError_1.ApiError(400, 'Category name is required');
            }
            const duplicate = await models_1.Category.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            });
            if (duplicate) {
                throw new ApiError_1.ApiError(409, 'Category name already in use');
            }
            const oldName = category.name;
            category.name = name;
            category.slug = await ensureUniqueSlug(name, id);
            if (oldName !== name) {
                await models_1.Product.updateMany({ category: oldName }, { $set: { category: name } });
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
        const category = await models_1.Category.findById(id);
        if (!category) {
            throw new ApiError_1.ApiError(404, 'Category not found');
        }
        const productCount = await models_1.Product.countDocuments({ category: category.name });
        if (productCount > 0) {
            throw new ApiError_1.ApiError(400, `Cannot delete category with ${productCount} product(s). Reassign products first.`);
        }
        await models_1.Category.findByIdAndDelete(id);
    }
    /** Ensures category exists when saving a product (by display name). */
    static async resolveProductCategory(name) {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new ApiError_1.ApiError(400, 'Category is required');
        }
        const existing = await models_1.Category.findOne({
            name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        }).lean();
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
