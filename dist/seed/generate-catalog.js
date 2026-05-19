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
/**
 * Generates BE/src/seed/products.catalog.json (25+ products per category).
 * Run: npx tsx src/seed/generate-catalog.ts
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const catalog_images_1 = require("./catalog-images");
const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const ONE_SIZE = ['One Size'];
const prices = [
    529, 549, 579, 599, 619, 649, 679, 699, 729, 749, 769, 799, 829, 849, 879, 899, 919,
    949, 969, 989, 512, 538, 564, 588, 998,
];
const desc = (name, material) => `${name} crafted from ${material}. Easy to style and built to last. Designed for everyday wear with a refined, modern silhouette.`;
const build = (rows, category, sizes, defaultColors, material) => rows.map((row, i) => ({
    name: row.name,
    price: prices[i % prices.length],
    category,
    description: desc(row.name, material),
    sizes: [...sizes],
    colors: [...defaultColors],
    images: (0, catalog_images_1.catalogImages)(row.name, category),
    tags: row.tags,
    inStock: true,
    featured: row.featured ?? i < 4,
}));
const menRows = [
    { name: 'Oversized Poplin Shirt', tags: ['shirt', 'cotton', 'essentials'] },
    { name: 'Heavyweight Cotton T-Shirt', tags: ['tee', 'basics', 'organic'] },
    { name: 'Slim Fit Denim Jacket', tags: ['denim', 'jacket', 'casual'] },
    { name: 'Merino Wool Crew Neck', tags: ['knitwear', 'wool', 'winter'] },
    { name: 'Tailored Chino Trousers', tags: ['trousers', 'tailoring', 'workwear'] },
    { name: 'Linen Summer Blazer', tags: ['blazer', 'linen', 'summer'] },
    { name: 'Classic Oxford Button-Down', tags: ['shirt', 'oxford', 'formal'] },
    { name: 'Performance Jogger Pants', tags: ['joggers', 'activewear', 'comfort'] },
    { name: 'Leather Bomber Jacket', tags: ['leather', 'jacket', 'outerwear'] },
    { name: 'Corduroy Carpenter Pants', tags: ['corduroy', 'pants', 'streetwear'] },
    { name: 'Henley Long Sleeve Tee', tags: ['tee', 'layering', 'casual'] },
    { name: 'Double-Breasted Suit Jacket', tags: ['suit', 'formal', 'tailoring'] },
    { name: 'Relaxed Fit Cargo Pants', tags: ['cargo', 'utility', 'casual'] },
    { name: 'Mock Neck Sweater', tags: ['sweater', 'knitwear', 'winter'] },
    { name: 'Stretch Denim Jeans', tags: ['denim', 'jeans', 'essentials'] },
    { name: 'Quilted Puffer Vest', tags: ['vest', 'winter', 'layering'] },
    { name: 'Camp Collar Short Sleeve Shirt', tags: ['shirt', 'summer', 'resort'] },
    { name: 'Pleated Dress Trousers', tags: ['trousers', 'formal', 'office'] },
    { name: 'Rugby Stripe Polo', tags: ['polo', 'preppy', 'casual'] },
    { name: 'Suede Trucker Jacket', tags: ['jacket', 'suede', 'heritage'] },
    { name: 'Tapered Athletic Shorts', tags: ['shorts', 'activewear', 'summer'] },
    { name: 'Flannel Check Shirt', tags: ['flannel', 'shirt', 'winter'] },
    { name: 'Wool Blend Overcoat', tags: ['coat', 'wool', 'winter'] },
    { name: 'Knit Polo Shirt', tags: ['polo', 'knitwear', 'smart-casual'] },
    { name: 'Utility Field Jacket', tags: ['jacket', 'utility', 'outdoor'] },
];
const womenRows = [
    { name: 'Classic Wool Overcoat', tags: ['coat', 'wool', 'winter'] },
    { name: 'Cashmere Turtleneck Sweater', tags: ['cashmere', 'knitwear', 'luxury'] },
    { name: 'Pleated Wide-Leg Trousers', tags: ['trousers', 'tailoring', 'office'] },
    { name: 'Silk Slip Dress', tags: ['dress', 'silk', 'evening'] },
    { name: 'Wrap Midi Skirt', tags: ['skirt', 'midi', 'elegant'] },
    { name: 'Cropped Tailored Blazer', tags: ['blazer', 'tailoring', 'workwear'] },
    { name: 'Ribbed Tank Top Set', tags: ['loungewear', 'basics', 'set'] },
    { name: 'High-Waist Mom Jeans', tags: ['denim', 'jeans', 'casual'] },
    { name: 'Satin Camisole', tags: ['top', 'satin', 'layering'] },
    { name: 'A-Line Denim Skirt', tags: ['skirt', 'denim', 'casual'] },
    { name: 'Cable Knit Cardigan', tags: ['cardigan', 'knitwear', 'cozy'] },
    { name: 'Linen Wide-Leg Pants', tags: ['linen', 'trousers', 'summer'] },
    { name: 'Off-Shoulder Blouse', tags: ['blouse', 'evening', 'feminine'] },
    { name: 'Tailored Vest Top', tags: ['vest', 'tailoring', 'layering'] },
    { name: 'Jersey Maxi Dress', tags: ['dress', 'maxi', 'comfort'] },
    { name: 'Faux Leather Midi Skirt', tags: ['skirt', 'leather', 'edgy'] },
    { name: 'Cropped Fleece Hoodie', tags: ['hoodie', 'casual', 'streetwear'] },
    { name: 'Belted Trench Coat', tags: ['trench', 'coat', 'classic'] },
    { name: 'Ruffle Hem Mini Skirt', tags: ['skirt', 'mini', 'party'] },
    { name: 'Seamless Sports Bra', tags: ['activewear', 'gym', 'basics'] },
    { name: 'Palazzo Jumpsuit', tags: ['jumpsuit', 'evening', 'one-piece'] },
    { name: 'Puff Sleeve Blouse', tags: ['blouse', 'romantic', 'office'] },
    { name: 'Stretch Skinny Jeans', tags: ['denim', 'jeans', 'essentials'] },
    { name: 'Wool Blend Peacoat', tags: ['coat', 'wool', 'heritage'] },
    { name: 'Lounge Co-ord Set', tags: ['loungewear', 'set', 'comfort'] },
];
const accessoriesRows = [
    { name: 'Structured Leather Tote', tags: ['bag', 'leather', 'everyday'] },
    { name: 'Chunky Ribbed Beanie', tags: ['beanie', 'wool', 'winter'] },
    { name: 'Minimalist Leather Belt', tags: ['belt', 'leather', 'essentials'] },
    { name: 'Aviator Sunglasses', tags: ['sunglasses', 'eyewear', 'summer'] },
    { name: 'Stainless Steel Watch', tags: ['watch', 'jewelry', 'classic'] },
    { name: 'Canvas Crossbody Bag', tags: ['bag', 'canvas', 'travel'] },
    { name: 'Cashmere Scarf', tags: ['scarf', 'cashmere', 'winter'] },
    { name: 'Leather Card Holder', tags: ['wallet', 'leather', 'travel'] },
    { name: 'Wool Fedora Hat', tags: ['hat', 'wool', 'heritage'] },
    { name: 'Chain Link Necklace', tags: ['jewelry', 'necklace', 'gold-tone'] },
    { name: 'Classic Leather Wallet', tags: ['wallet', 'leather', 'gift'] },
    { name: 'Insulated Steel Bottle', tags: ['bottle', 'outdoor', 'essentials'] },
    { name: 'Silk Square Scarf', tags: ['scarf', 'silk', 'accessory'] },
    { name: 'Gold Hoop Earrings Set', tags: ['jewelry', 'earrings', 'gift'] },
    { name: 'Laptop Backpack', tags: ['backpack', 'work', 'travel'] },
    { name: 'Vintage Round Sunglasses', tags: ['sunglasses', 'vintage', 'eyewear'] },
    { name: 'Braided Leather Bracelet', tags: ['bracelet', 'leather', 'casual'] },
    { name: 'Cotton Snapback Cap', tags: ['cap', 'streetwear', 'summer'] },
    { name: 'Weekender Duffel Bag', tags: ['bag', 'travel', 'weekend'], featured: false },
    { name: 'Pearl Drop Earrings', tags: ['jewelry', 'pearls', 'evening'] },
    { name: 'Merino Wool Gloves', tags: ['gloves', 'wool', 'winter'] },
    { name: 'RFID Passport Holder', tags: ['travel', 'leather', 'organizer'] },
    { name: 'Polarized Wayfarer Shades', tags: ['sunglasses', 'polarized', 'summer'] },
    { name: 'Stackable Ring Set', tags: ['jewelry', 'rings', 'minimal'] },
    { name: 'Ceramic Travel Tumbler', tags: ['tumbler', 'drinkware', 'gift'] },
];
const menColors = ['Black', 'Navy', 'White', 'Grey', 'Olive'];
const womenColors = ['Black', 'Ivory', 'Navy', 'Blush', 'Sage'];
const accColors = ['Black', 'Tan', 'Silver', 'Gold'];
const catalog = [
    ...build(menRows, 'Men', MEN_SIZES, menColors, 'premium cotton and wool blends'),
    ...build(womenRows, 'Women', APPAREL_SIZES, womenColors, 'fine natural fibers and soft-touch fabrics'),
    ...build(accessoriesRows, 'Accessories', ONE_SIZE, accColors, 'quality materials and thoughtful craftsmanship'),
];
const main = async () => {
    const failures = [];
    for (const product of catalog) {
        for (const url of product.images) {
            const ok = await (0, catalog_images_1.validateImageUrl)(url);
            if (!ok)
                failures.push(`${product.name}: ${url}`);
        }
    }
    if (failures.length > 0) {
        console.error('Image validation failed:\n', failures.join('\n'));
        process.exit(1);
    }
    const outPath = path.join(__dirname, 'products.catalog.json');
    fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2), 'utf-8');
    const counts = catalog.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + 1;
        return acc;
    }, {});
    console.log(`Wrote ${catalog.length} products to ${outPath}`);
    console.log('Per category:', counts);
    console.log('All image URLs validated (HTTP 200, image/*).');
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
