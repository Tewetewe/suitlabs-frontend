'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send } from 'lucide-react';

import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api';
import type { WAReminder, WAReminderRunResult, WAReminderStatusInfo } from '@/types';

function statusVariant(status: WAReminder['status']): 'success' | 'danger' | 'warning' | 'default' | 'info' {
  switch (status) {
    case 'sent':
      return 'success';
    case 'failed':
      return 'danger';
    case 'skipped':
      return 'warning';
    case 'pending':
      return 'info';
    default:
      return 'default';
  }
}

export default function WARemindersPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [status, setStatus] = useState<WAReminderStatusInfo | null>(null);
  const [reminders, setReminders] = useState<WAReminder[]>([]);
  const [lastRun, setLastRun] = useState<WAReminderRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, rows] = await Promise.all([
        apiClient.getWAReminderStatus(),
        apiClient.getWAReminders(40),
      ]);
      setStatus(st);
      setReminders(rows);
    } catch (e: unknown) {
      const value = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(value?.response?.data?.error || value?.response?.data?.message || value?.message || 'Failed to load');
      setStatus(null);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    void refresh();
  }, [isAdmin, refresh]);

  async function onSendNow() {
    setSending(true);
    setError(null);
    try {
      const result = await apiClient.sendWARemindersNow();
      setLastRun(result);
      success(
        'Reminders finished',
        `Pickup ${result.pickup_sent} · Return ${result.return_sent} · Skipped ${result.skipped} · Failed ${result.failed}`,
      );
      await refresh();
    } catch (e: unknown) {
      const value = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const msg = value?.response?.data?.error || value?.response?.data?.message || value?.message || 'Send failed';
      setError(msg);
      toastError('Could not send WhatsApp reminders', msg);
    } finally {
      setSending(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <PageShell title="WA Reminders" subtitle="Admin only">
        <Card>
          <CardContent>
            <div className="font-semibold text-slate-900">Access denied</div>
            <div className="text-sm text-slate-600">This page is only available to administrators.</div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="WhatsApp Reminders"
      subtitle="Pickup and return reminders via Wablas. Auto-sends at 10:00 (shop timezone), gradually between messages."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle size="lg">Wablas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-slate-900">
                  {status?.configured ? 'Connected' : 'Not configured'}
                </div>
                <div className="text-sm text-slate-600">
                  {status?.configured
                    ? `${status.company_name} · ${status.timezone} · batches of ${status.batch_size}, max ${status.max_per_run} per run · paced by ${status.paced_by}${status.send_delay_sec > 0 ? ` (${status.send_delay_sec}s)` : ''} · language from customer (EN fallback)`
                    : 'Set WABLAS_TOKEN (and optional WABLAS_SECRET_KEY) on the backend, then restart.'}
                </div>
              </div>
              <Button
                variant="primary"
                loading={sending}
                disabled={!status?.configured || sending}
                onClick={() => void onSendNow()}
                data-testid="wa-reminders-send"
              >
                <Send className="h-4 w-4" />
                Send today&apos;s reminders
              </Button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {lastRun && (
              <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-sm text-emerald-800">
                Last manual run ({lastRun.reminder_date}): pickup {lastRun.pickup_sent}, return {lastRun.return_sent},
                skipped {lastRun.skipped}, failed {lastRun.failed}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle size="lg">Recent sends</CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <MessageCircle className="mt-0.5 h-5 w-5 text-slate-400" />
                <div>No reminder attempts yet. Pending pickups and returns for today will appear after auto or manual send.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 rounded-xl ring-1 ring-black/5 bg-white/50 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900 capitalize">{row.reminder_type}</span>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        <Badge variant="default">{row.language.toUpperCase()}</Badge>
                        <span className="text-xs text-slate-500">{row.trigger}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {row.reminder_date} · {row.phone || 'no phone'}
                      </div>
                      {row.error_summary && (
                        <div className="text-xs text-amber-700">{row.error_summary}</div>
                      )}
                      {row.message && (
                        <pre className="whitespace-pre-wrap text-xs text-slate-500 max-h-24 overflow-auto">{row.message}</pre>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-slate-400">
                      {row.sent_at ? new Date(row.sent_at).toLocaleString() : new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
