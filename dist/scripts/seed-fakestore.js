"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const models_1 = require("../models");
const slug_1 = require("../utils/slug");
const FAKESTORE_URL = 'https://fakestoreapi.com/products';
const TARGET_PRODUCTS = 100;
const mapStoreToShopCategory = (storeCategory) => {
    const key = storeCategory.toLowerCase().trim();
    if (key === "men's clothing")
        return 'Men';
    if (key === "women's clothing")
        return 'Women';
    if (key === 'jewelery' || key === 'jewelry' || key === 'electronics') {
        return 'Accessories';
    }
    return 'Accessories';
};
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const COLORS = ['Black', 'Navy', 'White', 'Grey', 'Beige', 'Brown', 'Olive', 'Burgundy'];
const dryRun = process.argv.includes('--dry-run');
const fetchJson = async (url) => {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.json();
};
const fetchAllFakeStoreProducts = async () => {
    return fetchJson(FAKESTORE_URL);
};
const trimDescription = (text, max = 500) => {
    const t = text.trim();
    if (t.length <= max)
        return t;
    return `${t.slice(0, max - 3)}...`;
};
const buildDraft = (item) => {
    const baseName = item.title.trim();
    const storeCategory = item.category.toLowerCase().trim();
    const sourceKey = `fs-${item.id}`;
    const slugBase = `${(0, slug_1.slugify)(baseName)}-fs${item.id}`;
    const storeTags = storeCategory.split(/\s+/).filter(Boolean);
    return {
        name: baseName,
        slug: slugBase,
        price: Math.floor(Math.random() * 501) + 500,
        category: mapStoreToShopCategory(item.category),
        description: trimDescription(item.description),
        sizes: [...SIZES],
        colors: [...COLORS],
        images: [item.image],
        tags: [...new Set([...storeTags, 'imported'])],
        inStock: true,
        featured: item.rating ? item.rating.rate >= 4 : false,
        sourceKey,
    };
};
const fillDrafts = (items, usedSourceKeys) => {
    const drafts = [];
    const localNames = new Set();
    if (items.length === 0) {
        console.warn('No Fake Store items available');
        return drafts;
    }
    const usedApiIds = new Set();
    let poolIndex = 0;
    let safety = 0;
    const maxAttempts = TARGET_PRODUCTS * 4;
    while (drafts.length < TARGET_PRODUCTS && safety < maxAttempts) {
        safety += 1;
        const item = items[poolIndex % items.length];
        poolIndex += 1;
        if (usedApiIds.has(item.id)) {
            continue;
        }
        const draft = buildDraft(item);
        usedApiIds.add(item.id);
        if (usedSourceKeys.has(draft.sourceKey) || localNames.has(draft.name)) {
            continue;
        }
        usedSourceKeys.add(draft.sourceKey);
        localNames.add(draft.name);
        drafts.push(draft);
    }
    if (drafts.length < TARGET_PRODUCTS) {
        console.warn(`Only generated ${drafts.length}/${TARGET_PRODUCTS} (pool size: ${items.length})`);
    }
    return drafts;
};
const dedupeNamesGlobally = (drafts, globalNames) => {
    for (const draft of drafts) {
        let name = draft.name;
        if (globalNames.has(name)) {
            name = `${name} (import)`;
        }
        let attempt = 0;
        while (globalNames.has(name) && attempt < 20) {
            name = `${draft.name} — ${attempt + 1}`;
            attempt += 1;
        }
        draft.name = name;
        globalNames.add(name);
        draft.metaTitle = name.slice(0, 70);
    }
};
const main = async () => {
    console.log('Fetching products from Fake Store API...');
    const allProducts = await fetchAllFakeStoreProducts();
    console.log(`Fetched ${allProducts.length} API products`);
    if (!dryRun) {
        await (0, db_1.connectDB)();
    }
    const usedSourceKeys = new Set();
    const globalNames = new Set(dryRun
        ? []
        : (await models_1.Product.find({}, { name: 1 }).lean()).map((p) => p.name));
    const drafts = fillDrafts(allProducts, usedSourceKeys);
    dedupeNamesGlobally(drafts, globalNames);
    console.log(`Prepared ${drafts.length} drafts`);
    if (dryRun) {
        console.log('\n--dry-run: no database writes');
        console.log('Sample:', drafts.slice(0, 3).map((d) => d.name));
        process.exit(0);
    }
    const existingSlugs = new Set((await models_1.Product.find({}, { slug: 1 }).lean()).map((p) => p.slug));
    const existingNames = new Set((await models_1.Product.find({}, { name: 1 }).lean()).map((p) => p.name));
    let inserted = 0;
    let skipped = 0;
    for (const draft of drafts) {
        if (existingSlugs.has(draft.slug) || existingNames.has(draft.name)) {
            skipped += 1;
            continue;
        }
        const slug = await (0, slug_1.uniqueSlug)(draft.slug, models_1.Product);
        if (existingSlugs.has(slug)) {
            skipped += 1;
            continue;
        }
        await models_1.Product.create({
            name: draft.name,
            slug,
            price: draft.price,
            category: draft.category,
            description: draft.description,
            metaTitle: (draft.metaTitle ?? draft.name).slice(0, 70),
            metaDescription: draft.description.slice(0, 160),
            metaKeywords: draft.tags,
            sizes: draft.sizes,
            colors: draft.colors,
            images: draft.images,
            tags: draft.tags,
            inStock: draft.inStock,
            featured: draft.featured,
        });
        existingSlugs.add(slug);
        existingNames.add(draft.name);
        inserted += 1;
    }
    const total = await models_1.Product.countDocuments();
    console.log('\n--- Summary ---');
    console.log(`Total products in database: ${total}`);
    console.log(`Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);
    console.log('Fake Store seed completed.');
    process.exit(0);
};
main().catch((err) => {
    console.error('Fake Store seed failed:', err);
    process.exit(1);
});
