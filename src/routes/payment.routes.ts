import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminListQueryValidator } from '../validators/adminList.validator';
import {
  createProviderPaymentValidator,
  paymentIdValidator,
  updatePaymentStatusValidator,
  verifyCashfreeValidator,
  verifyPayuValidator,
  verifyRazorpayValidator,
} from '../validators/payment.validator';

const router = Router();

// GET /methods is registered on the root router (before store/auth).
// Keep a fallback here as well for reverse-proxies that only mount /payments.
router.get('/methods', PaymentController.getAvailableMethods);

// Public provider-aware payment creation (used by checkout/payment pages)
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

router.post(
  '/cashfree/verify',
  validate(verifyCashfreeValidator),
  PaymentController.verifyCashfree
);

router.post('/cashfree/webhook', PaymentController.cashfreeWebhook);

router.post(
  '/payu/verify',
  validate(verifyPayuValidator),
  PaymentController.verifyPayu
);

/** PayU hosted checkout return (POST from PayU; also accept GET). */
router.post('/payu/return', PaymentController.payuReturn);
router.get('/payu/return', PaymentController.payuReturn);

/** PayU webhook / IPN — server-to-server (no browser redirect). */
router.post('/payu/webhook', PaymentController.payuWebhook);
router.get('/payu/webhook', PaymentController.payuWebhook);

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
