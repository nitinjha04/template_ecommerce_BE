import { Types } from 'mongoose';
import { Product, User } from '../models';
import { ApiError } from '../utils/ApiError';
import { serializeProducts } from '../utils/serializeProduct';
import { mergeStoreFilter } from '../utils/storeScope';

export class WishlistService {
  static async list(userId: string) {
    const user = await User.findById(userId).select('wishlist');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.wishlist.length) {
      return [];
    }

    const products = await Product.find(
      mergeStoreFilter({
        _id: { $in: user.wishlist },
        isPublished: { $ne: false },
      })
    );

    const order = new Map(
      user.wishlist.map((id, index) => [id.toString(), index])
    );

    products.sort(
      (a, b) =>
        (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0)
    );

    return serializeProducts(products);
  }

  static async toggle(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, 'Invalid product id');
    }

    const product = await Product.findOne(mergeStoreFilter({ _id: productId }));
    if (!product || product.isPublished === false) {
      throw new ApiError(404, 'Product not found');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const objectId = new Types.ObjectId(productId);
    const index = user.wishlist.findIndex((id) => id.equals(objectId));
    let added = false;

    if (index >= 0) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.unshift(objectId);
      added = true;
    }

    await user.save();

    const items = await this.list(userId);
    return { added, items };
  }

  static async clear(userId: string) {
    await User.findByIdAndUpdate(userId, { $set: { wishlist: [] } });
    return { items: [] };
  }
}
