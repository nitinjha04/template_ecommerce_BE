import { Category, ICategory, Product } from '../models';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/slug';

const DEFAULT_CATEGORY_NAMES = ['Men', 'Lehenga', 'Saree', 'Accessories'] as const;

const DEFAULT_SLUGS: Record<(typeof DEFAULT_CATEGORY_NAMES)[number], string> = {
  Men: 'men',
  Lehenga: 'lehenga',
  Saree: 'saree',
  Accessories: 'accessories',
};

let defaultsEnsured = false;

const ensureUniqueSlug = async (
  base: string,
  excludeId?: string
): Promise<string> => {
  const root = slugify(base) || 'category';
  let attempt = 0;
  while (attempt < 100) {
    const candidate = attempt === 0 ? root : `${root}-${attempt}`;
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Category.findOne(filter).select('_id').lean();
    if (!exists) return candidate;
    attempt += 1;
  }
  return `${root}-${Date.now()}`;
};

export class CategoryService {
  /** Run once at startup — not on every list request. */
  static async ensureDefaults(): Promise<void> {
    if (defaultsEnsured) return;

    await Category.bulkWrite(
      DEFAULT_CATEGORY_NAMES.map((name, index) => ({
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
      }))
    );

    defaultsEnsured = true;
  }

  static async listActive(): Promise<ICategory[]> {
    return Category.find({ isActive: { $ne: false } })
      .select('name slug sortOrder isActive')
      .sort({ sortOrder: 1, name: 1 })
      .lean<ICategory[]>();
  }

  static async listAll(): Promise<ICategory[]> {
    return Category.find()
      .select('name slug sortOrder isActive')
      .sort({ sortOrder: 1, name: 1 })
      .lean<ICategory[]>();
  }

  static async create(data: {
    name: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<ICategory> {
    const name = data.name.trim();
    if (!name) {
      throw new ApiError(400, 'Category name is required');
    }

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
      throw new ApiError(409, 'Category already exists');
    }

    const slug = await ensureUniqueSlug(name);
    return Category.create({
      name,
      slug,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    });
  }

  static async update(
    id: string,
    data: Partial<{ name: string; sortOrder: number; isActive: boolean }>
  ): Promise<ICategory> {
    const category = await Category.findById(id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new ApiError(400, 'Category name is required');
      }
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (duplicate) {
        throw new ApiError(409, 'Category name already in use');
      }

      const oldName = category.name;
      category.name = name;
      category.slug = await ensureUniqueSlug(name, id);

      if (oldName !== name) {
        await Product.updateMany({ category: oldName }, { $set: { category: name } });
      }
    }

    if (data.sortOrder !== undefined) category.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    await category.save();
    return category;
  }

  static async remove(id: string): Promise<void> {
    const category = await Category.findById(id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete category with ${productCount} product(s). Reassign products first.`
      );
    }

    await Category.findByIdAndDelete(id);
  }

  /** Ensures category exists when saving a product (by display name). */
  static async resolveProductCategory(name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ApiError(400, 'Category is required');
    }

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();

    if (!existing) {
      const created = await CategoryService.create({ name: trimmed });
      return created.name;
    }

    if (!existing.isActive) {
      throw new ApiError(400, 'Category is disabled');
    }

    return existing.name;
  }
}
