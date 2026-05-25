"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRandomProductDetails = void 0;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
};
const WOMEN_FABRICS = [
    '100% cotton',
    'Cotton silk blend',
    'Pure georgette',
    'Chiffon with lining',
    'Rayon blend',
    'Silk blend',
    'Cotton linen mix',
    'Viscose crepe',
];
const MEN_FABRICS = [
    '100% cotton',
    'Cotton linen blend',
    'Premium polyester blend',
    'Pure cotton poplin',
    'Stretch cotton',
    'Lightweight linen',
];
const LENGTHS = ['Short', 'Medium', 'Long', 'Knee length', 'Ankle length', 'Full length'];
const WOMEN_PACKAGE = [
    '1 Kurti',
    '1 Saree with blouse piece',
    '1 Kurta set',
    '1 Dupatta',
    '1 Ethnic top',
    '1 Palazzo set',
    '1 Cord set',
];
const MEN_PACKAGE = [
    '1 Shirt',
    '1 T-shirt',
    '1 Kurta',
    '1 Jacket',
    '1 Trouser',
    '1 Co-ord set',
];
const WASH_CARE = [
    'Machine wash cold',
    'Hand wash separately',
    'Dry clean recommended',
    'Machine wash gentle cycle',
    'Do not bleach; line dry',
];
const NECKLINES_WOMEN = [
    'Round',
    'V-neck',
    'Boat neck',
    'Square neck',
    'Sweetheart',
    'Mandarin collar',
    'Keyhole neck',
];
const NECKLINES_MEN = [
    'Round',
    'Collared',
    'Mandarin collar',
    'V-neck',
    'Henley',
    'Band collar',
];
const SLEEVES = [
    'Sleeveless',
    'Short sleeve',
    'Three-quarter sleeve',
    'Full sleeve',
    'Cap sleeve',
];
const FITTINGS = [
    'Regular fit',
    'Relaxed fit',
    'Slim fit',
    'Comfort fit',
    'A-line fit',
    'Straight fit',
];
const BREADCRUMBS = ['New Arrivals', 'Flash Sale', 'Best Sellers', 'Ethnic Wear', 'Festive Edit'];
const randomWeight = () => {
    const kg = (randomInt(25, 85) / 100).toFixed(1);
    return `${kg} kg`;
};
const randomDimensions = () => {
    const l = randomInt(8, 14);
    const w = randomInt(10, 16);
    const h = randomInt(2, 8);
    return `${l} x ${w} x ${h} cm`;
};
const resolveOriginalPrice = (raw, salePrice) => {
    const base = raw.basePrice ?? 0;
    if (base > salePrice)
        return Math.round(base);
    const markup = randomInt(15, 85) / 100;
    const original = Math.round(salePrice * (1.2 + markup));
    return Math.min(original, salePrice + 500);
};
const buildRandomProductDetails = (raw, category, salePrice) => {
    const isWomen = category === 'Women';
    const fabrics = isWomen ? WOMEN_FABRICS : MEN_FABRICS;
    const packages = isWomen ? WOMEN_PACKAGE : MEN_PACKAGE;
    const necklines = isWomen ? NECKLINES_WOMEN : NECKLINES_MEN;
    const stockFromRaw = typeof raw.totalStock === 'number' && raw.totalStock > 0
        ? raw.totalStock
        : randomInt(12, 120);
    const deliveryStartDays = randomInt(3, 8);
    const deliveryEndDays = deliveryStartDays + randomInt(4, 9);
    return {
        originalPrice: resolveOriginalPrice(raw, salePrice),
        isHot: Math.random() < 0.18,
        fabricComposition: pick(fabrics),
        garmentLength: pick(LENGTHS),
        packageContains: pick(packages),
        washCare: pick(WASH_CARE),
        neckline: pick(necklines),
        sleeveLength: pick(SLEEVES),
        fitting: pick(FITTINGS),
        weight: randomWeight(),
        dimensions: randomDimensions(),
        stockQuantity: stockFromRaw,
        deliveryStartDate: addDays(deliveryStartDays),
        deliveryEndDate: addDays(deliveryEndDays),
        breadcrumbCategory: Math.random() < 0.35 ? pick(BREADCRUMBS) : category,
    };
};
exports.buildRandomProductDetails = buildRandomProductDetails;
