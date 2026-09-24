import type { ScrapedProductDocument, ScrapeManifest } from '../nykaa/types';

export type { ScrapedProductDocument, ScrapeManifest };

export type EmpressSortOrder = 'low-to-high' | 'high-to-low';

export type ShopifyVariant = {
  id?: number;
  title?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  price?: string;
  compare_at_price?: string | null;
  available?: boolean;
  sku?: string;
};

export type ShopifyImage = {
  id?: number;
  src?: string;
  position?: number;
};

export type EmpressProductRaw = {
  id?: number;
  title?: string;
  handle?: string;
  body_html?: string;
  tags?: string[];
  product_type?: string;
  vendor?: string;
  images?: ShopifyImage[];
  variants?: ShopifyVariant[];
};

export type ShopifyProductsResponse = {
  products?: EmpressProductRaw[];
};

export type EmpressScrapeSource = {
  empressId: string;
  handle?: string;
  collectionHandle: string;
  assignedPriceTier: number;
};

export type EmpressScrapedProductDocument = ScrapedProductDocument & {
  _source?: EmpressScrapeSource;
};

export type EmpressScrapeManifest = Omit<ScrapeManifest, 'products' | 'categoryId'> & {
  collectionHandle: string;
  collectionUrl: string;
  storeId: string;
  products: EmpressScrapedProductDocument[];
};
