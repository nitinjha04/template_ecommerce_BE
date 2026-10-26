import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import gatewayPaymentRoutes from './gatewayPayment.routes';
import contactRoutes from './contact.routes';
import uploadRoutes from './upload.routes';
import dashboardRoutes from './dashboard.routes';
import pincodeRoutes from './pincode.routes';
import wishlistRoutes from './wishlist.routes';
import cartRoutes from './cart.routes';
import storeRoutes from './store.routes';
import { resolveStore } from '../middleware/store.middleware';
import { PaymentController } from '../controllers/payment.controller';
import {
  fetchPublicIpv4,
  getLocalIpv4Addresses,
} from '../utils/serverIp';

const router = Router();

router.get('/health', async (_req, res) => {
  const localIpv4 = getLocalIpv4Addresses();
  const publicIpv4 = await fetchPublicIpv4();
  res.json({
    success: true,
    message: 'Casaq API is running',
    data: {
      localIpv4,
      /** Outbound IP — add this to PayPro / gateway verified IP lists. */
      publicIpv4: publicIpv4 ?? null,
    },
  });
});

/** Fully public — no store domain, no auth (deploy / config probe). */
router.get('/payments/methods', PaymentController.getAvailableMethods);

router.use('/stores', storeRoutes);

router.use(resolveStore);

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/gateway-payments', gatewayPaymentRoutes);
router.use('/contact', contactRoutes);
router.use('/upload', uploadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/pincode', pincodeRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/cart', cartRoutes);

export default router;
