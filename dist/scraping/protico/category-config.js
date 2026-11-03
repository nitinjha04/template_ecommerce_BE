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
exports.loadCategoryConfigFile = exports.buildScrapeConfigsFromSources = exports.loadPriceBands = exports.loadProticoCategories = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const category_config_1 = require("../nykaa/category-config");
const CATEGORY_PATH = path.join(__dirname, 'category.json');
const BAND_PATH = path.join(__dirname, '../scrape-config.json');
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'categories.example.json');
const toCategoryName = (label) => label.trim().toLowerCase();
const loadProticoCategories = (filePath) => {
    const abs = path.resolve(filePath?.trim() || CATEGORY_PATH);
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('category.json must be a non-empty array');
    }
    return parsed.map((row, index) => {
        if (!row || typeof row !== 'object') {
            throw new Error(`category[${index}]: must be an object`);
        }
        const entry = row;
        const label = String(entry.label ?? '').trim();
        const value = String(entry.value ?? label).trim();
        const count = Number(entry.count);
        if (!label || !value) {
            throw new Error(`category[${index}]: label and value are required`);
        }
        if (!Number.isFinite(count) || count < 0) {
            throw new Error(`category[${index}]: invalid count`);
        }
        return { label, value, count };
    });
};
exports.loadProticoCategories = loadProticoCategories;
const loadPriceBands = (filePath) => {
    const abs = path.resolve(filePath?.trim() || BAND_PATH);
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('scrape-config.json must be a non-empty array');
    }
    return parsed.map((row, index) => {
        if (!row || typeof row !== 'object') {
            throw new Error(`band[${index}]: must be an object`);
        }
        const entry = row;
        const priceMin = Number(entry.priceMin);
        const priceMax = Number(entry.priceMax);
        const minLimit = Number(entry.minLimit);
        const maxLimit = Number(entry.maxLimit);
        if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
            throw new Error(`band[${index}]: invalid price range`);
        }
        if (!Number.isFinite(minLimit) || !Number.isFinite(maxLimit) || minLimit <= 0 || maxLimit <= 0) {
            throw new Error(`band[${index}]: invalid limits`);
        }
        return { priceMin, priceMax, minLimit, maxLimit };
    });
};
exports.loadPriceBands = loadPriceBands;
const buildScrapeConfigsFromSources = () => {
    const categories = (0, exports.loadProticoCategories)();
    const bands = (0, exports.loadPriceBands)();
    if (bands.length < categories.length) {
        throw new Error(`scrape-config has ${bands.length} bands but category.json has ${categories.length} categories`);
    }
    return categories.map((cat, index) => {
        const band = bands[index];
        const limit = Math.min(cat.count, band.maxLimit);
        const sort = index >= 9 ? 'high-to-low' : 'low-to-high';
        return {
            filterValue: cat.value,
            categoryName: toCategoryName(cat.label),
            catalogCount: cat.count,
            priceMin: band.priceMin,
            priceMax: band.priceMax,
            limit,
            sort,
        };
    });
};
exports.buildScrapeConfigsFromSources = buildScrapeConfigsFromSources;
const validateEntry = (entry, index) => {
    if (!entry || typeof entry !== 'object') {
        throw new Error(`categories[${index}]: must be an object`);
    }
    const row = entry;
    const filterValue = String(row.filterValue ?? row.categoryFilter ?? '').trim();
    const categoryName = String(row.categoryName ?? '').trim();
    const priceMin = Number(row.priceMin);
    const priceMax = Number(row.priceMax);
    const limit = Number(row.limit ?? row.maxLimit ?? 50);
    const catalogCount = Number(row.catalogCount ?? row.count ?? limit);
    if (!filterValue) {
        throw new Error(`categories[${index}]: filterValue is required`);
    }
    if (!categoryName) {
        throw new Error(`categories[${index}]: categoryName is required`);
    }
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
        throw new Error(`categories[${index}]: invalid priceMin / priceMax`);
    }
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error(`categories[${index}]: limit must be positive`);
    }
    return {
        filterValue,
        categoryName,
        catalogCount: Number.isFinite(catalogCount) ? catalogCount : limit,
        priceMin,
        priceMax,
        limit: Math.floor(limit),
        sort: (0, category_config_1.normalizeSort)(row.sort),
    };
};
const loadCategoryConfigFile = (filePath) => {
    const abs = path.resolve(filePath?.trim() || DEFAULT_CONFIG_PATH);
    if (!fs.existsSync(abs)) {
        throw new Error(`Config file not found: ${abs}`);
    }
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Config file must be a non-empty JSON array');
    }
    return parsed.map((entry, index) => validateEntry(entry, index));
};
exports.loadCategoryConfigFile = loadCategoryConfigFile;
