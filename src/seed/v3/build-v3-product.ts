import { ProductCategory } from '../../types';
import {
  buildDescription,
  inferColorsFromName,
  randomPriceInr,
  sizesForCategory,
  tagsFromName,
} from '../parse-category-data';
import { buildRandomProductDetails } from '../v2/random-product-details';
import type { V2ProductRaw } from '../v2/map-v2-product';
import type { V3ParsedRow } from './parse-v3-data';

const EMPTY_V2: V2ProductRaw = {};

export type V3ProductPayload = {
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
  deliveryStartDate: Date;
  deliveryEndDate: Date;
  breadcrumbCategory: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
};

const normalizeName = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
};

const categoryForSizes = (category: ProductCategory): ProductCategory => {
  if (category === 'Lehenga' || category === 'Saree') return 'Women';
  return category;
};

export const buildV3Product = (
  row: V3ParsedRow,
  category: ProductCategory,
  index: number,
  slug: string
): V3ProductPayload => {
  const name = normalizeName(row.name);
  const price = randomPriceInr();
  const details = buildRandomProductDetails(EMPTY_V2, categoryForSizes(category), price);

  const baseTags = tagsFromName(name, categoryForSizes(category));
  const tags = new Set<string>(baseTags);
  tags.add(category.toLowerCase());
  if (row.tag) tags.add(row.tag.toLowerCase().replace(/\s+/g, '-'));
  if (category === 'Lehenga') tags.add('lehenga');
  if (category === 'Saree') tags.add('saree');
  if (category === 'Men') tags.add('mens-wedding');

  const tagList = [...tags].slice(0, 20);

  const description = buildDescription(name, categoryForSizes(category));

  return {
    name,
    slug,
    price,
    originalPrice: details.originalPrice,
    category,
    description,
    sizes: sizesForCategory(categoryForSizes(category)),
    colors: inferColorsFromName(name, categoryForSizes(category)),
    images: row.images,
    tags: tagList,
    inStock: true,
    featured: index < 4,
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
    deliveryStartDate: details.deliveryStartDate,
    deliveryEndDate: details.deliveryEndDate,
    breadcrumbCategory: category,
    metaTitle: name.slice(0, 70),
    metaDescription: description.slice(0, 160),
    metaKeywords: tagList.slice(0, 12),
  };
};
