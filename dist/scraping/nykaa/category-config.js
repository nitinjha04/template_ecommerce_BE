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
exports.loadCategoryConfigFile = exports.normalizeSort = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'categories.example.json');
const normalizeSort = (sort) => {
    const s = sort?.trim().toLowerCase();
    if (s === 'high-to-low' || s === 'high_to_low')
        return 'high-to-low';
    return 'low-to-high';
};
exports.normalizeSort = normalizeSort;
const validateEntry = (entry, index) => {
    if (!entry || typeof entry !== 'object') {
        throw new Error(`categories[${index}]: must be an object`);
    }
    const row = entry;
    const categoryFilter = String(row.categoryFilter ?? '').trim();
    const categoryName = String(row.categoryName ?? '').trim();
    const priceMin = Number(row.priceMin);
    const priceMax = Number(row.priceMax);
    if (!categoryFilter)
        throw new Error(`categories[${index}]: categoryFilter is required`);
    if (!categoryName)
        throw new Error(`categories[${index}]: categoryName is required`);
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin > priceMax) {
        throw new Error(`categories[${index}]: invalid priceMin / priceMax`);
    }
    const config = {
        categoryFilter,
        categoryName,
        priceMin,
        priceMax,
        sort: (0, exports.normalizeSort)(row.sort),
    };
    if (row.limit !== undefined) {
        const limit = Number(row.limit);
        if (!Number.isFinite(limit) || limit <= 0) {
            throw new Error(`categories[${index}]: limit must be a positive number`);
        }
        config.limit = Math.floor(limit);
    }
    if (row.categoryId !== undefined) {
        config.categoryId = String(row.categoryId).trim();
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
