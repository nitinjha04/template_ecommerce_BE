"use strict";
/**
 * Rounded sale pricing for checkout/orders (must match FEV2 src/lib/display-pricing.ts).
 * e.g. ₹350 → ₹300, ₹499 → ₹400
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLineSaleTotal = exports.getRoundedSalePrice = void 0;
const getRoundedSalePrice = (originalPrice) => {
    if (!Number.isFinite(originalPrice) || originalPrice <= 0)
        return 0;
    if (originalPrice < 150) {
        let sale = Math.floor(originalPrice / 50) * 50;
        if (sale >= originalPrice)
            sale -= 50;
        return Math.max(sale, 1);
    }
    let sale = Math.floor(originalPrice / 100) * 100;
    if (sale >= originalPrice) {
        sale -= 100;
    }
    return Math.max(sale, 100);
};
exports.getRoundedSalePrice = getRoundedSalePrice;
const getLineSaleTotal = (catalogUnitPrice, quantity) => {
    const unitSalePrice = (0, exports.getRoundedSalePrice)(catalogUnitPrice);
    return {
        unitSalePrice,
        lineTotal: unitSalePrice * quantity,
    };
};
exports.getLineSaleTotal = getLineSaleTotal;
