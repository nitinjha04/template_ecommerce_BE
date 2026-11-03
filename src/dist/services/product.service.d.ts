import { IProduct } from '../models';
import { ProductCategory } from '../types';
interface ProductQuery {
    page?: number;
    limit?: number;
    category?: ProductCategory;
    featured?: boolean;
    inStock?: boolean;
    search?: string;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
}
type ProductInput = Partial<Pick<IProduct, 'name' | 'price' | 'category' | 'description' | 'sizes' | 'colors' | 'images' | 'tags' | 'inStock' | 'featured'>>;
export declare class ProductService {
    static getAll(query: ProductQuery): Promise<{
        products: (import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(data: ProductInput): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, data: ProductInput): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static remove(id: string): Promise<{
        id: string;
    }>;
}
export {};
//# sourceMappingURL=product.service.d.ts.map