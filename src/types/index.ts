import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'customer' | 'admin';

export type ProductCategory = 'Men' | 'Women' | 'Accessories';

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

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export type ObjectIdLike = Types.ObjectId | string;
