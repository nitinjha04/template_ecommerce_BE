/**
 * Rounded sale pricing for checkout/orders (must match FEV2 src/lib/display-pricing.ts).
 * e.g. ₹350 → ₹300, ₹499 → ₹400
 */

export const getRoundedSalePrice = (originalPrice: number): number => {
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) return 0;

  if (originalPrice < 150) {
    let sale = Math.floor(originalPrice / 50) * 50;
    if (sale >= originalPrice) sale -= 50;
    return Math.max(sale, 1);
  }

  let sale = Math.floor(originalPrice / 100) * 100;
  if (sale >= originalPrice) {
    sale -= 100;
  }
  return Math.max(sale, 100);
};

export const getLineSaleTotal = (
  catalogUnitPrice: number,
  quantity: number
): { unitSalePrice: number; lineTotal: number } => {
  const unitSalePrice = getRoundedSalePrice(catalogUnitPrice);
  return {
    unitSalePrice,
    lineTotal: unitSalePrice * quantity,
  };
};
