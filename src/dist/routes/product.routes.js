"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const product_validator_1 = require("../validators/product.validator");
const router = (0, express_1.Router)();
router.get('/', (0, validate_middleware_1.validate)(product_validator_1.productQueryValidator), product_controller_1.ProductController.getAll);
router.get('/:id', (0, validate_middleware_1.validate)(product_validator_1.productIdValidator), product_controller_1.ProductController.getById);
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(product_validator_1.createProductValidator), product_controller_1.ProductController.create);
router.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(product_validator_1.updateProductValidator), product_controller_1.ProductController.update);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)(product_validator_1.productIdValidator), product_controller_1.ProductController.remove);
exports.default = router;
//# sourceMappingURL=product.routes.js.map