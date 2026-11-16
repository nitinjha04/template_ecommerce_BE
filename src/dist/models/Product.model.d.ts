import mongoose, { Document } from 'mongoose';
import { ProductCategory } from '../types';
export interface IProduct extends Document {
    name: string;
    price: number;
    category: ProductCategory;
    description: string;
    sizes: string[];
    colors: string[];
    images: string[];
    tags: string[];
    inStock: boolean;
    featured: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Product: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Product.model.d.ts.map