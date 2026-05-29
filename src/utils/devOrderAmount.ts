import { env } from '../config/env';

/** True when NODE_ENV is development (default). */
export const isDevelopment = (): boolean => env.nodeEnv === 'development';

/**
 * In development, force checkout/gateway amounts to a small test value (default ₹1).
 * Set DEV_FORCE_ORDER_AMOUNT=false to disable without changing NODE_ENV.
 */
export const shouldApplyDevTestOrderAmount = (): boolean =>
  isDevelopment() && process.env.DEV_FORCE_ORDER_AMOUNT !== 'false';

/** Amount charged in dev when override is active (default 1 rupee). */
export const getDevTestOrderAmount = (): number => {
  const fromEnv = Number(process.env.DEV_TEST_ORDER_AMOUNT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1;
};

export const applyDevTestOrderTotal = (calculatedTotal: number): number => {
  if (!shouldApplyDevTestOrderAmount()) return calculatedTotal;
  return getDevTestOrderAmount();
};
