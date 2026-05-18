"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const models_1 = require("../models");
const mockData_data_1 = require("./mockData.data");
const products_data_1 = require("./products.data");
const shouldForce = process.argv.includes('--force');
const seed = async () => {
    await (0, db_1.connectDB)();
    if (shouldForce) {
        await Promise.all([
            models_1.Payment.deleteMany({}),
            models_1.Order.deleteMany({}),
            models_1.Contact.deleteMany({}),
            models_1.Product.deleteMany({}),
        ]);
        console.log('Cleared orders, payments, contacts, products (--force)');
    }
    // Admin user
    let admin = await models_1.User.findOne({ email: env_1.env.seedAdmin.email });
    if (!admin) {
        admin = await models_1.User.create({
            name: env_1.env.seedAdmin.name,
            email: env_1.env.seedAdmin.email,
            password: env_1.env.seedAdmin.password,
            role: 'admin',
        });
        console.log(`Admin created: ${env_1.env.seedAdmin.email}`);
    }
    else {
        console.log('Admin already exists, skipped');
    }
    // Demo customers (from mockData userIds u1–u5)
    const userMap = new Map();
    if (admin)
        userMap.set('admin', admin._id);
    for (const customer of mockData_data_1.seedCustomers) {
        let user = await models_1.User.findOne({ email: customer.email });
        if (!user) {
            user = await models_1.User.create({
                name: customer.name,
                email: customer.email,
                password: customer.password,
                role: 'customer',
            });
            console.log(`Customer created: ${customer.email}`);
        }
        userMap.set(customer.key, user._id);
    }
    // Products
    const productCount = await models_1.Product.countDocuments();
    if (productCount === 0 || shouldForce) {
        if (shouldForce && productCount > 0) {
            await models_1.Product.deleteMany({});
        }
        await models_1.Product.insertMany(products_data_1.seedProducts);
        console.log(`Seeded ${products_data_1.seedProducts.length} products`);
    }
    else {
        console.log(`Products already exist (${productCount}), skipped`);
    }
    const products = await models_1.Product.find();
    const productByName = new Map(products.map((p) => [p.name, p]));
    const buildOrderItems = (lineItems) => {
        return lineItems.map((line) => {
            const product = productByName.get(line.productName);
            if (!product) {
                throw new Error(`Product not found for seed: ${line.productName}`);
            }
            return {
                product: product._id,
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
    const contactCount = await models_1.Contact.countDocuments();
    if (contactCount === 0 || shouldForce) {
        if (shouldForce && contactCount > 0) {
            await models_1.Contact.deleteMany({});
        }
        await models_1.Contact.insertMany(mockData_data_1.seedContacts.map((c) => ({
            name: c.name,
            email: c.email,
            subject: c.subject,
            message: c.message,
            read: c.read,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.createdAt),
        })));
        console.log(`Seeded ${mockData_data_1.seedContacts.length} contact messages`);
    }
    else {
        console.log(`Contacts already exist (${contactCount}), skipped`);
    }
    // Orders
    const orderCount = await models_1.Order.countDocuments();
    const orderIdByNumber = new Map();
    if (orderCount === 0 || shouldForce) {
        if (shouldForce && orderCount > 0) {
            await models_1.Order.deleteMany({});
            await models_1.Payment.deleteMany({});
        }
        for (const orderDef of mockData_data_1.seedOrders) {
            const userId = userMap.get(orderDef.userKey);
            if (!userId) {
                throw new Error(`User not found for key: ${orderDef.userKey}`);
            }
            const items = buildOrderItems(orderDef.lineItems);
            const computedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const order = await models_1.Order.create({
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
            orderIdByNumber.set(orderDef.orderNumber, order._id);
        }
        console.log(`Seeded ${mockData_data_1.seedOrders.length} orders`);
    }
    else {
        console.log(`Orders already exist (${orderCount}), skipped`);
        const existingOrders = await models_1.Order.find();
        existingOrders.forEach((o) => orderIdByNumber.set(o.orderNumber, o._id));
    }
    // Payments
    const paymentCount = await models_1.Payment.countDocuments();
    if (paymentCount === 0 || shouldForce) {
        if (shouldForce && paymentCount > 0) {
            await models_1.Payment.deleteMany({});
        }
        for (const payDef of mockData_data_1.seedPayments) {
            const orderId = orderIdByNumber.get(payDef.orderNumber);
            if (!orderId) {
                throw new Error(`Order not found for payment: ${payDef.orderNumber}`);
            }
            const order = await models_1.Order.findById(orderId);
            if (!order)
                continue;
            await models_1.Payment.create({
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
        console.log(`Seeded ${mockData_data_1.seedPayments.length} payments`);
    }
    else {
        console.log(`Payments already exist (${paymentCount}), skipped`);
    }
    console.log('\nSeed completed successfully!');
    console.log('--- Credentials ---');
    console.log(`Admin: ${env_1.env.seedAdmin.email} / ${env_1.env.seedAdmin.password}`);
    console.log('Customers: alice@example.com … evan@example.com / Customer@123');
    process.exit(0);
};
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
