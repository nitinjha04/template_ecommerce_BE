import { slugify } from '../../utils/slug';
import { buildRandomProductDetails } from '../../seed/v2/random-product-details';
import type { V2ProductRaw } from '../../seed/v2/map-v2-product';
import { getProductListPriceUsd } from './api-client';
import { sanitizeScrapedProduct } from './sanitize-brand';
import type { EmpressProductRaw, EmpressScrapedProductDocument } from './types';

const COLOR_WORDS = [
  'Black',
  'White',
  'Red',
  'Blue',
  'Green',
  'Pink',
  'Purple',
  'Yellow',
  'Orange',
  'Brown',
  'Beige',
  'Cream',
  'Gold',
  'Golden',
  'Silver',
  'Maroon',
  'Navy',
  'Teal',
  'Peach',
  'Mint',
  'Lavender',
  'Mustard',
  'Olive',
  'Violet',
  'Salmon',
  'Rani',
  'Rama',
  'Sea',
  'Sky',
  'Baby',
  'Blush',
  'Lime',
  'Pastel',
  'Off',
  'Light',
  'Dark',
  'Multicolor',
];

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeImageUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const withProtocol = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  try {
    const parsed = new URL(withProtocol);
    parsed.searchParams.delete('width');
    return parsed.toString();
  } catch {
    return withProtocol.split('?')[0] ?? withProtocol;
  }
};

export const collectEmpressImages = (raw: EmpressProductRaw): string[] => {
  const urls: string[] = [];
  const seen = new Set<string>();

  const sorted = [...(raw.images ?? [])].sort(
    (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)
  );

  for (const img of sorted) {
    const clean = normalizeImageUrl(img.src ?? '');
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    urls.push(clean);
  }

  return urls.slice(0, 8);
};

export const collectEmpressSizes = (raw: EmpressProductRaw): string[] => {
  const sizes = new Set<string>();

  for (const variant of raw.variants ?? []) {
    for (const opt of [variant.option1, variant.option2, variant.option3]) {
      const value = opt?.trim();
      if (!value || /^default title$/i.test(value)) continue;
      if (/^\d|xs|s|m|l|xl|xxl|free/i.test(value)) {
        sizes.add(value);
      }
    }
  }

  if (sizes.size > 0) return [...sizes];

  return ['Free Size', 'S', 'M', 'L', 'XL'];
};

export const extractColorFromTitle = (title: string): string => {
  const words = title.trim().split(/\s+/);
  if (words.length === 0) return 'Multi';

  const twoWord = `${words[0]} ${words[1] ?? ''}`.trim();
  for (const color of COLOR_WORDS) {
    if (twoWord.toLowerCase().startsWith(color.toLowerCase())) {
      return twoWord.split(' ').length >= 2 && color === words[0] ? twoWord : words[0];
    }
    if (words[0].toLowerCase() === color.toLowerCase()) return words[0];
  }

  return words[0];
};

export const buildEmpressSlug = (raw: EmpressProductRaw): string => {
  const handle = raw.handle?.trim();
  if (handle) return slugify(handle);
  const title = raw.title?.trim() ?? 'product';
  const id = String(raw.id ?? '');
  const base = slugify(title);
  return id ? `${base}-${id}` : base;
};

const toV2Shim = (
  raw: EmpressProductRaw,
  assignedPrice: number
): V2ProductRaw => {
  const usd = getProductListPriceUsd(raw);
  const baseInr = usd > 0 ? Math.round(usd * 95) : assignedPrice * 1.2;

  const anyAvailable = (raw.variants ?? []).some((v) => v.available !== false);

  return {
    name: raw.title ?? '',
    description: raw.body_html ? stripHtml(raw.body_html).slice(0, 500) : undefined,
    basePrice: baseInr > assignedPrice ? baseInr : assignedPrice + 200,
    salePrice: assignedPrice,
    finalPrice: assignedPrice,
    tags: raw.tags,
    availableSizes: collectEmpressSizes(raw),
    totalStock: anyAvailable ? undefined : 0,
    isSoldOut: !anyAvailable,
  };
};

export const mapEmpressToProductDocument = (
  raw: EmpressProductRaw,
  options: {
    categoryName: string;
    collectionHandle: string;
    assignedPrice: number;
    index: number;
  }
): EmpressScrapedProductDocument | null => {
  const name = raw.title?.trim();
  if (!name) return null;

  const images = collectEmpressImages(raw);
  if (images.length === 0) return null;

  const assignedPrice = options.assignedPrice;
  const v2 = toV2Shim(raw, assignedPrice);
  const details = buildRandomProductDetails(v2, options.categoryName, assignedPrice);

  const color = extractColorFromTitle(name);
  const sizes = collectEmpressSizes(raw);

  const plainBody = raw.body_html ? stripHtml(raw.body_html) : '';
  const description = (
    plainBody ||
    `${name}. Premium ${options.categoryName} from our curated ethnic collection.`
  ).slice(0, 2000);

  const tags = (raw.tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 20);

  const slug = buildEmpressSlug(raw);
  const inStock = v2.isSoldOut !== true && details.stockQuantity > 0;

  const doc: EmpressScrapedProductDocument = {
    name: name.length > 180 ? `${name.slice(0, 177).trim()}...` : name,
    slug,
    price: assignedPrice,
    originalPrice: details.originalPrice,
    category: options.categoryName,
    description,
    metaTitle: name.slice(0, 70),
    metaDescription: description.slice(0, 160),
    metaKeywords: tags.length > 0 ? tags : [options.categoryName, 'women', 'ethnic'],
    sizes,
    colors: [color],
    images,
    tags: tags.length > 0 ? tags : [options.categoryName, 'ethnic wear'],
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
      empressId: String(raw.id ?? ''),
      handle: raw.handle,
      collectionHandle: options.collectionHandle,
      assignedPriceTier: assignedPrice,
    },
  };

  return sanitizeScrapedProduct(doc);
};
