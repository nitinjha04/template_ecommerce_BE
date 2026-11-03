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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const productSchema = new mongoose_1.Schema({
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    metaTitle: { type: String, default: '', trim: true },
    metaDescription: { type: String, default: '', trim: true },
    metaKeywords: { type: [String], default: [] },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0,
    },
    originalPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        index: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
    },
    sizes: {
        type: [String],
        default: [],
    },
    colors: {
        type: [String],
        default: [],
    },
    images: {
        type: [String],
        default: [],
    },
    tags: {
        type: [String],
        default: [],
    },
    inStock: {
        type: Boolean,
        default: true,
    },
    featured: {
        type: Boolean,
        default: false,
    },
    isHot: {
        type: Boolean,
        default: false,
    },
    isPublished: {
        type: Boolean,
        default: true,
        index: true,
    },
    fabricComposition: { type: String, default: '', trim: true },
    garmentLength: { type: String, default: '', trim: true },
    packageContains: { type: String, default: '', trim: true },
    washCare: { type: String, default: '', trim: true },
    neckline: { type: String, default: '', trim: true },
    sleeveLength: { type: String, default: '', trim: true },
    fitting: { type: String, default: '', trim: true },
    weight: { type: String, default: '', trim: true },
    dimensions: { type: String, default: '', trim: true },
    stockQuantity: {
        type: Number,
        default: 0,
        min: 0,
    },
    deliveryStartDate: { type: Date },
    deliveryEndDate: { type: Date },
    breadcrumbCategory: { type: String, default: '', trim: true },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = String(ret._id);
            if (ret.deliveryStartDate instanceof Date) {
                ret.deliveryStartDate = ret.deliveryStartDate.toISOString();
            }
            if (ret.deliveryEndDate instanceof Date) {
                ret.deliveryEndDate = ret.deliveryEndDate.toISOString();
            }
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
productSchema.index({ store: 1, slug: 1 }, { unique: true });
productSchema.index({ store: 1, category: 1, featured: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text', slug: 'text' });
exports.Product = mongoose_1.default.model('Product', productSchema);
