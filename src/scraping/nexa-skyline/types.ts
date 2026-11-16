import type { ScrapedProductDocument, ScrapeManifest } from '../nykaa/types';

export type { ScrapedProductDocument, ScrapeManifest };

export type NexaSortOrder = 'low-to-high' | 'high-to-low';

export type NexaProductRaw = {
  uniqueId?: string;
  name?: string;
  summary?: string;
  price?: number;
  wasPrice?: number;
  bestPrice?: number;
  productCode?: string;
  productUrl?: string;
  productType?: string;
  color?: string[];
  childDetail?: string[];
  imageUrl?: string[];
  gallaryImages?: string[];
  inStock?: number;
  percentageDiscount?: number;
  tag?: string[];
};

export type UnbxdSearchResponse = {
  response?: {
    numberOfProducts?: number;
    start?: number;
    products?: NexaProductRaw[];
  };
  stats?: {
    price?: {
      min?: number;
      max?: number;
      count?: number;
    };
  };
};

export type NexaScrapeManifest = ScrapeManifest & {
  storeId: string;
  categorySlug: string;
  storeDomain: string;
};
