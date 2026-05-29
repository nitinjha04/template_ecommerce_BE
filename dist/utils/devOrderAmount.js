"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDevTestOrderTotal = exports.getDevTestOrderAmount = exports.shouldApplyDevTestOrderAmount = exports.isDevelopment = void 0;
const env_1 = require("../config/env");
/** True when NODE_ENV is development (default). */
const isDevelopment = () => env_1.env.nodeEnv === 'development';
exports.isDevelopment = isDevelopment;
/**
 * In development, force checkout/gateway amounts to a small test value (default ₹1).
 * Set DEV_FORCE_ORDER_AMOUNT=false to disable without changing NODE_ENV.
 */
const shouldApplyDevTestOrderAmount = () => (0, exports.isDevelopment)() && process.env.DEV_FORCE_ORDER_AMOUNT !== 'false';
exports.shouldApplyDevTestOrderAmount = shouldApplyDevTestOrderAmount;
/** Amount charged in dev when override is active (default 1 rupee). */
const getDevTestOrderAmount = () => {
    const fromEnv = Number(process.env.DEV_TEST_ORDER_AMOUNT);
    return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1;
};
exports.getDevTestOrderAmount = getDevTestOrderAmount;
const applyDevTestOrderTotal = (calculatedTotal) => {
    if (!(0, exports.shouldApplyDevTestOrderAmount)())
        return calculatedTotal;
    return (0, exports.getDevTestOrderAmount)();
};
exports.applyDevTestOrderTotal = applyDevTestOrderTotal;
