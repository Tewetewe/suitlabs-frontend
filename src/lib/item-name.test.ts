import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customerItemName, itemGenderTag, itemTags, itemTierTag } from './item-name';

describe('customerItemName', () => {
  // name, brand, type, gender, quality, want
  const cases: Array<[string, string, string, string, string, string]> = [
    ['Black L - Goldy', 'Goldy', 'suit', 'men', 'premium', 'Black L - Mens Premium Suit'],
    ['Black L- Goldy (Double Breasted)', 'Goldy', 'suit', 'men', 'premium', 'Black L- Mens Premium Suit (Double Breasted)'],
    ['Black L - Mubeng (Double Breasted)', 'Mubeng', 'jacket', 'men', 'standard', 'Black L - Mens Standard Jacket (Double Breasted)'],
    ['Black L - Goldy Trousers', 'Goldy', 'trousers', 'men', 'premium', 'Black L - Mens Premium Trousers'],
    ['Black 9th - parayu', 'Parayu', 'suit', 'kids', 'standard', 'Black 9th - Kids Standard Suit'],
    ['Black 01', 'Suitlabs', 'suit', 'men', 'premium', 'Black 01 - Mens Premium Suit'],
    ['Mens Suit Navy', 'Suitlabs', 'suit', 'men', 'standard', 'Mens Suit Navy - Standard'],
    // Acc tab Items: the type only, no gender or tier.
    ['Vest', 'Goldy', 'vest', 'unisex', 'standard', 'Vest'],
    ['Parayu kids', '', 'shirt', 'kids', 'standard', 'Parayu kids - Shirt'],
    ['Bow Tie - Goldy', 'Goldy', 'tie', 'men', 'premium', 'Bow Tie'],
    ['Kupu-Kupu - Goldy', 'Goldy', 'tie', 'men', 'premium', 'Kupu-Kupu - Tie'],
    ['Tuxedo Shirt', '', 'shirt', 'unisex', 'standard', 'Tuxedo Shirt'],
    ['Klip Dasi', 'SuitLabs', 'accessory', 'unisex', 'standard', 'Klip Dasi'],
    ['Black Vest - Goldy', 'Goldy', 'vest', 'men', 'premium', 'Black Vest'],
    ['Parayu Shirt Kids', 'Parayu', 'shirt', 'kids', 'standard', 'Shirt Kids'],
    ['Goldyline Black', 'Goldy', 'suit', 'men', 'premium', 'Goldyline Black - Mens Premium Suit'],
  ];
  for (const [name, brand, type, gender, quality, want] of cases) {
    it(`prints "${name}" (${brand}, ${type} ${gender} ${quality}) as "${want}"`, () => {
      assert.equal(customerItemName({ name, brand, type, gender, quality }), want);
    });
  }
});

describe('itemGenderTag', () => {
  it('shows the gender of a Suit tab Item', () => {
    assert.equal(itemGenderTag({ type: 'trousers', gender: 'kids' }), 'Kids');
  });
  it('shows nothing for Unisex or an Acc tab Item', () => {
    assert.equal(itemGenderTag({ type: 'suit', gender: 'unisex' }), '');
    assert.equal(itemGenderTag({ type: 'shirt', gender: 'kids' }), '');
  });
});

describe('itemTierTag', () => {
  it('shows the tier of a Suit tab Item', () => {
    assert.equal(itemTierTag({ type: 'jacket', quality: 'premium' }), 'Premium');
  });
  it('shows nothing for an Acc tab Item', () => {
    assert.equal(itemTierTag({ type: 'vest', quality: 'standard' }), '');
  });
});

describe('itemTags', () => {
  it('lists the gender, then the tier of a Suit tab Item', () => {
    assert.deepEqual(itemTags({ type: 'suit', gender: 'kids', quality: 'premium' }), ['Kids', 'Premium']);
  });
  it('shows no Unisex', () => {
    assert.deepEqual(itemTags({ type: 'suit', gender: 'unisex', quality: 'standard' }), ['Standard']);
  });
  it('shows nothing on an Acc tab Item for now', () => {
    assert.deepEqual(itemTags({ type: 'shirt', gender: 'kids', quality: 'standard' }), []);
    assert.deepEqual(itemTags(null), []);
  });
});
