import * as fs from 'fs';
import * as path from 'path';
import { ProductCategory } from '../types';

export type ParsedCategoryRow = {
  imageUrl: string;
  name: string;
};

const MEN_FILE = path.join(__dirname, 'men-data.txt');
const WOMEN_FILE = path.join(__dirname, 'women-data.txt');
const ACCESSORIES_FILE = path.join(__dirname, 'accessories-data.txt');

const isDataLine = (line: string): boolean => {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith('lazy src') || t.startsWith('img-fluid')) return false;
  return t.startsWith('http://') || t.startsWith('https://');
};

/** Tab-separated: image URL, product name, price (price ignored by importer). */
export const parseCategoryDataFile = (filePath: string): ParsedCategoryRow[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: ParsedCategoryRow[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!isDataLine(line)) continue;

    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const imageUrl = parts[0].trim();
    const name = parts[1].trim();
    if (!imageUrl || !name) continue;

    rows.push({ imageUrl, name });
  }

  return rows;
};

export const loadMenData = (): ParsedCategoryRow[] => parseCategoryDataFile(MEN_FILE);
export const loadWomenData = (): ParsedCategoryRow[] => parseCategoryDataFile(WOMEN_FILE);
export const loadAccessoriesData = (): ParsedCategoryRow[] =>
  parseCategoryDataFile(ACCESSORIES_FILE);

const COLOR_PHRASES = [
  'Sky Blue',
  'Navy Blue',
  'Teal Blue',
  'Rani Pink',
  'Rust Orange',
  'Off White',
  'Rama Blue',
  'Turquiose',
  'Wine',
  'Black',
  'White',
  'Pink',
  'Purple',
  'Cream',
  'Beige',
  'Yellow',
  'Olive',
  'Maroon',
  'Red',
  'Green',
  'Brown',
  'Grey',
  'Gray',
  'Ivory',
  'Burgundy',
  'Marsala',
  'Anthraa',
  'Navy',
  'Blue',
  'Golden',
  'Multi Color',
];

export const inferColorsFromName = (
  name: string,
  category: ProductCategory
): string[] => {
  const found: string[] = [];
  const upper = name;

  for (const phrase of COLOR_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(upper) && !found.some((c) => c.toLowerCase() === phrase.toLowerCase())) {
      found.push(phrase === 'Anthraa' ? 'Charcoal' : phrase);
    }
  }

  const defaults =
    category === 'Men'
      ? ['Black', 'Navy', 'White', 'Beige']
      : category === 'Women' || category === 'Lehenga' || category === 'Saree'
        ? ['Black', 'Ivory', 'Navy', 'Blush']
        : ['Black', 'Gold', 'Silver', 'Tan'];

  const merged = [...found, ...defaults];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of merged) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= 5) break;
  }
  return out;
};

export const sizesForCategory = (category: ProductCategory): string[] => {
  if (category === 'Men') return ['S', 'M', 'L', 'XL', 'XXL'];
  if (category === 'Women' || category === 'Lehenga' || category === 'Saree') {
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  }
  return ['One Size'];
};

export const randomPriceInr = (): number =>
  Math.floor(Math.random() * (1000 - 500 + 1)) + 500;

export const buildDescription = (name: string, category: ProductCategory): string => {
  const lead =
    category === 'Men'
      ? 'Premium menswear piece with a comfortable fit and quality finish.'
      : category === 'Lehenga'
        ? 'Elegant lehenga set crafted for celebrations with rich detailing and a flattering fit.'
        : category === 'Saree'
          ? 'Beautiful saree with quality drape and finish, ideal for festive and everyday occasions.'
          : category === 'Women'
            ? 'Stylish womenswear designed for everyday comfort and easy layering.'
            : 'Thoughtfully crafted accessory to complete your look with polish and ease.';
  const trimmed = name.length > 200 ? `${name.slice(0, 197)}...` : name;
  return `${trimmed} ${lead}`;
};

export const tagsFromName = (name: string, category: ProductCategory): string[] => {
  const lower = name.toLowerCase();
  const tags = new Set<string>([category.toLowerCase(), 'imported']);

  const keywords: Array<[RegExp, string]> = [
    [/kurta|sherwani|indo.?western|koti/i, 'ethnic'],
    [/cotton/i, 'cotton'],
    [/silk|satin|velvet|lachaka/i, 'premium-fabric'],
    [/t-?shirt|tee/i, 'tshirt'],
    [/polo/i, 'polo'],
    [/oversized|baggy|loose/i, 'oversized'],
    [/wedding/i, 'wedding'],
    [/embroider|sequence|beads|hand work/i, 'embellished'],
    [/combo|pack of/i, 'combo'],
    [/printed|graphic/i, 'printed'],
    [/tote|clutch|bag/i, 'bag'],
    [/party wear/i, 'party'],
    [/canvas/i, 'canvas'],
  ];

  for (const [re, tag] of keywords) {
    if (re.test(lower)) tags.add(tag);
  }

  return [...tags];
};
