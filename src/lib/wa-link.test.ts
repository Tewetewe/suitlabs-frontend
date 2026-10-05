import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { waChatLink } from './wa-link';

describe('waChatLink', () => {
  it('uses the international digits and fills in the text', () => {
    assert.equal(waChatLink('+62 812-3456-7890', 'Halo Sari'), 'https://wa.me/6281234567890?text=Halo%20Sari');
  });

  it('turns a local 0 number into 62', () => {
    assert.equal(waChatLink('081234567890', ''), 'https://wa.me/6281234567890');
  });

  it('keeps line breaks in the text', () => {
    assert.equal(waChatLink('6281', 'a\nb'), 'https://wa.me/6281?text=a%0Ab');
  });
});
