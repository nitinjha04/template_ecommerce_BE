"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedProducts = void 0;
const products_catalog_json_1 = __importDefault(require("./products.catalog.json"));
/** 75 curated products (25 Men, 25 Women, 25 Accessories) — see products.catalog.json */
exports.seedProducts = products_catalog_json_1.default;
