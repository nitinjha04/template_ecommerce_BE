import { connectDB } from '../config/db';
import { env } from '../config/env';
import { Contact, Order, Payment, Product, User } from '../models';
import { IOrderItem } from '../models/Order.model';
import { Types } from 'mongoose';
import {
  seedContacts,
  seedCustomers,
  seedOrders,
  seedPayments,
} from './mockData.data';
import { seedProducts } from './products.data';
import { slugify } from '../utils/slug';

const shouldForce = process.argv.includes('--force');

const seed = async (): Promise<void> => {
  await connectDB();

  if (shouldForce) {
    await Promise.all([
      Payment.deleteMany({}),
      Order.deleteMany({}),
      Contact.deleteMany({}),
      Product.deleteMany({}),
    ]);
    console.log('Cleared orders, payments, contacts, products (--force)');
  }

  // Admin user
  let admin = await User.findOne({ email: env.seedAdmin.email });
  if (!admin) {
    admin = await User.create({
      name: env.seedAdmin.name,
      email: env.seedAdmin.email,
      password: env.seedAdmin.password,
      role: 'admin',
      emailVerified: true,
      onBoardState: 1,
    });
    console.log(`Admin created: ${env.seedAdmin.email}`);
  } else {
    console.log('Admin already exists, skipped');
  }

  // Demo customers (from mockData userIds u1–u5)
  const userMap = new Map<string, Types.ObjectId>();
  if (admin) userMap.set('admin', admin._id as Types.ObjectId);

  for (const customer of seedCustomers) {
    let user = await User.findOne({ email: customer.email });
    if (!user) {
      user = await User.create({
        name: customer.name,
        email: customer.email,
        password: customer.password,
        role: 'customer',
        emailVerified: true,
        onBoardState: 1,
      });
      console.log(`Customer created: ${customer.email}`);
    }
    userMap.set(customer.key, user._id as Types.ObjectId);
  }

  // Products
  const productCount = await Product.countDocuments();
  if (productCount === 0 || shouldForce) {
    if (shouldForce && productCount > 0) {
      await Product.deleteMany({});
    }
    const productsWithSeo = seedProducts.map((p) => ({
      ...p,
      slug: slugify(p.name),
      metaTitle: p.name,
      metaDescription: p.description.slice(0, 160),
      metaKeywords: p.tags,
    }));
    await Product.insertMany(productsWithSeo);
    console.log(`Seeded ${seedProducts.length} products`);
  } else {
    console.log(`Products already exist (${productCount}), skipped`);
  }

  const products = await Product.find();
  const productByName = new Map(products.map((p) => [p.name, p]));

  const buildOrderItems = (
    lineItems: (typeof seedOrders)[0]['lineItems']
  ): IOrderItem[] => {
    return lineItems.map((line) => {
      const product = productByName.get(line.productName);
      if (!product) {
        throw new Error(`Product not found for seed: ${line.productName}`);
      }
      return {
        product: product._id as Types.ObjectId,
        name: product.name,
        price: product.price,
        quantity: line.quantity,
        size: line.size,
        color: line.color,
        image: product.images[0],
      };
    });
  };

  // Contact messages
  const contactCount = await Contact.countDocuments();
  if (contactCount === 0 || shouldForce) {
    if (shouldForce && contactCount > 0) {
      await Contact.deleteMany({});
    }
    await Contact.insertMany(
      seedContacts.map((c) => ({
        name: c.name,
        email: c.email,
        subject: c.subject,
        message: c.message,
        read: c.read,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.createdAt),
      }))
    );
    console.log(`Seeded ${seedContacts.length} contact messages`);
  } else {
    console.log(`Contacts already exist (${contactCount}), skipped`);
  }

  // Orders
  const orderCount = await Order.countDocuments();
  const orderIdByNumber = new Map<string, Types.ObjectId>();

  if (orderCount === 0 || shouldForce) {
    if (shouldForce && orderCount > 0) {
      await Order.deleteMany({});
      await Payment.deleteMany({});
    }

    for (const orderDef of seedOrders) {
      const userId = userMap.get(orderDef.userKey);
      if (!userId) {
        throw new Error(`User not found for key: ${orderDef.userKey}`);
      }

      const items = buildOrderItems(orderDef.lineItems);
      const computedTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const order = await Order.create({
        orderNumber: orderDef.orderNumber,
        user: userId,
        customerName: orderDef.customerName,
        email: orderDef.email,
        phone: orderDef.shippingAddress.phone,
        items,
        itemCount: orderDef.itemCount,
        total: computedTotal,
        status: orderDef.status,
        shippingAddress: orderDef.shippingAddress,
        paymentMethod: orderDef.paymentMethod,
        orderNote: orderDef.orderNote || '',
        createdAt: new Date(orderDef.createdAt),
        updatedAt: new Date(orderDef.createdAt),
      });

      orderIdByNumber.set(orderDef.orderNumber, order._id as Types.ObjectId);
    }
    console.log(`Seeded ${seedOrders.length} orders`);
  } else {
    console.log(`Orders already exist (${orderCount}), skipped`);
    const existingOrders = await Order.find();
    existingOrders.forEach((o) =>
      orderIdByNumber.set(o.orderNumber, o._id as Types.ObjectId)
    );
  }

  // Payments
  const paymentCount = await Payment.countDocuments();
  if (paymentCount === 0 || shouldForce) {
    if (shouldForce && paymentCount > 0) {
      await Payment.deleteMany({});
    }

    for (const payDef of seedPayments) {
      const orderId = orderIdByNumber.get(payDef.orderNumber);
      if (!orderId) {
        throw new Error(`Order not found for payment: ${payDef.orderNumber}`);
      }

      const order = await Order.findById(orderId);
      if (!order) continue;

      await Payment.create({
        paymentNumber: payDef.paymentNumber,
        order: orderId,
        user: order.user,
        method: payDef.method,
        amount: payDef.amount,
        status: payDef.status,
        createdAt: new Date(payDef.createdAt),
        updatedAt: new Date(payDef.createdAt),
      });
    }
    console.log(`Seeded ${seedPayments.length} payments`);
  } else {
    console.log(`Payments already exist (${paymentCount}), skipped`);
  }

  console.log('\nSeed completed successfully!');
  console.log('--- Credentials ---');
  console.log(`Admin: ${env.seedAdmin.email} / ${env.seedAdmin.password}`);
  console.log('Customers: alice@example.com … evan@example.com / Customer@123');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
