import { slugify } from '../../utils/slug';
import { buildRandomProductDetails } from '../../seed/v2/random-product-details';
import type { V2ProductRaw } from '../../seed/v2/map-v2-product';
import { sanitizeScrapedProduct } from './sanitize-brand';
import type { NykaaProductRaw, ScrapedProductDocument } from './types';

const stripQuery = (url: string): string => url.split('?')[0] ?? url;

export const collectNykaaImages = (raw: NykaaProductRaw): string[] => {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (url?: string) => {
    if (!url) return;
    const clean = stripQuery(url.trim());
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    urls.push(clean);
  };

  const bridgeImages = raw.plp_pdp_bridge?.images ?? [];
  const sorted = [...bridgeImages].sort(
    (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)
  );
  for (const img of sorted) add(img.url);
  add(raw.imageUrl);

  return urls;
};

export const collectNykaaSizes = (raw: NykaaProductRaw): string[] => {
  const fromBridge = (raw.plp_pdp_bridge?.variants?.size ?? [])
    .map((s) => s.name?.trim())
    .filter((s): s is string => Boolean(s));

  if (fromBridge.length > 0) return [...new Set(fromBridge)];

  const fromVariation = (raw.sizeVariation ?? [])
    .map((s) => s.title?.trim())
    .filter((s): s is string => Boolean(s));

  return [...new Set(fromVariation)];
};

export const buildNykaaProductName = (raw: NykaaProductRaw): string => {
  const brand = (raw.title ?? '').trim();
  const subtitle = (raw.subTitle ?? '').trim();
  if (brand && subtitle) return `${brand} — ${subtitle}`;
  return subtitle || brand || '';
};

export const buildNykaaSlug = (raw: NykaaProductRaw, categoryName: string): string => {
  const url = raw.actionUrl?.trim();
  if (url) {
    const slugPath = url.replace(/\/p\/\d+\/?$/i, '').replace(/^\/+/, '');
    if (slugPath && !/^\d+$/.test(slugPath)) {
      return slugify(slugPath);
    }
  }
  const base = slugify(buildNykaaProductName(raw) || categoryName);
  const id = raw.id?.trim() ?? raw.sku?.trim() ?? '';
  return id ? `${base}-${id}` : base;
};

const toV2Shim = (raw: NykaaProductRaw, assignedPrice: number): V2ProductRaw => ({
  name: buildNykaaProductName(raw),
  description: raw.subTitle,
  basePrice: raw.price,
  salePrice: assignedPrice,
  finalPrice: assignedPrice,
  tags: raw.tag,
  availableSizes: collectNykaaSizes(raw),
  totalStock: raw.isOutOfStock === 1 ? 0 : undefined,
  isSoldOut: raw.isOutOfStock === 1,
});

export const mapNykaaToProductDocument = (
  raw: NykaaProductRaw,
  options: {
    categoryName: string;
    categoryFilter: string;
    assignedPrice: number;
    index: number;
  }
): ScrapedProductDocument | null => {
  const name = buildNykaaProductName(raw);
  if (!name) return null;

  const images = collectNykaaImages(raw);
  if (images.length === 0) return null;

  const assignedPrice = options.assignedPrice;
  const v2 = toV2Shim(raw, assignedPrice);
  const details = buildRandomProductDetails(v2, options.categoryName, assignedPrice);

  const mrp = typeof raw.price === 'number' && raw.price > assignedPrice ? raw.price : details.originalPrice;

  const sizes = collectNykaaSizes(raw);
  const description =
    `${raw.subTitle?.trim() ?? name}. Premium ${options.categoryName} from our curated collection.`.slice(
      0,
      2000
    );

  const tags = (raw.tag ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 20);

  const slug = buildNykaaSlug(raw, options.categoryName);
  const inStock = raw.isOutOfStock !== 1 && details.stockQuantity > 0;

  const doc: ScrapedProductDocument = {
    name: name.length > 180 ? `${name.slice(0, 177).trim()}...` : name,
    slug,
    price: assignedPrice,
    originalPrice: Math.round(mrp),
    category: options.categoryName,
    description,
    metaTitle: name.slice(0, 70),
    metaDescription: description.slice(0, 160),
    metaKeywords: tags.length > 0 ? tags : [options.categoryName, 'women', 'fashion'],
    sizes: sizes.length > 0 ? sizes : ['Free Size'],
    colors: ['Multi'],
    images,
    tags: tags.length > 0 ? tags : [options.categoryName],
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
      nykaaId: raw.id ?? '',
      sku: raw.sku,
      categoryFilter: options.categoryFilter,
      assignedPriceTier: assignedPrice,
    },
  };

  return sanitizeScrapedProduct(doc);
};
