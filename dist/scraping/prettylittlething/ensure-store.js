"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureClauneckStore = void 0;
const db_1 = require("../../config/db");
const Store_model_1 = require("../../models/Store.model");
const constants_1 = require("./constants");
const ensureClauneckStore = async () => {
    await (0, db_1.connectDB)();
    let store = await Store_model_1.Store.findOne({
        $or: [
            { domain: constants_1.CLAUNECK_STORE_DOMAIN },
            { domain: 'clauneck.vercel.app' },
            { slug: constants_1.CLAUNECK_STORE_SLUG },
        ],
    }).exec();
    if (!store) {
        store = await Store_model_1.Store.create({
            name: constants_1.CLAUNECK_STORE_NAME,
            slug: constants_1.CLAUNECK_STORE_SLUG,
            domain: constants_1.CLAUNECK_STORE_DOMAIN,
            isActive: true,
        });
        console.log(`Created store ${constants_1.CLAUNECK_STORE_NAME} (${constants_1.CLAUNECK_STORE_DOMAIN}) id=${store._id}`);
    }
    else if (store.domain !== constants_1.CLAUNECK_STORE_DOMAIN) {
        store.domain = constants_1.CLAUNECK_STORE_DOMAIN;
        await store.save();
        console.log(`Updated store domain → ${constants_1.CLAUNECK_STORE_DOMAIN}`);
    }
    return String(store._id);
};
exports.ensureClauneckStore = ensureClauneckStore;
