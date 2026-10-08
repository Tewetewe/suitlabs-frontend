'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, History, RefreshCcw, Search } from 'lucide-react';

import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/DataDisplay';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { formatCurrency } from '@/lib/currency';
import type {
  GoogleSyncRun,
  Item,
  LegacyImportPreview,
  LegacyImportResult,
  LegacyImportRow,
  LegacyItemNeed,
} from '@/types';

const JIMBARAN_ID = '8f1e2c90-6b3a-4d11-9f0a-000000000001';

type StateFilter = 'all' | LegacyImportRow['state'];

const STATE_BADGE: Record<LegacyImportRow['state'], { label: string; variant: 'success' | 'danger' | 'default' }> = {
  ready: { label: 'Ready', variant: 'success' },
  blocked: { label: 'Blocked', variant: 'danger' },
  imported: { label: 'Imported', variant: 'default' },
};

/** The Item choices live in this browser, one set per tab name. */
const choicesKey = (tab: string) => `legacyItemChoices:${tab.trim().toLowerCase()}`;

function loadChoices(tab: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(choicesKey(tab)) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Admin imports the bookings of the old Google Form tab ("Legacy Dev"), one
 * month at a time. Preview reads the tab and changes nothing; Sync writes the
 * ready rows. The sheet's Booking Date is the event day: pickup is the day
 * before, the return the day after.
 */
export default function LegacyBookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { allowedBranches } = useBranch();
  const { success, error: toastError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [branchId, setBranchId] = useState(JIMBARAN_ID);
  const [tab, setTab] = useState('Legacy Dev');
  const [month, setMonth] = useState(thisMonth());
  const [preview, setPreview] = useState<LegacyImportPreview | null>(null);
  const [result, setResult] = useState<LegacyImportResult | null>(null);
  const [filter, setFilter] = useState<StateFilter>('all');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [runs, setRuns] = useState<GoogleSyncRun[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});

  useEffect(() => {
    setChoices(loadChoices(tab));
  }, [tab]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadRuns = useCallback(async () => {
    try {
      setRuns(await apiClient.getGoogleSheetsRuns('legacy_booking_import', 10));
    } catch {
      setRuns([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadRuns();
  }, [isAdmin, loadRuns]);

  const request = (picked: Record<string, string>) => ({ branch_id: branchId, tab: tab.trim(), month, choices: picked });

  const onPreview = async (picked: Record<string, string> = choices) => {
    setLoading(true);
    setResult(null);
    try {
      setPreview(await apiClient.previewLegacyBookings(request(picked)));
    } catch (e) {
      toastError('Could not read the legacy tab', apiErrorMessage(e, 'Check the tab name and the shop spreadsheet.'));
    } finally {
      setLoading(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const outcome = await apiClient.syncLegacyBookings(request(choices));
      setResult(outcome);
      setPreview(outcome.preview);
      success('Legacy bookings synced', `${outcome.created} created${outcome.failed ? `, ${outcome.failed} failed` : ''}`);
      setConfirming(false);
      void loadRuns();
    } catch (e) {
      toastError('Sync failed', apiErrorMessage(e, 'Please try again.'));
    } finally {
      setSyncing(false);
    }
  };

  // A choice is saved at once and the preview runs again with it.
  const choose = (key: string, code: string | null) => {
    const next = { ...choices };
    if (code) next[key] = code;
    else delete next[key];
    setChoices(next);
    window.localStorage.setItem(choicesKey(tab), JSON.stringify(next));
    void onPreview(next);
  };

  const rows = useMemo(
    () => (preview?.rows || []).filter((row) => filter === 'all' || row.state === filter),
    [preview, filter],
  );

  if (!isAdmin) {
    return (
      <PageShell title="Legacy Bookings" subtitle="Admin only">
        <Card>
          <CardContent>
            <div className="text-sm text-slate-600">This page is only available to administrators.</div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Legacy Bookings"
      subtitle="Import the bookings of the old Google Form tab, one month at a time. Preview first: it changes nothing."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle size="lg">Google Sheets tab</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                searchable={false}
                label="Shop"
                options={allowedBranches.map((b) => ({ value: b.id, label: b.name }))}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              />
              <Input label="Tab name" value={tab} onChange={(e) => setTab(e.target.value)} />
              <Input
                label="Month of the event day"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500">
              The sheet&apos;s Booking Date is the event day: pickup is the day before and the return the day after. The
              Appointment Date is the day the customer booked. Add-ons, ties, and shoes go in the booking notes. A row
              whose suit matches no Item still imports, with no Item: pick the Item below first, or add it later with
              Edit on the booking. Revenue posts
              like a normal booking; the amount paid before the system goes to Opening Equity, so bank and cash balances
              do not change. No WhatsApp goes out and no deposit is taken. When a suit matches no Item, or several, pick the Item
              below; the choice covers every row with that product and size.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={loading} disabled={!tab.trim() || !month} onClick={() => void onPreview(choices)}>
                <Search className="h-4 w-4" />
                Preview
              </Button>
              <Button
                loading={syncing}
                disabled={!preview || preview.ready === 0 || syncing}
                onClick={() => setConfirming(true)}
              >
                <RefreshCcw className="h-4 w-4" />
                Sync {preview ? `${preview.ready} ready` : ''}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardContent>
              <div className="font-semibold text-emerald-900">
                Sync complete: {result.created} created{result.failed ? `, ${result.failed} failed` : ''}
              </div>
              {(result.errors || []).map((line) => (
                <div key={line} className="text-xs text-red-700">{line}</div>
              ))}
            </CardContent>
          </Card>
        )}

        {preview && preview.needs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle size="lg">Pick the Items ({preview.needs.length})</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                These products match no Item, or several. Pick one Item for each before Sync, so the booking gets its
                Item and blocks it on the calendar. Without a pick, the booking imports with no Item and Admin adds it
                later with Edit.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {preview.needs.map((need) => (
                <ItemNeedPicker key={need.key} need={need} chosen={choices[need.key]} busy={loading} onChoose={choose} />
              ))}
            </CardContent>
          </Card>
        )}

        {Object.keys(choices).length > 0 && (
          <div className="text-xs text-slate-500">
            {Object.keys(choices).length} Item choices saved in this browser for this tab.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setChoices({});
                window.localStorage.removeItem(choicesKey(tab));
              }}
            >
              Clear them
            </button>
          </div>
        )}

        {preview && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle size="lg">
                  {preview.tab} · {preview.month} · {preview.branch_name}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'ready', 'blocked', 'imported'] as StateFilter[]).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={filter === key ? 'primary' : 'secondary'}
                      onClick={() => setFilter(key)}
                    >
                      {key === 'all' ? `All ${preview.rows.length}` : `${STATE_BADGE[key].label} ${preview[key]}`}
                    </Button>
                  ))}
                </div>
              </div>
              {preview.without_item > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  {preview.without_item} rows import with no Item. Their bookings do not block a suit on the calendar
                  until Admin adds the Item with Edit.
                </p>
              )}
              {preview.other_months > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {preview.other_months} rows have an event day in another month and are not listed.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rows.map((row) => (
                  <LegacyRowCard key={row.row} row={row} />
                ))}
                {rows.length === 0 && <div className="text-sm text-slate-500">No rows for this filter.</div>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle size="lg">Recent syncs</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <History className="h-4 w-4" />
                No legacy sync yet.
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                {runs.map((run) => (
                  <div key={run.id} className="flex flex-wrap items-center gap-2">
                    <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'default'}>
                      {run.status}
                    </Badge>
                    <span className="text-slate-700">
                      {run.period_key} · {run.sheet_name} · {run.created_count} created, {run.skipped_count} blocked
                    </span>
                    <span className="text-xs text-slate-400">{new Date(run.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirming}
        title="Sync legacy bookings"
        description={
          preview
            ? `Write ${preview.ready} ready rows of ${preview.tab} (${preview.month}) as Bookings with their Rentals? Blocked rows are skipped. A second sync skips the rows already imported.`
            : undefined
        }
        confirmLabel="Sync"
        loading={syncing}
        onClose={() => setConfirming(false)}
        onConfirm={onSync}
      />
    </PageShell>
  );
}

function LegacyRowCard({ row }: { row: LegacyImportRow }) {
  const badge = STATE_BADGE[row.state];
  return (
    <div className="space-y-2 rounded-xl bg-white/50 px-3 py-3 ring-1 ring-black/5" data-testid="legacy-row">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Row {row.row}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="font-medium text-slate-900">{row.customer_name || '—'}</span>
        <span className="text-xs text-slate-500">{row.phone}</span>
        <Badge variant={row.customer_exists ? 'default' : 'info'}>
          {row.customer_exists ? 'Existing customer' : 'New customer'}
        </Badge>
        {row.without_item && row.state !== 'imported' && <Badge variant="warning">No Item</Badge>}
      </div>
      <div className="text-sm text-slate-600">
        Event {row.event_date || '?'} · pickup {row.pickup_date || '?'} · return {row.return_date || '?'}
        {row.ordered_date ? ` · booked on ${row.ordered_date}` : ''}
      </div>
      <div className="text-sm text-slate-600">
        {row.sheet_status} → booking {row.booking_status || '?'}, rental {row.rental_status || '?'} · {row.product} {row.size}
        {row.suit_detail ? ` · ${row.suit_detail}` : ''}
      </div>
      {row.lines.length > 0 && (
        <div className="space-y-0.5 text-xs text-slate-600">
          {row.lines.map((line, i) => (
            <div key={`${line.code}-${i}`}>
              <span className="font-mono">{line.code}</span> {line.name} · {formatCurrency(line.price)}
              <span className="text-slate-400"> ({line.from})</span>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-slate-600">
        Total {formatCurrency(row.total)} · paid {formatCurrency(row.paid)} · remaining {formatCurrency(row.remaining)}
        {row.payment_method ? ` · ${row.payment_method}` : ''}
      </div>
      {(row.problems || []).map((p) => (
        <div key={p} className="flex items-start gap-1 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {p}
        </div>
      ))}
      {(row.warnings || []).map((w) => (
        <div key={w} className="text-xs text-amber-700">{w}</div>
      ))}
    </div>
  );
}

const KIND_LABEL: Record<LegacyItemNeed['kind'], string> = { suit: 'Suit', trousers: 'Trousers', item: 'Item' };

/** One product that waits for an Item: the matches to pick from, or a search. */
function ItemNeedPicker({
  need,
  chosen,
  busy,
  onChoose,
}: {
  need: LegacyItemNeed;
  chosen?: string;
  busy: boolean;
  onChoose: (key: string, code: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const response = await apiClient.getItems({ search: query.trim(), all_branches: true, limit: 8 });
      setFound(response.data?.data?.items || []);
    } catch {
      setFound([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl bg-white/50 px-3 py-3 ring-1 ring-black/5" data-testid="legacy-need">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">{KIND_LABEL[need.kind]}</Badge>
        <span className="font-medium text-slate-900">{need.product}</span>
        {need.size && <span className="text-sm text-slate-600">size {need.size}</span>}
        <span className="text-xs text-slate-400">rows {(need.rows || []).join(', ')}</span>
        {chosen && <Badge variant="info">chosen {chosen} (not found)</Badge>}
      </div>
      {(need.candidates || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {need.candidates!.map((c) => (
            <Button key={c.code} size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(need.key, c.code)}>
              <span className="font-mono">{c.code}</span> {c.name} · {formatCurrency(c.price)}
            </Button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-9 min-w-[14rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          placeholder="Search an Item by code or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void search();
          }}
        />
        <Button size="sm" variant="secondary" loading={searching} onClick={() => void search()}>
          <Search className="h-3.5 w-3.5" />
          Search
        </Button>
        {chosen && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onChoose(need.key, null)}>
            Clear choice
          </Button>
        )}
      </div>
      {found.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {found.map((item) => (
            <Button key={item.id} size="sm" variant="ghost" disabled={busy} onClick={() => onChoose(need.key, item.code)}>
              <span className="font-mono">{item.code}</span> {item.name} {item.size?.label ? `· ${item.size.label}` : ''}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
