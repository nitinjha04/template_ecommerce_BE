import { FilterQuery } from 'mongoose';
import { Store, IStore } from '../models/Store.model';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { normalizeStoreDomain } from '../utils/storeDomain';
import { slugify } from '../utils/slug';

export type StoreDto = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const toDto = (doc: IStore): StoreDto => ({
  id: doc._id.toString(),
  name: doc.name,
  slug: doc.slug,
  domain: doc.domain,
  isActive: doc.isActive,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const ensureUniqueSlug = async (base: string, excludeId?: string): Promise<string> => {
  const root = slugify(base) || 'store';
  let attempt = 0;
  while (attempt < 100) {
    const candidate = attempt === 0 ? root : `${root}-${attempt}`;
    const filter: FilterQuery<IStore> = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Store.findOne(filter).select('_id').lean();
    if (!exists) return candidate;
    attempt += 1;
  }
  return `${root}-${Date.now()}`;
};

const LOCALHOST_PATTERN = /^(localhost|127\.0\.0\.1)$/;

export class StoreService {
  static async resolveByDomain(domainInput?: string): Promise<StoreDto | null> {
    let domain = domainInput ? normalizeStoreDomain(domainInput) : '';
    if (!domain || LOCALHOST_PATTERN.test(domain)) {
      domain = normalizeStoreDomain(env.defaultStoreDomain);
    }

    const store = await Store.findOne({ domain, isActive: { $ne: false } }).exec();
    return store ? toDto(store) : null;
  }

  static async getDefaultStore(): Promise<StoreDto> {
    const store = await this.resolveByDomain(env.defaultStoreDomain);
    if (!store) {
      throw new ApiError(
        503,
        `Default store not configured for domain "${env.defaultStoreDomain}". Run npm run migrate:assign-store.`
      );
    }
    return store;
  }

  static async listAll(): Promise<StoreDto[]> {
    const stores = await Store.find().sort({ name: 1 }).exec();
    return stores.map(toDto);
  }

  static async getById(id: string): Promise<StoreDto> {
    const store = await Store.findById(id).exec();
    if (!store) throw new ApiError(404, 'Store not found');
    return toDto(store);
  }

  static async create(data: {
    name: string;
    domain: string;
    slug?: string;
    isActive?: boolean;
  }): Promise<StoreDto> {
    const name = data.name.trim();
    const domain = normalizeStoreDomain(data.domain);
    if (!name) throw new ApiError(400, 'Store name is required');
    if (!domain) throw new ApiError(400, 'Store domain is required');

    const slug = data.slug?.trim()
      ? slugify(data.slug)
      : await ensureUniqueSlug(name);

    const existingDomain = await Store.findOne({ domain }).select('_id').lean();
    if (existingDomain) throw new ApiError(409, 'Domain is already used by another store');

    const existingSlug = await Store.findOne({ slug }).select('_id').lean();
    if (existingSlug) throw new ApiError(409, 'Slug is already in use');

    const store = await Store.create({
      name,
      domain,
      slug,
      isActive: data.isActive ?? true,
    });
    return toDto(store);
  }

  static async update(
    id: string,
    data: Partial<{ name: string; domain: string; slug: string; isActive: boolean }>
  ): Promise<StoreDto> {
    const store = await Store.findById(id);
    if (!store) throw new ApiError(404, 'Store not found');

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new ApiError(400, 'Store name is required');
      store.name = name;
    }

    if (data.domain !== undefined) {
      const domain = normalizeStoreDomain(data.domain);
      if (!domain) throw new ApiError(400, 'Store domain is required');
      const duplicate = await Store.findOne({ domain, _id: { $ne: id } })
        .select('_id')
        .lean();
      if (duplicate) throw new ApiError(409, 'Domain is already used');
      store.domain = domain;
    }

    if (data.slug !== undefined) {
      const slug = slugify(data.slug.trim());
      if (!slug) throw new ApiError(400, 'Store slug is required');
      const duplicate = await Store.findOne({ slug, _id: { $ne: id } })
        .select('_id')
        .lean();
      if (duplicate) throw new ApiError(409, 'Slug is already in use');
      store.slug = slug;
    }

    if (data.isActive !== undefined) store.isActive = data.isActive;

    await store.save();
    return toDto(store);
  }

  static async remove(id: string): Promise<void> {
    const store = await Store.findById(id);
    if (!store) throw new ApiError(404, 'Store not found');
    await Store.findByIdAndDelete(id);
  }
}
