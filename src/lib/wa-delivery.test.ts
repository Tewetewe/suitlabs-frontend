import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { waDeliveryLabel } from './wa-delivery';

describe('waDeliveryLabel', () => {
  it('shows nothing before a status arrives', () => {
    assert.equal(waDeliveryLabel(undefined), null);
    assert.equal(waDeliveryLabel(''), null);
  });

  it('marks a message that waits in the Wablas queue', () => {
    const label = waDeliveryLabel('new');
    assert.equal(label?.queued, true);
    assert.equal(label?.failed, false);
  });

  it('marks cancel and rejected as not delivered', () => {
    assert.equal(waDeliveryLabel('cancel')?.failed, true);
    assert.equal(waDeliveryLabel('Rejected')?.failed, true);
  });

  it('marks read as a delivery that worked', () => {
    assert.deepEqual(waDeliveryLabel('read'), { label: 'Read', variant: 'success', failed: false, queued: false });
  });
});
