"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const order_validator_1 = require("../validators/order.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', (0, validate_middleware_1.validate)(order_validator_1.createOrderValidator), order_controller_1.OrderController.create);
router.get('/my', order_controller_1.OrderController.getMyOrders);
router.get('/', (0, auth_middleware_1.authorize)('admin'), order_controller_1.OrderController.getAll);
router.get('/:id', (0, validate_middleware_1.validate)(order_validator_1.orderIdValidator), order_controller_1.OrderController.getById);
router.patch('/:id/status', (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(order_validator_1.updateOrderStatusValidator), order_controller_1.OrderController.updateStatus);
exports.default = router;
//# sourceMappingURL=order.routes.js.map