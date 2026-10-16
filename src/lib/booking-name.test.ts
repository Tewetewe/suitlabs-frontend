import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { partyName } from './booking-name';

describe('partyName', () => {
  const alex = { first_name: 'Alex', last_name: '' };
  it('shows the name of the legacy row on a shared Customer', () => {
    assert.equal(partyName({ legacy_ref: 'legacy:abc', full_name: 'Alexander' }, alex), 'Alexander');
  });
  it('shows the Customer for a booking made in the app', () => {
    assert.equal(partyName({ full_name: 'Someone' }, alex), 'Alex');
    assert.equal(partyName(null, alex), 'Alex');
    assert.equal(partyName(null, null), '');
  });
});
