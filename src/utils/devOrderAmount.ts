import { env } from '../config/env';

/** True when NODE_ENV is development (default). */
export const isDevelopment = (): boolean => env.nodeEnv === 'development';

const parseForceFlag = (): 'on' | 'off' | 'unset' => {
  const raw = (process.env.DEV_FORCE_ORDER_AMOUNT ?? '').trim().toLowerCase();
  if (!raw) return 'unset';
  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') return 'off';
  if (raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes') return 'on';
  return 'unset';
};

/**
 * When true, gateway / checkout charge is reduced (default ₹1).
 *
 * Active when:
 * - NODE_ENV=development (default), OR
 * - DEV_FORCE_ORDER_AMOUNT=true (any environment), OR
 * - DEV_TEST_ORDER_AMOUNT is set to a positive number (any environment, including production)
 *
 * Disable with DEV_FORCE_ORDER_AMOUNT=false.
 *
 * ⚠ On production, remove DEV_TEST_ORDER_AMOUNT after testing or every payment is test-priced.
 */
export const shouldApplyDevTestOrderAmount = (): boolean => {
  const force = parseForceFlag();
  if (force === 'off') return false;
  if (force === 'on') return true;

  const testRaw = (process.env.DEV_TEST_ORDER_AMOUNT ?? '').trim();
  if (testRaw !== '') {
    const n = Number(testRaw);
    if (Number.isFinite(n) && n > 0) return true;
  }

  return isDevelopment();
};

/** Amount charged when override is active (default ₹1). */
export const getDevTestOrderAmount = (): number => {
  const fromEnv = Number((process.env.DEV_TEST_ORDER_AMOUNT ?? '').trim());
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1;
};

export const applyDevTestOrderTotal = (calculatedTotal: number): number => {
  if (!shouldApplyDevTestOrderAmount()) return calculatedTotal;
  return getDevTestOrderAmount();
};
