"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureNexaStore = void 0;
const db_1 = require("../../config/db");
const constants_1 = require("./constants");
const Store_model_1 = require("../../models/Store.model");
const ensureNexaStore = async () => {
    await (0, db_1.connectDB)();
    let store = await Store_model_1.Store.findOne({
        $or: [
            { domain: constants_1.NEXA_STORE_DOMAIN },
            { domain: 'nexa-skyline.vercel.app' },
            { slug: constants_1.NEXA_STORE_SLUG },
        ],
    }).exec();
    if (!store) {
        store = await Store_model_1.Store.create({
            name: constants_1.NEXA_STORE_NAME,
            slug: constants_1.NEXA_STORE_SLUG,
            domain: constants_1.NEXA_STORE_DOMAIN,
            isActive: true,
        });
        console.log(`Created store ${constants_1.NEXA_STORE_NAME} (${constants_1.NEXA_STORE_DOMAIN}) id=${store._id}`);
    }
    return String(store._id);
};
exports.ensureNexaStore = ensureNexaStore;
