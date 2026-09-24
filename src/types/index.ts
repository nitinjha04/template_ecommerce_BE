import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'customer' | 'admin';

/** @deprecated Use string; kept for gradual migration in scripts */
export type ProductCategory = string;

export type OrderStatus =
  | 'Pending'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Completed' | 'Pending' | 'Failed';

export type PaymentMethod =
  | 'Credit Card'
  | 'UPI'
  | 'COD'
  | 'Debit Card';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface StoreRequestContext {
  id: string;
  slug: string;
  domain: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  store?: StoreRequestContext;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export type ObjectIdLike = Types.ObjectId | string;
