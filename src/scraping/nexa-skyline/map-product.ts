import { slugify } from '../../utils/slug';
import { buildRandomProductDetails } from '../../seed/v2/random-product-details';
import type { V2ProductRaw } from '../../seed/v2/map-v2-product';
import { imageDedupeKey } from '../argen-style/image-utils';
import { sanitizeScrapedProduct } from './sanitize-brand';
import type { NexaProductRaw, ScrapedProductDocument } from './types';

const normalizeImageUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return (trimmed.startsWith('//') ? `https:${trimmed}` : trimmed).split('?')[0];
};

export const collectNexaImages = (raw: NexaProductRaw): string[] => {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (url?: string) => {
    if (!url) return;
    const clean = normalizeImageUrl(url);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    urls.push(clean);
  };

  for (const img of raw.gallaryImages ?? []) add(img);
  for (const img of raw.imageUrl ?? []) add(img);

  return urls.slice(0, 8);
};

export const collectNexaSizes = (raw: NexaProductRaw): string[] => {
  const sizes = new Set<string>();

  for (const row of raw.childDetail ?? []) {
    const parts = String(row).split('#');
    const size = parts[1]?.trim();
    if (size) sizes.add(size);
  }

  if (sizes.size > 0) return [...sizes];
  return ['Free Size', 'S', 'M', 'L', 'XL'];
};

export const collectNexaColors = (raw: NexaProductRaw): string[] => {
  const colors = (raw.color ?? [])
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1));

  return colors.length > 0 ? [...new Set(colors)] : ['Multi'];
};

export const buildNexaSlug = (raw: NexaProductRaw): string => {
  const url = raw.productUrl?.trim();
  if (url) {
    const match = url.match(/\/p\/([^/?#]+)/i);
    if (match?.[1]) return slugify(match[1]);
  }
  const base = slugify(raw.name ?? 'product');
  const id = raw.uniqueId?.trim() ?? '';
  return id ? `${base}-${slugify(id)}` : base;
};

const toV2Shim = (raw: NexaProductRaw, assignedPrice: number): V2ProductRaw => {
  const listPrice = typeof raw.price === 'number' ? raw.price : assignedPrice;
  const was = typeof raw.wasPrice === 'number' ? raw.wasPrice : listPrice;

  return {
    name: raw.name ?? '',
    description: raw.summary,
    basePrice: was > assignedPrice ? was : assignedPrice + 150,
    salePrice: assignedPrice,
    finalPrice: assignedPrice,
    availableSizes: collectNexaSizes(raw),
    totalStock: raw.inStock === 0 ? 0 : undefined,
    isSoldOut: raw.inStock === 0,
  };
};

export const mapNexaToProductDocument = (
  raw: NexaProductRaw,
  options: {
    categoryName: string;
    categorySlug: string;
    assignedPrice: number;
    index: number;
  }
): ScrapedProductDocument | null => {
  const name = raw.name?.trim();
  if (!name) return null;

  const images = collectNexaImages(raw);
  if (images.length === 0) return null;

  const assignedPrice = options.assignedPrice;
  const v2 = toV2Shim(raw, assignedPrice);
  const details = buildRandomProductDetails(v2, options.categoryName, assignedPrice);

  const listPrice = typeof raw.price === 'number' ? raw.price : assignedPrice;
  const originalPrice =
    listPrice > assignedPrice ? Math.round(listPrice) : details.originalPrice;

  const description = (
    raw.summary?.trim() ||
    `${name}. Premium ${options.categoryName} from our curated ethnic collection.`
  ).slice(0, 2000);

  const slug = buildNexaSlug(raw);
  const inStock = raw.inStock !== 0 && details.stockQuantity > 0;

  const doc: ScrapedProductDocument = {
    name: name.length > 180 ? `${name.slice(0, 177).trim()}...` : name,
    slug,
    price: assignedPrice,
    originalPrice,
    category: options.categoryName,
    description,
    metaTitle: name.slice(0, 70),
    metaDescription: description.slice(0, 160),
    metaKeywords: [options.categoryName, 'women', 'ethnic wear'],
    sizes: collectNexaSizes(raw),
    colors: collectNexaColors(raw),
    images,
    tags: [options.categoryName, 'ethnic wear', 'women'],
    inStock,
    featured: options.index < 4,
    isHot: details.isHot,
    isPublished: true,
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
    deliveryStartDate: details.deliveryStartDate.toISOString(),
    deliveryEndDate: details.deliveryEndDate.toISOString(),
    breadcrumbCategory: details.breadcrumbCategory,
    _source: {
      nykaaId: raw.uniqueId ?? '',
      sku: raw.productCode,
      categoryFilter: options.categorySlug,
      assignedPriceTier: assignedPrice,
    },
  };

  return sanitizeScrapedProduct(doc);
};

export const productImageKeys = (raw: NexaProductRaw): string[] =>
  collectNexaImages(raw).map((url) => imageDedupeKey(url));
