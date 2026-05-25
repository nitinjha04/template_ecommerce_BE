import mongoose from 'mongoose';
import { env } from './env';
import { CategoryService } from '../services/category.service';

export const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongodbUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  await CategoryService.ensureDefaults();
};
