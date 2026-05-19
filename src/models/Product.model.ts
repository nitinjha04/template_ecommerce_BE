import mongoose, { Document, Schema } from 'mongoose';
import { ProductCategory } from '../types';

export interface IProduct extends Document {
  name: string;
  slug: string;
  price: number;
  category: ProductCategory;
  description: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  sizes: string[];
  colors: string[];
  images: string[];
  tags: string[];
  inStock: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Men',
  'Women',
  'Outerwear',
  'Knitwear',
  'Shirts',
  'Trousers',
  'Accessories',
];

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
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
    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: true,
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

productSchema.index({ category: 1, featured: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text', slug: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
