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
exports.loadAllCategoriesFile = exports.loadCategoryConfigFile = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const category_config_1 = require("../nykaa/category-config");
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'categories.example.json');
const slugToName = (slug) => {
    const leaf = slug.split('-').pop() ?? slug;
    return leaf.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/and/g, ' and ');
};
const validateEntry = (entry, index) => {
    if (!entry || typeof entry !== 'object') {
        throw new Error(`categories[${index}]: must be an object`);
    }
    const row = entry;
    const categorySlug = String(row.categorySlug ?? row.categoryFilter ?? '').trim();
    const categoryName = String(row.categoryName ?? '').trim() || slugToName(categorySlug);
    const priceMin = Number(row.priceMin);
    const priceMax = Number(row.priceMax);
    if (!categorySlug) {
        throw new Error(`categories[${index}]: categorySlug is required`);
    }
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
        throw new Error(`categories[${index}]: invalid priceMin / priceMax`);
    }
    const config = {
        categorySlug,
        categoryName,
        priceMin,
        priceMax,
        sort: (0, category_config_1.normalizeSort)(row.sort),
    };
    if (row.limit !== undefined) {
        const limit = Number(row.limit);
        if (!Number.isFinite(limit) || limit <= 0) {
            throw new Error(`categories[${index}]: limit must be a positive number`);
        }
        config.limit = Math.floor(limit);
    }
    return config;
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
const loadAllCategoriesFile = (filePath) => {
    const abs = path.resolve(filePath?.trim() || path.join(__dirname, 'allCategories.json'));
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
        throw new Error('allCategories.json must contain a non-empty categories array');
    }
    return parsed.categories.map((c) => String(c).trim()).filter(Boolean);
};
exports.loadAllCategoriesFile = loadAllCategoriesFile;
