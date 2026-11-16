"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const adminList_validator_1 = require("../validators/adminList.validator");
const payment_validator_1 = require("../validators/payment.validator");
const router = (0, express_1.Router)();
// GET /methods is registered on the root router (before store/auth).
// Keep a fallback here as well for reverse-proxies that only mount /payments.
router.get('/methods', payment_controller_1.PaymentController.getAvailableMethods);
// Public provider-aware payment creation (used by checkout/payment pages)
router.post('/create', (0, validate_middleware_1.validate)(payment_validator_1.createProviderPaymentValidator), payment_controller_1.PaymentController.createProviderPayment);
router.post('/razorpay/verify', (0, validate_middleware_1.validate)(payment_validator_1.verifyRazorpayValidator), payment_controller_1.PaymentController.verifyRazorpay);
router.post('/razorpay/webhook', payment_controller_1.PaymentController.razorpayWebhook);
router.post('/cashfree/verify', (0, validate_middleware_1.validate)(payment_validator_1.verifyCashfreeValidator), payment_controller_1.PaymentController.verifyCashfree);
router.post('/cashfree/webhook', payment_controller_1.PaymentController.cashfreeWebhook);
router.post('/payu/verify', (0, validate_middleware_1.validate)(payment_validator_1.verifyPayuValidator), payment_controller_1.PaymentController.verifyPayu);
/** PayU hosted checkout return (POST from PayU; also accept GET). */
router.post('/payu/return', payment_controller_1.PaymentController.payuReturn);
router.get('/payu/return', payment_controller_1.PaymentController.payuReturn);
/** PayU webhook / IPN — server-to-server (no browser redirect). */
router.post('/payu/webhook', payment_controller_1.PaymentController.payuWebhook);
router.get('/payu/webhook', payment_controller_1.PaymentController.payuWebhook);
router.use(auth_middleware_1.authenticate);
router.get('/my', payment_controller_1.PaymentController.getMyPayments);
router.get('/', (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(adminList_validator_1.adminListQueryValidator), payment_controller_1.PaymentController.getAll);
router.get('/:id', (0, validate_middleware_1.validate)(payment_validator_1.paymentIdValidator), payment_controller_1.PaymentController.getById);
router.patch('/:id/status', (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(payment_validator_1.updatePaymentStatusValidator), payment_controller_1.PaymentController.updateStatus);
exports.default = router;
