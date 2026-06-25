import { connectDB } from '../../config/db';
import {
  NEXA_STORE_DOMAIN,
  NEXA_STORE_NAME,
  NEXA_STORE_SLUG,
} from './constants';
import { Store } from '../../models/Store.model';

export const ensureNexaStore = async (): Promise<string> => {
  await connectDB();

  let store = await Store.findOne({
    $or: [
      { domain: NEXA_STORE_DOMAIN },
      { domain: 'nexa-skyline.vercel.app' },
      { slug: NEXA_STORE_SLUG },
    ],
  }).exec();

  if (!store) {
    store = await Store.create({
      name: NEXA_STORE_NAME,
      slug: NEXA_STORE_SLUG,
      domain: NEXA_STORE_DOMAIN,
      isActive: true,
    });
    console.log(`Created store ${NEXA_STORE_NAME} (${NEXA_STORE_DOMAIN}) id=${store._id}`);
  }

  return String(store._id);
};
