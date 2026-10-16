/**
 * The item sync runs in the background. Each Branch sheet gets a run, and the
 * run records its counts and row errors when it ends (entity.GoogleSyncRun).
 * This turns the finished runs back into the result the page shows.
 */
import type { GoogleSyncRun, ItemSyncResult, ItemSyncRowError } from '@/types';

/** True while any of the runs still works. */
export function anyRunning(runs: Array<Pick<GoogleSyncRun, 'status'>>): boolean {
  return runs.some((run) => run.status === 'running');
}

/**
 * The counts of the runs added up. A finished run keeps its row errors as a
 * JSON list; a failed run keeps one message, which becomes one error.
 */
export function itemSyncResultFromRuns(runs: GoogleSyncRun[]): ItemSyncResult {
  const result: ItemSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  for (const run of runs) {
    result.created += run.created_count || 0;
    result.updated += run.updated_count || 0;
    result.skipped += run.skipped_count || 0;
    const summary = (run.error_summary || '').trim();
    if (!summary) continue;
    try {
      const rows = JSON.parse(summary) as ItemSyncRowError[];
      if (Array.isArray(rows)) {
        result.errors.push(...rows);
        continue;
      }
    } catch {
      // Not a list: the message of a failed run.
    }
    result.errors.push({ sheet: run.sheet_name || undefined, error: summary } as ItemSyncRowError);
  }
  return result;
}
