"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gatewayPayment_controller_1 = require("../controllers/gatewayPayment.controller");
const router = (0, express_1.Router)();
// Public endpoints by design:
// - create: called by frontend to get redirect URL (never exposes private key)
// - webhook: called by gateway; must respond with plain "success"
// - verify: can be used by frontend for status polling when webhook is delayed
router.post('/create', gatewayPayment_controller_1.GatewayPaymentController.create);
router.post('/webhook', gatewayPayment_controller_1.GatewayPaymentController.webhook);
router.get('/verify/:merchantOrderNo', gatewayPayment_controller_1.GatewayPaymentController.verify);
exports.default = router;
