import { ProductCategory } from '../types';
import catalog from './products.catalog.json';

export type SeedProduct = {
  name: string;
  price: number;
  category: ProductCategory;
  description: string;
  sizes: string[];
  colors: string[];
  images: string[];
  tags: string[];
  inStock: boolean;
  featured: boolean;
};

/** 75 curated products (25 Men, 25 Women, 25 Accessories) — see products.catalog.json */
export const seedProducts: SeedProduct[] = catalog as SeedProduct[];
