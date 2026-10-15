import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anyRunning, itemSyncResultFromRuns } from './item-sync-runs';
import type { GoogleSyncRun } from '@/types';

const run = (fields: Partial<GoogleSyncRun>): GoogleSyncRun =>
  ({ id: 'r', job_type: 'item_import', period_key: '', status: 'completed', created_count: 0, updated_count: 0,
    skipped_count: 0, row_count: 0, created_at: '', updated_at: '', ...fields }) as GoogleSyncRun;

describe('itemSyncResultFromRuns', () => {
  it('adds the counts and reads the row errors of each shop', () => {
    const result = itemSyncResultFromRuns([
      run({ created_count: 2, updated_count: 5, skipped_count: 1,
        error_summary: JSON.stringify([{ sheet: 'Suit Dev', row: 4, code: 'S-1', error: 'Missing buying price' }]) }),
      run({ created_count: 1, updated_count: 3 }),
    ]);
    assert.equal(result.created, 3);
    assert.equal(result.updated, 8);
    assert.equal(result.skipped, 1);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].code, 'S-1');
  });

  it('turns the message of a failed run into one error', () => {
    const result = itemSyncResultFromRuns([
      run({ status: 'failed', sheet_name: 'Suit Dev', error_summary: 'the sync stopped when the server restarted' }),
    ]);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].error || '', /server restarted/);
  });

  it('knows when a run still works', () => {
    assert.equal(anyRunning([run({ status: 'completed' }), run({ status: 'running' })]), true);
    assert.equal(anyRunning([run({ status: 'failed' })]), false);
  });
});
