'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import apiClient from '@/lib/api';
import type { GoogleSyncRun } from '@/types';

/** How often the card asks for the run while it is running. */
const POLL_MS = 3000;

function errorMessage(error: unknown): string {
  const value = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || 'Rebuild failed';
}

// A rebuild run counts tabs in created_count, rows written in row_count, and
// rows removed in updated_count (entity.GoogleSyncJobBookingTabRebuild).
function runCounts(run: GoogleSyncRun): string {
  return `${run.created_count} tabs · ${run.row_count} rows written · ${run.updated_count} rows removed`;
}

// RebuildBookingTabsCard writes every monthly booking tab of each shop's sheet
// again from the app. It fixes rows written before the event-day dates: old
// dates, and a booking filed under its Pickup month. Rows typed by hand, with
// no Booking ID, stay as they are. The rebuild runs in the background, so the
// page may close; the card follows the newest run.
export function RebuildBookingTabsCard({ disabled }: { disabled?: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeUnknown, setRemoveUnknown] = useState(false);
  const [starting, setStarting] = useState(false);
  const [run, setRun] = useState<GoogleSyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const running = run?.status === 'running';

  const loadRun = useCallback(async () => {
    try {
      setRun(await apiClient.getGoogleSheetsBookingTabRebuild());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  // Follow a running rebuild until it ends.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => void loadRun(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [running, loadRun]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      setRun(await apiClient.startGoogleSheetsBookingTabRebuild(removeUnknown));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setStarting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle size="lg">Rebuild booking tabs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Writes every monthly booking tab again from the app: &quot;Booking Date&quot; is the event day and
            &quot;Appointment Date&quot; is the day the booking was made. A booking filed under its Pickup month moves
            to its event month. Rows typed by hand, with no Booking ID, stay as they are.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={removeUnknown}
              onChange={(e) => setRemoveUnknown(e.target.checked)}
              disabled={running || starting}
              data-testid="rebuild-remove-unknown"
            />
            <span>
              Also remove rows whose Booking ID matches no booking in the app, such as a booking deleted long ago.
              Those rows exist nowhere else.
            </span>
          </label>
          <Button
            variant="primary"
            onClick={() => setConfirmOpen(true)}
            disabled={disabled || running || starting}
            loading={running || starting}
            data-testid="rebuild-booking-tabs"
          >
            <RefreshCcw className="h-4 w-4" />
            {running ? 'Rebuilding…' : 'Rebuild booking tabs'}
          </Button>
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-red-700 ring-1 ring-red-200">{error}</div>
          )}
          {run && running && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-black/5" data-testid="rebuild-status">
              Rebuilding since {new Date(run.started_at || run.created_at).toLocaleTimeString()}. You can leave this
              page; the rebuild goes on.
            </div>
          )}
          {run && run.status === 'completed' && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-emerald-200" data-testid="rebuild-status">
              <div className="font-semibold text-emerald-900">Last rebuild complete</div>
              <div>
                {runCounts(run)}
                {run.finished_at ? ` · ${new Date(run.finished_at).toLocaleString()}` : ''}
              </div>
            </div>
          )}
          {run && run.status === 'failed' && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-red-700 ring-1 ring-red-200" data-testid="rebuild-status">
              <div className="font-semibold">Last rebuild stopped</div>
              <div>{runCounts(run)}</div>
              {run.error_summary && <div className="mt-1">{run.error_summary}</div>}
              <div className="mt-1">Run it again to finish. A second run only writes the same values again.</div>
            </div>
          )}
        </div>
      </CardContent>
      <ConfirmModal
        isOpen={confirmOpen}
        title="Rebuild booking tabs?"
        confirmLabel="Rebuild"
        variant="danger"
        loading={starting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={start}
        description={
          <div className="space-y-2 text-sm text-slate-600">
            <p>This writes to every shop&apos;s live Google Sheet. Make a copy of each spreadsheet in Google Drive first.</p>
            <p>
              {removeUnknown
                ? 'Rows of bookings that no longer exist in the app are removed too.'
                : 'Rows of bookings that no longer exist in the app stay.'}
            </p>
            <p>It runs in the background and may take a few minutes.</p>
          </div>
        }
      />
    </Card>
  );
}
