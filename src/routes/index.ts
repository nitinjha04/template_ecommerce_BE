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

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Casaq API is running' });
});

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
