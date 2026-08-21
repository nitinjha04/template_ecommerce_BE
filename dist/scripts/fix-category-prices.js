"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fix unrealistic low prices by product category (primary: protico store).
 *
 * Full outfits (suit set, kurta set, dresses, lehengas, etc.) cannot sell below
 * a category floor (typically ₹600–₹700). Lightweight / accessory categories
 * (dupatta, blouse, top) may stay cheaper.
 *
 * Also rewrites originalPrice so the list vs sale gap is at most 20% off.
 *
 * Usage:
 *   npm run fix:category-prices:dry
 *   npm run fix:category-prices
 *   npm run fix:category-prices -- --store-domain protico.vercel.app
 *   npm run fix:category-prices -- --store-domain protico.in
 */
const mongoose_1 = require("mongoose");
const db_1 = require("../config/db");
const models_1 = require("../models");
const Store_model_1 = require("../models/Store.model");
const MAX_DISCOUNT_RATIO = 0.2;
/**
 * Ordered most-specific first. First match wins.
 * Floors reflect realistic ethnic / western clothing pricing.
 */
const CATEGORY_TIERS = [
    // Full ceremonial / multi-piece
    { match: /\blehenga\b/i, minPrice: 900, maxPrice: 3999 },
    // "suit set" only — do not match "night suit"
    { match: /\bsuit\s*set\b|\bsalwar\s*suit/i, minPrice: 700, maxPrice: 2499 },
    { match: /\bsharara\b/i, minPrice: 700, maxPrice: 2499 },
    { match: /\bkurta\s*set\b|\bkurtas?\s*and\s*kurtis\b/i, minPrice: 650, maxPrice: 1999 },
    { match: /\bpre\s*draped\s*saree\b/i, minPrice: 700, maxPrice: 2999 },
    { match: /\bsaree\b|\bsarees\b/i, minPrice: 600, maxPrice: 2999 },
    { match: /\bcoord\b|\bco-?ord\b/i, minPrice: 600, maxPrice: 1999 },
    { match: /\bnight\s*suit\b|\bloungewear\b|\bsleepwear\b/i, minPrice: 500, maxPrice: 1499 },
    { match: /\bdress(es)?\b|\bjumpsuit/i, minPrice: 600, maxPrice: 1999 },
    // Separates — still not ₹100 when structured, but can be under 600
    { match: /\bpants?\b|\btrousers?\b|\bjeans?\b|\bjeggings?\b|\bpalazzo/i, minPrice: 350, maxPrice: 999 },
    { match: /\bskirt\b|\bshorts?\b|\bcapris?\b|\bleggings?\b|\bchuridar/i, minPrice: 250, maxPrice: 799 },
    { match: /\bshirt\b|\btop(s)?\b|\bkurtis?\b|\bkurtas?\b/i, minPrice: 300, maxPrice: 999 },
    { match: /\bblouse\b/i, minPrice: 250, maxPrice: 799 },
    { match: /\bwinterwear\b|\bjacket\b|\bblazer\b/i, minPrice: 600, maxPrice: 2999 },
    { match: /\bsportswear\b/i, minPrice: 400, maxPrice: 1499 },
    // Accessories — can legitimately be ~₹100–₹300
    { match: /\bdupatta/i, minPrice: 100, maxPrice: 499 },
    { match: /\baccessories?\b|\bscar(f|ves)\b/i, minPrice: 100, maxPrice: 599 },
];
/** Fallback for unmatched clothing: floor ₹400 */
const DEFAULT_TIER = { match: /.*/, minPrice: 400, maxPrice: 1999 };
const parseArgs = () => {
    const argv = process.argv.slice(2);
    const get = (flag) => {
        const i = argv.indexOf(flag);
        if (i === -1)
            return undefined;
        return argv[i + 1]?.trim();
    };
    return {
        dryRun: argv.includes('--dry-run'),
        storeId: get('--store-id'),
        storeDomain: get('--store-domain'),
        /** Re-price every product into its tier band (not only under-floor) */
        forceAll: argv.includes('--force-all'),
    };
};
const resolveTier = (category) => {
    const cat = (category ?? '').trim();
    for (const tier of CATEGORY_TIERS) {
        if (tier.match.test(cat))
            return tier;
    }
    return DEFAULT_TIER;
};
const randomInt = (min, max) => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
};
/** originalPrice so discount ≤ 20% of original (sale stays competitive). */
const originalForSalePrice = (salePrice) => {
    if (!Number.isFinite(salePrice) || salePrice <= 0)
        return 0;
    const maxOriginal = Math.floor(salePrice / (1 - MAX_DISCOUNT_RATIO));
    // Random 5–20% off list for a natural look
    const minOriginal = Math.max(salePrice, Math.ceil(salePrice / 0.95));
    const original = randomInt(minOriginal, Math.max(minOriginal, maxOriginal));
    return Math.max(salePrice, original);
};
const resolveStoreFilter = async (args) => {
    if (args.storeId) {
        if (!mongoose_1.Types.ObjectId.isValid(args.storeId)) {
            throw new Error(`Invalid --store-id: ${args.storeId}`);
        }
        return { filter: { store: new mongoose_1.Types.ObjectId(args.storeId) }, label: args.storeId };
    }
    const domainOrSlug = args.storeDomain?.trim() ||
        // Default target: protico storefront
        'protico';
    const store = await Store_model_1.Store.findOne({
        $or: [
            { domain: domainOrSlug },
            { domain: new RegExp(domainOrSlug.replace(/\./g, '\\.'), 'i') },
            { slug: domainOrSlug },
            { name: new RegExp(`^${domainOrSlug}$`, 'i') },
        ],
    })
        .select('_id domain name slug')
        .lean();
    if (!store) {
        throw new Error(`Store not found for "${domainOrSlug}". Pass --store-id or --store-domain explicitly.`);
    }
    console.log(`Store: ${store.name} (${store.domain}) id=${store._id}`);
    return { filter: { store: store._id }, label: String(store.domain ?? store._id) };
};
const main = async () => {
    const args = parseArgs();
    await (0, db_1.connectDB)();
    const { filter, label } = await resolveStoreFilter(args);
    if (args.dryRun)
        console.log('DRY RUN — no database writes\n');
    const products = await models_1.Product.find(filter)
        .select('_id name category price originalPrice')
        .lean();
    console.log(`Products on ${label}: ${products.length}`);
    const updates = [];
    const byCategory = new Map();
    for (const p of products) {
        const category = p.category ?? '';
        const tier = resolveTier(category);
        const oldPrice = Number(p.price);
        const oldOriginal = Number(p.originalPrice);
        const stats = byCategory.get(category) ?? {
            fixed: 0,
            kept: 0,
            floor: tier.minPrice,
        };
        const underFloor = !Number.isFinite(oldPrice) || oldPrice < tier.minPrice;
        const needsRemap = underFloor || args.forceAll;
        if (!needsRemap) {
            // Still ensure originalPrice ≤ 20% off if crazy high
            const maxOriginal = Math.floor(oldPrice / (1 - MAX_DISCOUNT_RATIO));
            if (Number.isFinite(oldOriginal) &&
                oldOriginal > maxOriginal &&
                oldOriginal > oldPrice) {
                updates.push({
                    _id: p._id,
                    name: p.name ?? '',
                    category,
                    oldPrice,
                    newPrice: oldPrice,
                    oldOriginal,
                    newOriginal: maxOriginal,
                    minFloor: tier.minPrice,
                });
                stats.fixed += 1;
            }
            else {
                stats.kept += 1;
            }
            byCategory.set(category, stats);
            continue;
        }
        // Keep relative placement in old range when possible: if old price was in a band,
        // map into new [min, max]; otherwise random in tier.
        let newPrice;
        if (args.forceAll || underFloor) {
            newPrice = randomInt(tier.minPrice, tier.maxPrice);
        }
        else {
            newPrice = oldPrice;
        }
        // Never go below floor
        newPrice = Math.max(tier.minPrice, newPrice);
        const newOriginal = originalForSalePrice(newPrice);
        updates.push({
            _id: p._id,
            name: p.name ?? '',
            category,
            oldPrice,
            newPrice,
            oldOriginal,
            newOriginal,
            minFloor: tier.minPrice,
        });
        stats.fixed += 1;
        byCategory.set(category, stats);
    }
    console.log('\nPer category:');
    for (const [cat, s] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log(`  ${cat || '(empty)'}: floor ₹${s.floor} | fix ${s.fixed} | ok ${s.kept}`);
    }
    console.log(`\nProducts to update: ${updates.length}`);
    for (const u of updates.slice(0, 20)) {
        console.log(`  [~] ${u.category} | ${u.name.slice(0, 40)}… ₹${u.oldPrice}→${u.newPrice} (was orig ${u.oldOriginal}→${u.newOriginal}) floor ${u.minFloor}`);
    }
    if (updates.length > 20)
        console.log(`  … and ${updates.length - 20} more`);
    if (args.dryRun) {
        console.log(`\nWould update ${updates.length} product(s).`);
        process.exit(0);
    }
    const BATCH = 80;
    for (let i = 0; i < updates.length; i += BATCH) {
        const chunk = updates.slice(i, i + BATCH);
        await Promise.all(chunk.map((u) => models_1.Product.updateOne({ _id: u._id }, { $set: { price: u.newPrice, originalPrice: u.newOriginal } })));
    }
    // Verify floors after write
    const stillLow = await models_1.Product.countDocuments({
        ...filter,
        category: { $regex: /suit|lehenga|saree|dress|kurta\s*set|sharara|coord/i },
        price: { $lt: 600 },
    });
    console.log(`\nUpdated ${updates.length} product(s).`);
    console.log(`Outfit-style products still under ₹600: ${stillLow}`);
    process.exit(0);
};
main().catch((err) => {
    console.error('fix:category-prices failed:', err);
    process.exit(1);
});
