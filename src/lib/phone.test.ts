import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countryOfTyped, joinPhone, splitPhone } from './phone';

describe('joinPhone', () => {
  it('keeps an Indonesian number as Staff typed it', () => {
    assert.equal(joinPhone('ID', '0812-3456-7890'), '0812-3456-7890');
  });

  it('adds the picked country code to a foreign number', () => {
    assert.equal(joinPhone('KR', '010-1234-5678'), '+821012345678');
    assert.equal(joinPhone('AU', '0412 345 678'), '+61412345678');
    assert.equal(joinPhone('SG', '9123 4567'), '+6591234567');
  });

  it('uses a typed code over the picked country', () => {
    assert.equal(joinPhone('ID', '+82 10-1234-5678'), '+821012345678');
    assert.equal(joinPhone('ID', '0086 138 1234 5678'), '+8613812345678');
  });

  it('turns a typed +62 back into the local form', () => {
    assert.equal(joinPhone('KR', '+62 812-3456-7890'), '081234567890');
    assert.equal(joinPhone('ID', '+62 0812 3456 7890'), '081234567890');
  });

  it('keeps a code that is not on the list', () => {
    assert.equal(joinPhone('OTHER', '+354 611 2345'), '+3546112345');
  });

  it('gives an empty value for an empty number', () => {
    assert.equal(joinPhone('KR', '  '), '');
    assert.equal(joinPhone('KR', '0'), '');
  });
});

describe('splitPhone', () => {
  it('reads a local number as Indonesian', () => {
    assert.deepEqual(splitPhone('0812-3456-7890'), { country: 'ID', local: '0812-3456-7890' });
    assert.deepEqual(splitPhone(''), { country: 'ID', local: '' });
  });

  it('finds the country of a stored foreign number', () => {
    assert.deepEqual(splitPhone('+821012345678'), { country: 'KR', local: '1012345678' });
    assert.deepEqual(splitPhone('+85291234567'), { country: 'HK', local: '91234567' });
    assert.deepEqual(splitPhone('+62 812 3456 7890'), { country: 'ID', local: '081234567890' });
  });

  it('round-trips through joinPhone', () => {
    for (const stored of ['+821012345678', '+61412345678', '+14155551234']) {
      const { country, local } = splitPhone(stored);
      assert.equal(joinPhone(country, local), stored);
    }
  });
});

describe('countryOfTyped', () => {
  it('follows the code while Staff type it', () => {
    assert.equal(countryOfTyped('+8'), 'OTHER');
    assert.equal(countryOfTyped('+82'), 'KR');
    assert.equal(countryOfTyped('+852 9'), 'HK');
  });
});
