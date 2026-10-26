"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomPriceInRange = exports.scaleQuotasToLimit = exports.quotasToRecord = exports.totalQuotaCount = exports.buildPriceQuotas = exports.ALL_PRICE_TIERS = void 0;
/**
 * Catalog price tiers and per-tier product counts.
 *
 * - ₹100–₹500 (excluding ₹400): 200 products split evenly across active tiers in range
 * - ₹400: 15 products
 * - ₹600–₹7000: 15 products each
 */
exports.ALL_PRICE_TIERS = [
    100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 4000, 5000, 6000,
    7000,
];
const LOW_TIERS_EXCEPT_400 = [100, 200, 300, 500];
const LOW_POOL_TOTAL = 200;
const TIER_400_COUNT = 15;
const HIGH_TIER_COUNT = 15;
/** Build tier → count for a desired [min, max] price range (e.g. tops 100–200). */
const buildPriceQuotas = (priceMin, priceMax) => {
    const quotas = new Map();
    const inRange = (tier) => tier >= priceMin && tier <= priceMax;
    const lowEligible = LOW_TIERS_EXCEPT_400.filter(inRange);
    if (lowEligible.length > 0) {
        const base = Math.floor(LOW_POOL_TOTAL / lowEligible.length);
        let remainder = LOW_POOL_TOTAL - base * lowEligible.length;
        for (const tier of lowEligible) {
            const extra = remainder > 0 ? 1 : 0;
            if (extra)
                remainder -= 1;
            quotas.set(tier, base + extra);
        }
    }
    if (inRange(400)) {
        quotas.set(400, TIER_400_COUNT);
    }
    for (const tier of exports.ALL_PRICE_TIERS) {
        if (tier > 500 && inRange(tier)) {
            quotas.set(tier, HIGH_TIER_COUNT);
        }
    }
    return quotas;
};
exports.buildPriceQuotas = buildPriceQuotas;
const totalQuotaCount = (quotas) => {
    let sum = 0;
    for (const n of quotas.values())
        sum += n;
    return sum;
};
exports.totalQuotaCount = totalQuotaCount;
const quotasToRecord = (quotas) => {
    const out = {};
    const sorted = [...quotas.keys()].sort((a, b) => a - b);
    for (const tier of sorted) {
        out[String(tier)] = quotas.get(tier) ?? 0;
    }
    return out;
};
exports.quotasToRecord = quotasToRecord;
/** Cap total products while keeping tier mix proportional (e.g. 200 → 50 → 25+25). */
const scaleQuotasToLimit = (quotas, limit) => {
    const total = (0, exports.totalQuotaCount)(quotas);
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error('--limit must be a positive number');
    }
    if (limit >= total)
        return new Map(quotas);
    const tiers = [...quotas.keys()].sort((a, b) => a - b);
    const scaled = new Map();
    let assigned = 0;
    for (const tier of tiers) {
        const original = quotas.get(tier) ?? 0;
        const count = Math.floor((original / total) * limit);
        scaled.set(tier, count);
        assigned += count;
    }
    let remainder = limit - assigned;
    for (const tier of tiers) {
        if (remainder <= 0)
            break;
        scaled.set(tier, (scaled.get(tier) ?? 0) + 1);
        remainder -= 1;
    }
    return scaled;
};
exports.scaleQuotasToLimit = scaleQuotasToLimit;
/** Random integer price in [min, max] (inclusive), e.g. 100–200 → 134, 156, 100. */
const randomPriceInRange = (min, max) => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
};
exports.randomPriceInRange = randomPriceInRange;
