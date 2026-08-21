"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const product_routes_1 = __importDefault(require("./product.routes"));
const category_routes_1 = __importDefault(require("./category.routes"));
const order_routes_1 = __importDefault(require("./order.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const gatewayPayment_routes_1 = __importDefault(require("./gatewayPayment.routes"));
const contact_routes_1 = __importDefault(require("./contact.routes"));
const upload_routes_1 = __importDefault(require("./upload.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const pincode_routes_1 = __importDefault(require("./pincode.routes"));
const wishlist_routes_1 = __importDefault(require("./wishlist.routes"));
const cart_routes_1 = __importDefault(require("./cart.routes"));
const store_routes_1 = __importDefault(require("./store.routes"));
const store_middleware_1 = require("../middleware/store.middleware");
const payment_controller_1 = require("../controllers/payment.controller");
const serverIp_1 = require("../utils/serverIp");
const router = (0, express_1.Router)();
router.get('/health', async (_req, res) => {
    const localIpv4 = (0, serverIp_1.getLocalIpv4Addresses)();
    const publicIpv4 = await (0, serverIp_1.fetchPublicIpv4)();
    res.json({
        success: true,
        message: 'Casaq API is running',
        data: {
            localIpv4,
            /** Outbound IP — add this to PayPro / gateway verified IP lists. */
            publicIpv4: publicIpv4 ?? null,
        },
    });
});
/** Fully public — no store domain, no auth (deploy / config probe). */
router.get('/payments/methods', payment_controller_1.PaymentController.getAvailableMethods);
router.use('/stores', store_routes_1.default);
router.use(store_middleware_1.resolveStore);
router.use('/auth', auth_routes_1.default);
router.use('/products', product_routes_1.default);
router.use('/categories', category_routes_1.default);
router.use('/orders', order_routes_1.default);
router.use('/payments', payment_routes_1.default);
router.use('/gateway-payments', gatewayPayment_routes_1.default);
router.use('/contact', contact_routes_1.default);
router.use('/upload', upload_routes_1.default);
router.use('/dashboard', dashboard_routes_1.default);
router.use('/pincode', pincode_routes_1.default);
router.use('/wishlist', wishlist_routes_1.default);
router.use('/cart', cart_routes_1.default);
exports.default = router;
