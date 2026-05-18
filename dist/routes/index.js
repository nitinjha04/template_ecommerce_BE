"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const product_routes_1 = __importDefault(require("./product.routes"));
const order_routes_1 = __importDefault(require("./order.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const contact_routes_1 = __importDefault(require("./contact.routes"));
const upload_routes_1 = __importDefault(require("./upload.routes"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({ success: true, message: 'Lucidus API is running' });
});
router.use('/auth', auth_routes_1.default);
router.use('/products', product_routes_1.default);
router.use('/orders', order_routes_1.default);
router.use('/payments', payment_routes_1.default);
router.use('/contact', contact_routes_1.default);
router.use('/upload', upload_routes_1.default);
exports.default = router;
