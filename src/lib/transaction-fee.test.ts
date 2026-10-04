import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TransactionFeeRule } from '@/types';
import { feeMethodOf, formatFeeRate, isQrisMethod, pickFeeRule, transactionFee } from './transaction-fee';

describe('isQrisMethod', () => {
  it('knows the sale method and both booking methods, in any case', () => {
    assert.equal(isQrisMethod('qris'), true);
    assert.equal(isQrisMethod('dp_qris'), true);
    assert.equal(isQrisMethod('full_qris'), true);
    assert.equal(isQrisMethod(' QRIS '), true);
  });

  it('rejects every other method and an empty one', () => {
    assert.equal(isQrisMethod('cash'), false);
    assert.equal(isQrisMethod('full_transfer'), false);
    assert.equal(isQrisMethod(''), false);
    assert.equal(isQrisMethod(null), false);
    assert.equal(isQrisMethod(undefined), false);
  });
});

describe('feeMethodOf', () => {
  it('reads card and QRIS from sale and booking methods', () => {
    assert.equal(feeMethodOf('cc'), 'cc');
    assert.equal(feeMethodOf('dp_cc'), 'cc');
    assert.equal(feeMethodOf('FULL_DEBIT'), 'debit');
    assert.equal(feeMethodOf('full_qris'), 'qris');
    assert.equal(feeMethodOf('full_cash'), '');
    assert.equal(feeMethodOf('transfer'), '');
  });
});

describe('transactionFee with the default QRIS rule', () => {
  it('charges nothing on cash, transfer, or a card with no rule', () => {
    assert.equal(transactionFee(1_000_000, 'cash'), 0);
    assert.equal(transactionFee(1_000_000, 'full_debit'), 0);
  });

  it('charges nothing at exactly Rp 500.000', () => {
    assert.equal(transactionFee(500_000, 'qris'), 0);
  });

  it('rounds the fee up once the payment passes the threshold', () => {
    assert.equal(transactionFee(500_001, 'qris'), 1501);
  });

  it('gives exactly 0.3% on a round amount', () => {
    assert.equal(transactionFee(600_000, 'qris'), 1800);
    assert.equal(transactionFee(600_000, 'dp_qris'), 1800);
    assert.equal(transactionFee(600_000, 'FULL_QRIS'), 1800);
  });

  it('rounds the amount to whole rupiah first', () => {
    assert.equal(transactionFee(500_000.4, 'qris'), 0);
    assert.equal(transactionFee(500_000.5, 'qris'), 1501);
    assert.equal(transactionFee(599_999.6, 'qris'), 1800);
  });
});

const rules: TransactionFeeRule[] = [
  { id: 'qris', method: 'qris', terminal: '', label: 'QRIS', rate_bps: 30, min_amount: 500_000, active: true, sort_order: 0 },
  { id: 'bni-debit', method: 'debit', terminal: 'bni', label: 'BNI EDC · BNI debit', rate_bps: 15, min_amount: 0, active: true, sort_order: 1 },
  { id: 'bni-cc', method: 'cc', terminal: 'bni', label: 'BNI EDC · Credit card', rate_bps: 200, min_amount: 0, active: true, sort_order: 2 },
  { id: 'bca-cc', method: 'cc', terminal: 'bca', label: 'BCA EDC · Credit card', rate_bps: 180, min_amount: 0, active: true, sort_order: 3 },
  { id: 'bca-debit', method: 'debit', terminal: 'bca', label: 'BCA EDC · BCA debit', rate_bps: 10, min_amount: 0, active: false, sort_order: 4 },
];

describe('transactionFee with card rules', () => {
  it('uses the only active debit rule without a choice', () => {
    assert.equal(transactionFee(1_000_000, 'full_debit', rules), 1500);
    assert.equal(transactionFee(333_333, 'debit', rules), 500);
  });

  it('waits for a terminal when two card rules are active', () => {
    assert.deepEqual(pickFeeRule(rules, 'cc'), { rule: null, needsChoice: true });
    assert.equal(transactionFee(1_000_000, 'cc', rules), 0);
  });

  it('charges the chosen terminal rate', () => {
    assert.equal(transactionFee(1_000_000, 'dp_cc', rules, 'bni-cc'), 20000);
    assert.equal(transactionFee(1_000_000, 'cc', rules, 'bca-cc'), 18000);
  });

  it('ignores a choice for another method, so a stale pick never charges', () => {
    assert.equal(pickFeeRule(rules, 'cc', 'bni-debit').needsChoice, true);
    assert.equal(transactionFee(1_000_000, 'cash', rules, 'bni-cc'), 0);
  });
});

describe('formatFeeRate', () => {
  it('shows basis points as a short percentage', () => {
    assert.equal(formatFeeRate(30), '0.3%');
    assert.equal(formatFeeRate(15), '0.15%');
    assert.equal(formatFeeRate(200), '2%');
  });
});

describe('fee rules follow the Pot', () => {
  it('keeps only the BNI rule when the card went into BNI', () => {
    assert.deepEqual(
      pickFeeRule(rules, 'cc', '', 'bni').rule?.id,
      'bni-cc',
    );
    assert.equal(transactionFee(1_000_000, 'cc', rules, '', 'bca'), 18000);
  });

  it('keeps the QRIS rule for either bank', () => {
    assert.equal(transactionFee(600_000, 'qris', rules, '', 'bni'), 1800);
  });
});
