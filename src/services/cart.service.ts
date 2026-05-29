import { Types } from 'mongoose';
import { Product, User } from '../models';
import { ApiError } from '../utils/ApiError';
import { serializeProduct } from '../utils/serializeProduct';

export type CartLineDto = {
  product: Record<string, unknown>;
  quantity: number;
  size: string;
  color: string;
};

const normalizeSize = (value: unknown): string => {
  const s = typeof value === 'string' ? value.trim() : '';
  return s || 'One Size';
};

const normalizeColor = (value: unknown): string => {
  const c = typeof value === 'string' ? value.trim() : '';
  return c || 'Default';
};

const cartKey = (productId: string, size: string, color: string) =>
  `${productId}|${normalizeSize(size)}|${normalizeColor(color)}`.toLowerCase();

export class CartService {
  static async get(userId: string): Promise<CartLineDto[]> {
    const user = await User.findById(userId).select('cart');
    if (!user) throw new ApiError(404, 'User not found');

    const lines = (user.cart ?? []).filter((l) => l?.product);
    if (!lines.length) return [];

    const productIds = lines.map((l) => l.product);
    const products = await Product.find({
      _id: { $in: productIds },
      isPublished: { $ne: false },
    });

    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    return lines
      .map((line) => {
        const product = byId.get(line.product.toString());
        if (!product) return null;
        return {
          product: serializeProduct(product),
          quantity: line.quantity,
          size: normalizeSize(line.size),
          color: normalizeColor(line.color),
        } satisfies CartLineDto;
      })
      .filter((x): x is CartLineDto => Boolean(x));
  }

  static async upsertLine(input: {
    userId: string;
    productId: string;
    quantity: number;
    size?: string;
    color?: string;
  }): Promise<CartLineDto[]> {
    const { userId, productId } = input;
    if (!Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, 'Invalid product id');
    }

    const product = await Product.findById(productId);
    if (!product || product.isPublished === false) {
      throw new ApiError(404, 'Product not found');
    }

    const user = await User.findById(userId).select('cart');
    if (!user) throw new ApiError(404, 'User not found');

    const size = normalizeSize(input.size);
    const color = normalizeColor(input.color);

    const nextQty = Math.max(1, Math.floor(Number(input.quantity || 1)));
    const key = cartKey(productId, size, color);

    const idx = (user.cart ?? []).findIndex((l) => {
      const pid = l.product?.toString?.() ?? String(l.product);
      return cartKey(pid, l.size, l.color) === key;
    });

    if (idx >= 0) {
      user.cart[idx].quantity = nextQty;
      user.cart[idx].size = size;
      user.cart[idx].color = color;
    } else {
      user.cart = user.cart ?? [];
      user.cart.push({
        product: new Types.ObjectId(productId),
        quantity: nextQty,
        size,
        color,
      });
    }

    await user.save();
    return this.get(userId);
  }

  static async removeLine(input: {
    userId: string;
    productId: string;
    size?: string;
    color?: string;
  }): Promise<CartLineDto[]> {
    const { userId, productId } = input;
    if (!Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, 'Invalid product id');
    }

    const user = await User.findById(userId).select('cart');
    if (!user) throw new ApiError(404, 'User not found');

    const size = normalizeSize(input.size);
    const color = normalizeColor(input.color);
    const key = cartKey(productId, size, color);

    user.cart = (user.cart ?? []).filter((l) => {
      const pid = l.product?.toString?.() ?? String(l.product);
      return cartKey(pid, l.size, l.color) !== key;
    });

    await user.save();
    return this.get(userId);
  }

  static async clear(userId: string): Promise<CartLineDto[]> {
    await User.findByIdAndUpdate(userId, { $set: { cart: [] } });
    return [];
  }
}

