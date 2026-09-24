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
exports.totalProductsNeeded = exports.loadPoolConfig = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const category_config_1 = require("../nykaa/category-config");
const DEFAULT_CONFIG = path.join(__dirname, 'pool-config.json');
const validateBand = (row, index) => {
    if (!row || typeof row !== 'object') {
        throw new Error(`priceBands[${index}]: must be an object`);
    }
    const band = row;
    const priceMin = Number(band.priceMin);
    const priceMax = Number(band.priceMax);
    const limit = Number(band.limit ?? 50);
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
        throw new Error(`priceBands[${index}]: invalid priceMin / priceMax`);
    }
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error(`priceBands[${index}]: limit must be positive`);
    }
    return { priceMin, priceMax, limit: Math.floor(limit) };
};
const loadPoolConfig = (filePath) => {
    const abs = path.resolve(filePath?.trim() || DEFAULT_CONFIG);
    if (!fs.existsSync(abs)) {
        throw new Error(`Config not found: ${abs}`);
    }
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    const bandsRaw = parsed.priceBands;
    if (!Array.isArray(bandsRaw) || bandsRaw.length === 0) {
        throw new Error('pool-config.json must include a non-empty priceBands array');
    }
    return {
        storeId: String(parsed.storeId ?? constants_1.ARGEN_STORE_ID).trim(),
        categoryFilter: String(parsed.categoryFilter ?? constants_1.DEFAULT_CATEGORY_FILTER).trim(),
        categoryId: String(parsed.categoryId ?? constants_1.DEFAULT_CATEGORY_ID).trim(),
        pageSize: Number(parsed.pageSize ?? constants_1.DEFAULT_PAGE_SIZE) || constants_1.DEFAULT_PAGE_SIZE,
        sort: (0, category_config_1.normalizeSort)(String(parsed.sort ?? 'low-to-high')),
        priceBands: bandsRaw.map((band, i) => validateBand(band, i)),
    };
};
exports.loadPoolConfig = loadPoolConfig;
const totalProductsNeeded = (config) => config.priceBands.reduce((sum, b) => sum + b.limit, 0);
exports.totalProductsNeeded = totalProductsNeeded;
