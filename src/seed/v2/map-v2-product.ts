import { ProductCategory } from '../../types';
import { buildRandomProductDetails } from './random-product-details';

/** Minimal shape read from v2 export JSON — only fields used by our Product model. */
export type V2GalleryImage = { url?: string; order?: number };
export type V2MainImage = { url?: string };
export type V2ColorEntry = {
  colorName?: string;
  sizes?: { sizeName?: string }[];
};

export type V2ProductRaw = {
  name?: string;
  description?: string;
  slug?: string;
  mainImage?: V2MainImage;
  galleryImages?: V2GalleryImage[];
  basePrice?: number;
  salePrice?: number;
  finalPrice?: number;
  ourPrice?: number;
  tags?: string[];
  colors?: V2ColorEntry[];
  availableColors?: string[];
  availableSizes?: string[];
  totalStock?: number;
  isSoldOut?: boolean;
  isActive?: boolean;
  isPublished?: boolean;
  position?: number;
};

export type MappedProduct = {
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  category: ProductCategory;
  description: string;
  sizes: string[];
  colors: string[];
  images: string[];
  tags: string[];
  inStock: boolean;
  featured: boolean;
  isHot: boolean;
  fabricComposition: string;
  garmentLength: string;
  packageContains: string;
  washCare: string;
  neckline: string;
  sleeveLength: string;
  fitting: string;
  weight: string;
  dimensions: string;
  stockQuantity: number;
  deliveryStartDate: Date;
  deliveryEndDate: Date;
  breadcrumbCategory: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
};

const SALE_MIN = 500;
const SALE_MAX = 1000;

const randomSalePrice = (): number =>
  Math.floor(Math.random() * (SALE_MAX - SALE_MIN + 1)) + SALE_MIN;

/** Sale price in ₹500–₹1000 (uses v2 price when already in range). */
export const resolveSalePrice = (raw: V2ProductRaw): number => {
  const fromV2 = resolvePrice(raw);
  if (fromV2 >= SALE_MIN && fromV2 <= SALE_MAX) return Math.round(fromV2);
  if (fromV2 > SALE_MAX) return SALE_MAX;
  if (fromV2 > 0 && fromV2 < SALE_MIN) return SALE_MIN;
  return randomSalePrice();
};

const stripHtml = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u003C/g, '<')
    .replace(/\u003E/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeName = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
};

/** Default CDN for v2 JSON relative paths (`/media/products/...`). */
export const V2_MEDIA_BASE_URL = 'https://uat.tangerineluxury.com';

export const resolveMediaUrl = (url: string, mediaBase?: string): string => {
  const u = url.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;

  const base = (
    mediaBase ??
    process.env.SEED_MEDIA_BASE_URL ??
    V2_MEDIA_BASE_URL
  ).replace(/\/$/, '');

  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
};

export const collectImages = (raw: V2ProductRaw, mediaBase?: string): string[] => {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (url?: string) => {
    if (!url) return;
    const resolved = resolveMediaUrl(url, mediaBase);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    urls.push(resolved);
  };

  add(raw.mainImage?.url);
  const gallery = [...(raw.galleryImages ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  for (const img of gallery) {
    add(img.url);
  }

  return urls;
};

export const collectColors = (raw: V2ProductRaw): string[] => {
  const fromAvailable = (raw.availableColors ?? []).map((c) => c.trim()).filter(Boolean);
  if (fromAvailable.length > 0) return [...new Set(fromAvailable)];

  const fromVariants = (raw.colors ?? [])
    .map((c) => c.colorName?.trim())
    .filter((c): c is string => Boolean(c));

  return [...new Set(fromVariants)];
};

export const collectSizes = (raw: V2ProductRaw): string[] => {
  const fromAvailable = (raw.availableSizes ?? []).map((s) => s.trim()).filter(Boolean);
  if (fromAvailable.length > 0) return [...new Set(fromAvailable)];

  const fromVariants: string[] = [];
  for (const color of raw.colors ?? []) {
    for (const size of color.sizes ?? []) {
      const name = size.sizeName?.trim();
      if (name) fromVariants.push(name);
    }
  }

  return [...new Set(fromVariants)];
};

export const resolvePrice = (raw: V2ProductRaw): number => {
  const sale = raw.salePrice ?? 0;
  if (sale > 0) return sale;
  if (typeof raw.finalPrice === 'number' && raw.finalPrice > 0) return raw.finalPrice;
  if (typeof raw.ourPrice === 'number' && raw.ourPrice > 0) return raw.ourPrice;
  if (typeof raw.basePrice === 'number' && raw.basePrice > 0) return raw.basePrice;
  return 0;
};

export const mapV2ToProduct = (
  raw: V2ProductRaw,
  category: ProductCategory,
  index: number,
  slug: string,
  mediaBase?: string
): MappedProduct | null => {
  const name = normalizeName(raw.name ?? '');
  if (!name) return null;

  const descriptionRaw = raw.description?.trim() ?? '';
  const description = stripHtml(descriptionRaw) || `${name} — ${category} collection.`;

  const price = resolveSalePrice(raw);
  if (price <= 0) return null;

  const images = collectImages(raw, mediaBase);
  if (images.length === 0) return null;

  const sizes = collectSizes(raw);
  const colors = collectColors(raw);
  const details = buildRandomProductDetails(raw, category, price);

  const tags = (raw.tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 20);

  const inStock =
    raw.isSoldOut !== true &&
    raw.isActive !== false &&
    raw.isPublished !== false &&
    details.stockQuantity > 0;

  return {
    name,
    slug,
    price,
    originalPrice: details.originalPrice,
    category,
    description,
    sizes: sizes.length > 0 ? sizes : ['Free Size'],
    colors: colors.length > 0 ? colors : ['Multi'],
    images,
    tags,
    inStock,
    featured: index < 4,
    isHot: details.isHot,
    fabricComposition: details.fabricComposition,
    garmentLength: details.garmentLength,
    packageContains: details.packageContains,
    washCare: details.washCare,
    neckline: details.neckline,
    sleeveLength: details.sleeveLength,
    fitting: details.fitting,
    weight: details.weight,
    dimensions: details.dimensions,
    stockQuantity: details.stockQuantity,
    deliveryStartDate: details.deliveryStartDate,
    deliveryEndDate: details.deliveryEndDate,
    breadcrumbCategory: details.breadcrumbCategory,
    metaTitle: name.slice(0, 70),
    metaDescription: description.slice(0, 160),
    metaKeywords: tags.slice(0, 12),
  };
};
