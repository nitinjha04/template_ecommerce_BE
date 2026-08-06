"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Catalog cleanup:
 * 1) Delete products whose image URLs contain blocked hosts (default: pixum.photos).
 * 2) Cap originalPrice so the discount vs price is at most 20%.
 *
 * Rule: sale price = `price`, list = `originalPrice`.
 *   discount% = (originalPrice - price) / originalPrice * 100  ≤  20
 *   ⇒ originalPrice ≤ price / 0.8  (e.g. ₹100 sale → original ≤ ₹125)
 *
 * Usage:
 *   npm run fix:catalog
 *   npm run fix:catalog:dry
 *   npm run fix:catalog -- --store-id <mongoId>
 *   npm run fix:catalog -- --store-domain mineview.vercel.app
 *   npm run fix:catalog -- --only remove   # only pixum deletes
 *   npm run fix:catalog -- --only prices   # only discount cap
 */
const mongoose_1 = require("mongoose");
const db_1 = require("../config/db");
const models_1 = require("../models");
const Store_model_1 = require("../models/Store.model");
const MAX_DISCOUNT_RATIO = 0.2; // 20% off original
/** Hosts/path fragments that mark a product for removal */
const BLOCKED_URL_PATTERNS = [
    'fastly.pixum.photos',
    'pixum.photos',
];
const parseArgs = () => {
    const argv = process.argv.slice(2);
    const get = (flag) => {
        const i = argv.indexOf(flag);
        if (i === -1)
            return undefined;
        return argv[i + 1]?.trim();
    };
    const onlyRaw = (get('--only') ?? 'all').toLowerCase();
    const only = onlyRaw === 'remove' || onlyRaw === 'prices' ? onlyRaw : 'all';
    return {
        dryRun: argv.includes('--dry-run'),
        storeId: get('--store-id'),
        storeDomain: get('--store-domain'),
        only,
    };
};
const maxOriginalForPrice = (price) => {
    if (!Number.isFinite(price) || price <= 0)
        return 0;
    // original - price ≤ 0.2 * original  ⇒  original ≤ price / 0.8
    // floor so rounding never tips over 20%
    return Math.max(price, Math.floor(price / (1 - MAX_DISCOUNT_RATIO)));
};
const hasBlockedImage = (images) => {
    if (!images?.length)
        return false;
    return images.some((url) => {
        const lower = String(url ?? '').toLowerCase();
        return BLOCKED_URL_PATTERNS.some((p) => lower.includes(p));
    });
};
const discountPercent = (price, original) => {
    if (!Number.isFinite(original) || original <= 0)
        return 0;
    if (original <= price)
        return 0;
    return ((original - price) / original) * 100;
};
const resolveStoreFilter = async (args) => {
    if (args.storeId) {
        if (!mongoose_1.Types.ObjectId.isValid(args.storeId)) {
            throw new Error(`Invalid --store-id: ${args.storeId}`);
        }
        return { store: new mongoose_1.Types.ObjectId(args.storeId) };
    }
    if (args.storeDomain) {
        const store = await Store_model_1.Store.findOne({
            $or: [
                { domain: args.storeDomain },
                { slug: args.storeDomain },
            ],
        })
            .select('_id domain name')
            .lean();
        if (!store) {
            throw new Error(`Store not found for domain/slug: ${args.storeDomain}`);
        }
        console.log(`Scoped to store ${store.name ?? ''} (${store.domain}) id=${store._id}`);
        return { store: store._id };
    }
    console.log('Scope: ALL stores');
    return {};
};
const main = async () => {
    const args = parseArgs();
    await (0, db_1.connectDB)();
    const filter = await resolveStoreFilter(args);
    if (args.dryRun)
        console.log('DRY RUN — no database writes\n');
    let removed = 0;
    let pricesFixed = 0;
    let examined = 0;
    // ── 1) Remove products with blocked image hosts ─────────────────────────
    if (args.only === 'all' || args.only === 'remove') {
        const urlRegex = BLOCKED_URL_PATTERNS.map((p) => p.replace(/\./g, '\\.')).join('|');
        const badProducts = await models_1.Product.find({
            ...filter,
            images: { $regex: urlRegex, $options: 'i' },
        })
            .select('_id name slug images price store')
            .lean();
        // Belt-and-suspenders: also scan in case regex / index quirks
        const confirmed = badProducts.filter((p) => hasBlockedImage(p.images));
        console.log(`\nBlocked-image products: ${confirmed.length} (patterns: ${BLOCKED_URL_PATTERNS.join(', ')})`);
        for (const p of confirmed.slice(0, 20)) {
            const sample = (p.images ?? []).find((u) => BLOCKED_URL_PATTERNS.some((pat) => u.toLowerCase().includes(pat)));
            console.log(`  [-] ${p.name?.slice(0, 55)}… (${p.slug})`);
            if (sample)
                console.log(`      img: ${sample.slice(0, 90)}`);
        }
        if (confirmed.length > 20) {
            console.log(`  … and ${confirmed.length - 20} more`);
        }
        if (!args.dryRun && confirmed.length > 0) {
            const ids = confirmed.map((p) => p._id);
            const result = await models_1.Product.deleteMany({ _id: { $in: ids } });
            removed = result.deletedCount ?? 0;
            console.log(`Deleted ${removed} product(s) with blocked image hosts.`);
        }
        else if (args.dryRun) {
            removed = confirmed.length;
            console.log(`Would delete ${removed} product(s).`);
        }
    }
    // ── 2) Cap originalPrice to ≤ 20% discount ──────────────────────────────
    if (args.only === 'all' || args.only === 'prices') {
        const products = await models_1.Product.find(filter)
            .select('_id name price originalPrice')
            .lean();
        examined = products.length;
        console.log(`\nChecking discount on ${examined} product(s)…`);
        const updates = [];
        for (const p of products) {
            const price = Number(p.price);
            const original = Number(p.originalPrice);
            if (!Number.isFinite(price) || price <= 0)
                continue;
            const maxOriginal = maxOriginalForPrice(price);
            let nextOriginal = original;
            if (!Number.isFinite(original) || original < price) {
                // Missing / inverted list — match sale price (0% off)
                nextOriginal = Math.round(price);
            }
            else if (discountPercent(price, original) > MAX_DISCOUNT_RATIO * 100 + 0.01) {
                nextOriginal = maxOriginal;
            }
            else {
                continue;
            }
            // Avoid needless write if already correct
            if (Math.round(original) === nextOriginal)
                continue;
            updates.push({
                _id: p._id,
                oldOriginal: original,
                newOriginal: nextOriginal,
                price,
                name: p.name ?? '',
            });
        }
        console.log(`Products needing originalPrice fix: ${updates.length}`);
        for (const row of updates.slice(0, 15)) {
            const oldPct = discountPercent(row.price, row.oldOriginal).toFixed(1);
            const newPct = discountPercent(row.price, row.newOriginal).toFixed(1);
            console.log(`  [~] ${row.name.slice(0, 45)}… ₹${row.price}  original ${row.oldOriginal} (${oldPct}% off) → ${row.newOriginal} (${newPct}% off)`);
        }
        if (updates.length > 15) {
            console.log(`  … and ${updates.length - 15} more`);
        }
        if (!args.dryRun && updates.length > 0) {
            const BATCH = 100;
            for (let i = 0; i < updates.length; i += BATCH) {
                const chunk = updates.slice(i, i + BATCH);
                await Promise.all(chunk.map((u) => models_1.Product.updateOne({ _id: u._id }, { $set: { originalPrice: u.newOriginal } })));
            }
            pricesFixed = updates.length;
            console.log(`Updated originalPrice on ${pricesFixed} product(s).`);
        }
        else if (args.dryRun) {
            pricesFixed = updates.length;
            console.log(`Would update originalPrice on ${pricesFixed} product(s).`);
        }
    }
    console.log('\n' + '='.repeat(50));
    console.log('CATALOG FIX SUMMARY');
    console.log('='.repeat(50));
    console.log(`Removed (blocked images): ${removed}`);
    console.log(`Prices capped (≤20% off):  ${pricesFixed}`);
    if (examined)
        console.log(`Products examined (prices): ${examined}`);
    console.log(args.dryRun ? '(dry run — no writes)' : '(applied)');
    console.log('='.repeat(50));
    process.exit(0);
};
main().catch((err) => {
    console.error('fix:catalog failed:', err);
    process.exit(1);
});
