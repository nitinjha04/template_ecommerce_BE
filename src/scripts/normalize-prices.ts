/**
 * Sets every product price to a random whole number between 500 and 1000 (INR).
 *
 * Usage: npm run seed:normalize-prices
 */
import { connectDB } from '../config/db';
import { Product } from '../models';

const MIN_PRICE = 500;
const MAX_PRICE = 1000;

const randomPriceInRange = (): number =>
  Math.floor(Math.random() * (MAX_PRICE - MIN_PRICE + 1)) + MIN_PRICE;

const main = async (): Promise<void> => {
  await connectDB();

  const products = await Product.find({}, { _id: 1, name: 1, price: 1 }).lean();
  let updated = 0;

  for (const p of products) {
    const price = randomPriceInRange();
    await Product.updateOne({ _id: p._id }, { $set: { price } });
    updated += 1;
    console.log(`  ${p.name}: ${p.price} → ₹${price}`);
  }

  const [min, max, avg] = await Promise.all([
    Product.findOne().sort({ price: 1 }).select('price').lean(),
    Product.findOne().sort({ price: -1 }).select('price').lean(),
    Product.aggregate([{ $group: { _id: null, avg: { $avg: '$price' } } }]),
  ]);

  console.log(`\nUpdated ${updated} products`);
  console.log(`Range in DB: ₹${min?.price ?? 0} – ₹${max?.price ?? 0}`);
  console.log(`Average: ₹${Math.round(avg[0]?.avg ?? 0)}`);
  process.exit(0);
};

main().catch((err) => {
  console.error('Normalize prices failed:', err);
  process.exit(1);
});
