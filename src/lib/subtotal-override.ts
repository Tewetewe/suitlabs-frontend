/** A cart line as priced from the catalogue. */
export interface PricedLine {
  quantity: number;
  unit_price: number;
}

/**
 * The unit prices that bring the cart to `target`, for items that are not in
 * the catalogue yet (accessories). The extra goes on one main line: the
 * largest single-quantity line, or else the largest line. A target at or
 * below the catalogue subtotal changes nothing: Discount takes money off.
 */
export function unitPricesForSubtotal(lines: PricedLine[], target: number): number[] {
  const prices = lines.map((line) => line.unit_price);
  const catalogue = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const extra = target - catalogue;
  if (lines.length === 0 || !(extra > 0)) return prices;

  let main = 0;
  lines.forEach((line, index) => {
    const best = lines[main];
    const single = line.quantity === 1;
    const bestSingle = best.quantity === 1;
    if (single !== bestSingle) {
      if (single) main = index;
      return;
    }
    if (line.quantity * line.unit_price > best.quantity * best.unit_price) main = index;
  });
  const quantity = Math.max(1, lines[main].quantity);
  prices[main] = Math.round((prices[main] + extra / quantity) * 100) / 100;
  return prices;
}
