/** Nykaa Fashion category products API (PLP). */

export type NykaaSizeVariant = {
  sku?: string;
  id?: string;
  variant_id?: string;
  name?: string;
  in_stock?: string;
};

export type NykaaPlpImage = {
  id?: number;
  mediaType?: string;
  position?: string;
  url?: string;
  aspect_ratio?: string;
};

export type NykaaProductRaw = {
  id?: string;
  sku?: string;
  price?: number;
  discountedPrice?: number;
  discount?: number;
  type?: string;
  categoryId?: string[];
  imageUrl?: string;
  plp_pdp_bridge?: {
    images?: NykaaPlpImage[];
    siblings_colour?: unknown;
    variants?: {
      size?: NykaaSizeVariant[];
    };
  };
  title?: string;
  subTitle?: string;
  isOutOfStock?: number;
  sizeVariation?: { title?: string; id?: string }[];
  actionUrl?: string;
  aspectRatio?: number;
  tag?: string[];
};

export type NykaaProductsApiResponse = {
  status?: string;
  message?: string;
  response?: {
    title?: string;
    products?: NykaaProductRaw[];
  };
};

/** Product document shape for JSON export / MongoDB import (matches Product.model). */
export type ScrapedProductDocument = {
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  category: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  sizes: string[];
  colors: string[];
  images: string[];
  tags: string[];
  inStock: boolean;
  featured: boolean;
  isHot: boolean;
  isPublished: boolean;
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
  deliveryStartDate: string;
  deliveryEndDate: string;
  breadcrumbCategory: string;
  /** Source metadata (not stored in DB — stripped on import). */
  _source?: {
    nykaaId: string;
    sku?: string;
    categoryFilter: string;
    assignedPriceTier: number;
  };
};

export type ScrapeManifest = {
  scrapedAt: string;
  categoryFilter: string;
  categoryName: string;
  priceMin: number;
  priceMax: number;
  categoryId: string;
  /** @deprecated Legacy tier quotas; new scrapes use priceMode random. */
  quotas?: Record<string, number>;
  priceMode?: 'random' | 'tier';
  sort?: 'low-to-high' | 'high-to-low';
  totalProducts: number;
  pagesFetched: number;
  products: ScrapedProductDocument[];
};
