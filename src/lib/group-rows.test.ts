import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupRows } from './group-rows';

type Asset = { id: string; category: string; quantity: number; value: number };

const assets: Asset[] = [
  { id: 'a', category: 'furniture', quantity: 4, value: 400_000 },
  { id: 'b', category: 'equipment', quantity: 1, value: 2_000_000 },
  { id: 'c', category: 'furniture', quantity: 8, value: 800_000 },
  { id: 'd', category: '', quantity: 2, value: 50_000 },
];

const options = {
  keyOf: (row: Asset) => row.category,
  titleOf: (key: string) => key,
  unitsOf: (row: Asset) => row.quantity,
  valueOf: (row: Asset) => row.value,
};

describe('groupRows', () => {
  it('adds up the units and the value each group header shows', () => {
    const groups = groupRows(assets, options);
    const furniture = groups.find((g) => g.key === 'furniture');
    assert.equal(furniture?.rows.length, 2);
    assert.equal(furniture?.units, 12);
    assert.equal(furniture?.value, 1_200_000);
  });

  it('puts the heaviest group first, because that is the one opened first', () => {
    const groups = groupRows(assets, options);
    assert.deepEqual(groups.map((g) => g.key), ['equipment', 'furniture', 'other']);
  });

  it('files a row with no key under the fallback', () => {
    const groups = groupRows(assets, options);
    assert.equal(groups.find((g) => g.key === 'other')?.rows[0].id, 'd');
  });

  it('breaks a value tie on the title, so the order never wobbles', () => {
    const tied: Asset[] = [
      { id: 'x', category: 'zebra', quantity: 1, value: 100 },
      { id: 'y', category: 'alpha', quantity: 1, value: 100 },
    ];
    assert.deepEqual(groupRows(tied, options).map((g) => g.key), ['alpha', 'zebra']);
  });

  it('returns nothing for an empty list', () => {
    assert.deepEqual(groupRows([], options), []);
  });
});
