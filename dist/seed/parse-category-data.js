"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagsFromName = exports.buildDescription = exports.randomPriceInr = exports.sizesForCategory = exports.inferColorsFromName = exports.loadAccessoriesData = exports.loadWomenData = exports.loadMenData = exports.parseCategoryDataFile = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const MEN_FILE = path.join(__dirname, 'men-data.txt');
const WOMEN_FILE = path.join(__dirname, 'women-data.txt');
const ACCESSORIES_FILE = path.join(__dirname, 'accessories-data.txt');
const isDataLine = (line) => {
    const t = line.trim();
    if (!t)
        return false;
    if (t.startsWith('lazy src') || t.startsWith('img-fluid'))
        return false;
    return t.startsWith('http://') || t.startsWith('https://');
};
/** Tab-separated: image URL, product name, price (price ignored by importer). */
const parseCategoryDataFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = [];
    for (const line of content.split(/\r?\n/)) {
        if (!isDataLine(line))
            continue;
        const parts = line.split('\t');
        if (parts.length < 2)
            continue;
        const imageUrl = parts[0].trim();
        const name = parts[1].trim();
        if (!imageUrl || !name)
            continue;
        rows.push({ imageUrl, name });
    }
    return rows;
};
exports.parseCategoryDataFile = parseCategoryDataFile;
const loadMenData = () => (0, exports.parseCategoryDataFile)(MEN_FILE);
exports.loadMenData = loadMenData;
const loadWomenData = () => (0, exports.parseCategoryDataFile)(WOMEN_FILE);
exports.loadWomenData = loadWomenData;
const loadAccessoriesData = () => (0, exports.parseCategoryDataFile)(ACCESSORIES_FILE);
exports.loadAccessoriesData = loadAccessoriesData;
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
const inferColorsFromName = (name, category) => {
    const found = [];
    const upper = name;
    for (const phrase of COLOR_PHRASES) {
        const re = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (re.test(upper) && !found.some((c) => c.toLowerCase() === phrase.toLowerCase())) {
            found.push(phrase === 'Anthraa' ? 'Charcoal' : phrase);
        }
    }
    const defaults = category === 'Men'
        ? ['Black', 'Navy', 'White', 'Beige']
        : category === 'Women' || category === 'Lehenga' || category === 'Saree'
            ? ['Black', 'Ivory', 'Navy', 'Blush']
            : ['Black', 'Gold', 'Silver', 'Tan'];
    const merged = [...found, ...defaults];
    const seen = new Set();
    const out = [];
    for (const c of merged) {
        const key = c.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(c);
        if (out.length >= 5)
            break;
    }
    return out;
};
exports.inferColorsFromName = inferColorsFromName;
const sizesForCategory = (category) => {
    if (category === 'Men')
        return ['S', 'M', 'L', 'XL', 'XXL'];
    if (category === 'Women' || category === 'Lehenga' || category === 'Saree') {
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    }
    return ['One Size'];
};
exports.sizesForCategory = sizesForCategory;
const randomPriceInr = () => Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
exports.randomPriceInr = randomPriceInr;
const buildDescription = (name, category) => {
    const lead = category === 'Men'
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
exports.buildDescription = buildDescription;
const tagsFromName = (name, category) => {
    const lower = name.toLowerCase();
    const tags = new Set([category.toLowerCase(), 'imported']);
    const keywords = [
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
        if (re.test(lower))
            tags.add(tag);
    }
    return [...tags];
};
exports.tagsFromName = tagsFromName;
