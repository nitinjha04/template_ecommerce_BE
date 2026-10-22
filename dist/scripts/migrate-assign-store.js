"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Creates the default store (dulhaniya.vercel.app) and assigns storeId to all documents.
 *
 * Usage: npm run migrate:assign-store
 */
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const Store_model_1 = require("../models/Store.model");
const Product_model_1 = require("../models/Product.model");
const Category_model_1 = require("../models/Category.model");
const Order_model_1 = require("../models/Order.model");
const Payment_model_1 = require("../models/Payment.model");
const User_model_1 = require("../models/User.model");
const Contact_model_1 = require("../models/Contact.model");
const storeDomain_1 = require("../utils/storeDomain");
const DEFAULT_NAME = 'Dulhaniya';
const DEFAULT_SLUG = 'dulhaniya';
async function dropLegacyIndexes() {
    const tryDrop = async (collection, indexName) => {
        try {
            await mongoose_1.default.connection.collection(collection).dropIndex(indexName);
            console.log(`[migrate] Dropped index ${collection}.${indexName}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!/not found|ns not found/i.test(message)) {
                console.warn(`[migrate] Could not drop ${collection}.${indexName}:`, message);
            }
        }
    };
    await tryDrop('products', 'slug_1');
    await tryDrop('categories', 'slug_1');
    await tryDrop('categories', 'name_1');
    await tryDrop('users', 'email_1');
}
const missingStoreFilter = {
    $or: [{ store: { $exists: false } }, { store: null }],
};
async function main() {
    await (0, db_1.connectDB)();
    const domain = (0, storeDomain_1.normalizeStoreDomain)(env_1.env.defaultStoreDomain);
    let store = await Store_model_1.Store.findOne({ domain }).exec();
    if (!store) {
        store = await Store_model_1.Store.create({
            name: DEFAULT_NAME,
            slug: DEFAULT_SLUG,
            domain,
            isActive: true,
        });
        console.log(`[migrate] Created store ${store.name} (${store.domain}) id=${store._id}`);
    }
    else {
        console.log(`[migrate] Using existing store ${store.name} (${store.domain}) id=${store._id}`);
    }
    const storeId = store._id;
    await dropLegacyIndexes();
    for (const [label, model] of [
        ['products', Product_model_1.Product],
        ['categories', Category_model_1.Category],
        ['orders', Order_model_1.Order],
        ['payments', Payment_model_1.Payment],
        ['users', User_model_1.User],
        ['contacts', Contact_model_1.Contact],
    ]) {
        const result = await model.updateMany(missingStoreFilter, { $set: { store: storeId } });
        console.log(`[migrate] ${label}: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    }
    await Product_model_1.Product.syncIndexes();
    await Category_model_1.Category.syncIndexes();
    await User_model_1.User.syncIndexes();
    console.log('[migrate] Done. Set DEFAULT_STORE_DOMAIN and run the API with X-Store-Domain or Origin from your storefront.');
    await mongoose_1.default.disconnect();
}
main().catch((err) => {
    console.error('[migrate] Failed:', err);
    process.exit(1);
});
