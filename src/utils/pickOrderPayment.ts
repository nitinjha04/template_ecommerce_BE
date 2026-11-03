import type { IPayment } from '../models/Payment.model';

/** Prefer a completed payment over a newer pending retry for the same order. */
export const pickBestPaymentForOrder = (
  payments: IPayment[]
): IPayment | undefined => {
  if (!payments.length) return undefined;

  const sorted = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const completed = sorted.find((p) => p.status === 'Completed');
  return completed ?? sorted[0];
};

export const groupPaymentsByOrder = (
  payments: IPayment[]
): Map<string, IPayment[]> => {
  const map = new Map<string, IPayment[]>();
  for (const p of payments) {
    const key = String(p.order);
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  return map;
};
