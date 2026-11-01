import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { currencyDraft } from './currency';

describe('currencyDraft', () => {
  it('keeps the digits in the order they were typed', () => {
    assert.equal(currencyDraft('125'), '125');
    assert.equal(currencyDraft('1250000'), '1250000');
  });

  it('drops the dots, spaces and letters a keyboard or a paste brings', () => {
    assert.equal(currencyDraft('1.250.000'), '1250000');
    assert.equal(currencyDraft('Rp 75 000'), '75000');
  });

  it('drops a leading zero but keeps a single zero', () => {
    assert.equal(currencyDraft('0005'), '5');
    assert.equal(currencyDraft('0'), '0');
    assert.equal(currencyDraft(''), '');
  });
});
