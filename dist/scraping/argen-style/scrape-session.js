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
exports.ScrapeSession = void 0;
const models_1 = require("../../models");
const storeScope_1 = require("../../utils/storeScope");
const product_filters_1 = require("./product-filters");
const image_utils_1 = require("./image-utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ScrapeSession {
    storeId;
    usedNykaaIds = new Set();
    usedImageKeys = new Set();
    blocklistKeys = new Set();
    constructor(storeId, existingDbKeys) {
        this.storeId = storeId;
        for (const key of existingDbKeys) {
            this.usedImageKeys.add(key);
        }
    }
    static async create(storeId, blocklistPath) {
        const dbKeys = await ScrapeSession.loadStoreImageKeys(storeId);
        const session = new ScrapeSession(storeId, dbKeys);
        session.loadBlocklist(blocklistPath);
        return session;
    }
    static async loadStoreImageKeys(storeId) {
        const rows = await models_1.Product.find((0, storeScope_1.mergeStoreFilter)({}, storeId))
            .select('images')
            .lean();
        const keys = [];
        for (const row of rows) {
            for (const url of row.images ?? []) {
                if (!url)
                    continue;
                keys.push((0, image_utils_1.imageDedupeKey)(url));
            }
        }
        return keys;
    }
    loadBlocklist(filePath) {
        const abs = path.resolve(filePath?.trim() || path.join(__dirname, 'image-blocklist.json'));
        if (!fs.existsSync(abs))
            return;
        const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
        const urls = Array.isArray(parsed) ? parsed : [];
        for (const entry of urls) {
            const url = String(entry).trim();
            if (!url)
                continue;
            this.blocklistKeys.add((0, image_utils_1.imageDedupeKey)(url));
            this.blocklistKeys.add((0, image_utils_1.normalizeImageUrl)(url).toLowerCase());
        }
    }
    rejectReason(raw) {
        const id = raw.id?.trim();
        if (!id)
            return 'missing-id';
        if (this.usedNykaaIds.has(id))
            return 'duplicate-id';
        if ((0, product_filters_1.hasBlockedText)(raw))
            return 'blocked-text';
        const images = (0, product_filters_1.collectArgenImages)(raw);
        if (images.length === 0) {
            const rawImages = (raw.plp_pdp_bridge?.images ?? [])
                .map((i) => i.url ?? '')
                .concat(raw.imageUrl ?? '');
            const hadDesignedit = rawImages.some((u) => /designedit_image/i.test(u));
            return hadDesignedit ? 'designedit-only' : 'no-images';
        }
        const keys = (0, image_utils_1.imageKeysFromUrls)(images);
        for (const key of keys) {
            if (this.blocklistKeys.has(key))
                return 'blocklisted-image';
            if (this.usedImageKeys.has(key))
                return 'duplicate-image';
        }
        return null;
    }
    markAccepted(raw, images) {
        const id = raw.id?.trim();
        if (id)
            this.usedNykaaIds.add(id);
        for (const key of (0, image_utils_1.imageKeysFromUrls)(images)) {
            this.usedImageKeys.add(key);
        }
    }
}
exports.ScrapeSession = ScrapeSession;
