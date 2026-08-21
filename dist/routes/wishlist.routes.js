"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const wishlist_controller_1 = require("../controllers/wishlist.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', wishlist_controller_1.WishlistController.list);
router.post('/toggle', (0, validate_middleware_1.validate)([
    (0, express_validator_1.body)('productId').trim().notEmpty().withMessage('productId is required'),
]), wishlist_controller_1.WishlistController.toggle);
router.delete('/', wishlist_controller_1.WishlistController.clear);
exports.default = router;
