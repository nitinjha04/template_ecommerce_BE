import mongoose, { Document, Schema } from 'mongoose';
export interface IProduct extends Document {
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  category: string;
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
  isHot: boolean;
  isPublished: boolean;
  fabricComposition: string;
  garmentLength: string;
  packageContains: string;
  washCare: string;
  neckline: string;
  sleeveLength: string;
  fitting: string;
  weight: string;
  dimensions: string;
  stockQuantity: number;
  deliveryStartDate?: Date;
  deliveryEndDate?: Date;
  breadcrumbCategory: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
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
  }
);

productSchema.index({ category: 1, featured: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text', slug: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
