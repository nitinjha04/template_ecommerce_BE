"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const adminList_validator_1 = require("../validators/adminList.validator");
const payment_validator_1 = require("../validators/payment.validator");
const router = (0, express_1.Router)();
// Public provider-aware payment creation (used by checkout/payment pages)
router.post('/create', (0, validate_middleware_1.validate)(payment_validator_1.createProviderPaymentValidator), payment_controller_1.PaymentController.createProviderPayment);
router.use(auth_middleware_1.authenticate);
router.get('/my', payment_controller_1.PaymentController.getMyPayments);
router.get('/', (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(adminList_validator_1.adminListQueryValidator), payment_controller_1.PaymentController.getAll);
router.get('/:id', (0, validate_middleware_1.validate)(payment_validator_1.paymentIdValidator), payment_controller_1.PaymentController.getById);
router.patch('/:id/status', (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(payment_validator_1.updatePaymentStatusValidator), payment_controller_1.PaymentController.updateStatus);
exports.default = router;
