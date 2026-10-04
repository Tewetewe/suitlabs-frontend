import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { receiptTotals } from './receipt-totals';

const view = (lines: ReturnType<typeof receiptTotals>) => lines.map((l) => `${l.label}=${l.amount}${l.kind === 'total' ? '!' : ''}`);

describe('receiptTotals', () => {
  it('puts the fee under the subtotal and makes the paid amount the bold total', () => {
    assert.deepEqual(view(receiptTotals({ subtotal: 600_000, fee: 1_800, paid: 600_000, owed: 600_000 })), [
      'Subtotal=600000',
      'Transaction fee=1800',
      'TOTAL PAID=601800!',
    ]);
  });

  it('shows the discount, and no fee line without a fee', () => {
    assert.deepEqual(view(receiptTotals({ subtotal: 600_000, discount: 50_000, paid: 550_000, owed: 550_000 })), [
      'Subtotal=600000',
      'Discount=50000',
      'TOTAL PAID=550000!',
    ]);
  });

  it('shows what is still owed after a DP, and never a Due line', () => {
    const lines = receiptTotals({ subtotal: 600_000, fee: 900, paid: 300_000, owed: 600_000 });
    assert.deepEqual(view(lines), ['Subtotal=600000', 'Transaction fee=900', 'TOTAL PAID=300900!', 'Remaining=300000']);
    assert.ok(!lines.some((l) => l.label.startsWith('Due')));
  });
});
