import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultBranch } from './branch-scope';

describe('defaultBranch', () => {
  it('opens Jimbaran first, whatever the order of the list', () => {
    const rows = [
      { id: 'b-2', code: 'nusadua' },
      { id: 'b-1', code: 'jimbaran' },
    ];
    assert.equal(defaultBranch(rows)?.id, 'b-1');
  });

  it('reads the code without case or spaces', () => {
    assert.equal(defaultBranch([{ id: 'b-9', code: 'x' }, { id: 'b-1', code: ' Jimbaran ' }])?.id, 'b-1');
  });

  it('falls back to the first shop without Jimbaran, and to nothing without shops', () => {
    assert.equal(defaultBranch([{ id: 'b-2', code: 'nusadua' }, { id: 'b-3', code: 'ubud' }])?.id, 'b-2');
    assert.equal(defaultBranch([]), undefined);
  });
});
