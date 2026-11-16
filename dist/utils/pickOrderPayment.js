"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupPaymentsByOrder = exports.pickBestPaymentForOrder = void 0;
/** Prefer a completed payment over a newer pending retry for the same order. */
const pickBestPaymentForOrder = (payments) => {
    if (!payments.length)
        return undefined;
    const sorted = [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const completed = sorted.find((p) => p.status === 'Completed');
    return completed ?? sorted[0];
};
exports.pickBestPaymentForOrder = pickBestPaymentForOrder;
const groupPaymentsByOrder = (payments) => {
    const map = new Map();
    for (const p of payments) {
        const key = String(p.order);
        const list = map.get(key) ?? [];
        list.push(p);
        map.set(key, list);
    }
    return map;
};
exports.groupPaymentsByOrder = groupPaymentsByOrder;
