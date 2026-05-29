import { Router } from 'express';
import { GatewayPaymentController } from '../controllers/gatewayPayment.controller';

const router = Router();

// Public endpoints by design:
// - create: called by frontend to get redirect URL (never exposes private key)
// - webhook: called by gateway; must respond with plain "success"
// - verify: can be used by frontend for status polling when webhook is delayed
router.post('/create', GatewayPaymentController.create);
router.post('/webhook', GatewayPaymentController.webhook);
router.get('/verify/:merchantOrderNo', GatewayPaymentController.verify);

export default router;

