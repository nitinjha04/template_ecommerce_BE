"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
const COLOR_SEP = ' — ';
const dryRun = process.argv.includes('--dry-run');
const parseProductName = (name) => {
    let n = name.trim();
    n = n.replace(/\s+\([^)]+\)\s*$/, '').trim();
    const idx = n.indexOf(COLOR_SEP);
    if (idx === -1) {
        return { baseName: n, variantColor: null };
    }
    return {
        baseName: n.slice(0, idx).trim(),
        variantColor: n.slice(idx + COLOR_SEP.length).trim() || null,
    };
};
const uniqStrings = (values) => {
    const seen = new Set();
    const out = [];
    for (const raw of values) {
        const v = raw.trim();
        if (!v)
            continue;
        const key = v.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(v);
    }
    return out;
};
const groupKey = (baseName) => baseName.toLowerCase();
const pickKeeper = (group) => {
    const exact = group.find((p) => {
        const { baseName, variantColor } = parseProductName(p.name);
        return variantColor === null && p.name.trim() === baseName;
    });
    if (exact)
        return exact;
    const noSuffix = group.find((p) => parseProductName(p.name).variantColor === null);
    if (noSuffix)
        return noSuffix;
    return [...group].sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))[0];
};
const main = async () => {
    await (0, db_1.connectDB)();
    const products = (await models_1.Product.find().sort({ createdAt: 1 }).lean());
    const groups = new Map();
    for (const p of products) {
        const { baseName } = parseProductName(p.name);
        const key = groupKey(baseName);
        const list = groups.get(key) ?? [];
        list.push(p);
        groups.set(key, list);
    }
    const toMerge = [...groups.entries()].filter(([, list]) => list.length > 1);
    if (toMerge.length === 0) {
        console.log('No duplicate color-variant products found.');
        process.exit(0);
    }
    const removeCount = toMerge.reduce((n, [, g]) => n + g.length - 1, 0);
    if (dryRun)
        console.log('--dry-run: no database writes\n');
    console.log(`Found ${toMerge.length} product groups to merge (${products.length} → ${products.length - removeCount} products)\n`);
    let mergedGroups = 0;
    let deletedCount = 0;
    let ordersRetargeted = 0;
    for (const [, group] of toMerge) {
        const keeper = pickKeeper(group);
        const duplicates = group.filter((p) => !p._id.equals(keeper._id));
        const { baseName } = parseProductName(keeper.name);
        const mergedColors = uniqStrings(group.flatMap((p) => {
            const parsed = parseProductName(p.name);
            const fromName = parsed.variantColor ? [parsed.variantColor] : [];
            return [...(p.colors ?? []), ...fromName];
        }));
        const mergedImages = uniqStrings(group.flatMap((p) => p.images ?? []));
        const mergedSizes = uniqStrings(group.flatMap((p) => p.sizes ?? []));
        const mergedTags = uniqStrings(group.flatMap((p) => p.tags ?? []));
        const mergedFeatured = group.some((p) => p.featured);
        const mergedInStock = group.some((p) => p.inStock);
        console.log(`• ${baseName} (${keeper.category})`);
        console.log(`    keep: ${keeper._id} | remove ${duplicates.length} variant(s)`);
        console.log(`    colors: ${mergedColors.join(', ')}`);
        if (dryRun) {
            mergedGroups += 1;
            deletedCount += duplicates.length;
            continue;
        }
        const slug = await (0, slug_1.uniqueSlug)((0, slug_1.slugify)(baseName), models_1.Product, String(keeper._id));
        await models_1.Product.updateOne({ _id: keeper._id }, {
            $set: {
                name: baseName,
                slug,
                colors: mergedColors,
                images: mergedImages.length > 0 ? mergedImages : keeper.images,
                sizes: mergedSizes.length > 0 ? mergedSizes : keeper.sizes,
                tags: mergedTags,
                featured: mergedFeatured,
                inStock: mergedInStock,
                metaTitle: baseName.slice(0, 70),
            },
        });
        const duplicateIds = duplicates.map((d) => d._id);
        const duplicateIdSet = new Set(duplicateIds.map((id) => String(id)));
        const orders = await models_1.Order.find({ 'items.product': { $in: duplicateIds } });
        for (const order of orders) {
            let changed = false;
            for (const item of order.items) {
                if (duplicateIdSet.has(String(item.product))) {
                    item.product = keeper._id;
                    item.name = baseName;
                    changed = true;
                }
            }
            if (changed) {
                await order.save();
                ordersRetargeted += 1;
            }
        }
        const deleteResult = await models_1.Product.deleteMany({ _id: { $in: duplicateIds } });
        deletedCount += deleteResult.deletedCount ?? 0;
        mergedGroups += 1;
    }
    const remaining = dryRun
        ? products.length - deletedCount
        : await models_1.Product.countDocuments();
    console.log('\n--- Summary ---');
    console.log(`Merged groups: ${mergedGroups}`);
    console.log(`Products removed: ${deletedCount}`);
    if (!dryRun) {
        console.log(`Orders updated (product refs): ${ordersRetargeted}`);
    }
    console.log(`Products in database: ${remaining}`);
    process.exit(0);
};
main().catch((err) => {
    console.error('Merge color variants failed:', err);
    process.exit(1);
});
