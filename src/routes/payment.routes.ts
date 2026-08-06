import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminListQueryValidator } from '../validators/adminList.validator';
import {
  createProviderPaymentValidator,
  paymentIdValidator,
  updatePaymentStatusValidator,
  verifyRazorpayValidator,
} from '../validators/payment.validator';

const router = Router();

// Public provider-aware payment creation (used by checkout/payment pages)
router.get('/methods', PaymentController.getAvailableMethods);

router.post(
  '/create',
  validate(createProviderPaymentValidator),
  PaymentController.createProviderPayment
);

router.post(
  '/razorpay/verify',
  validate(verifyRazorpayValidator),
  PaymentController.verifyRazorpay
);

router.post('/razorpay/webhook', PaymentController.razorpayWebhook);

router.use(authenticate);

router.get('/my', PaymentController.getMyPayments);
router.get(
  '/',
  authorize('admin'),
  validate(adminListQueryValidator),
  PaymentController.getAll
);
router.get('/:id', validate(paymentIdValidator), PaymentController.getById);
router.patch(
  '/:id/status',
  authorize('admin'),
  validate(updatePaymentStatusValidator),
  PaymentController.updateStatus
);

export default router;
