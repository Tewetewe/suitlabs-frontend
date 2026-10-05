'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/DataDisplay';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { copyText, waChatLink } from '@/lib/wa-link';
import type { WAReminderDraft } from '@/types';

/**
 * Today's pickup and return reminders as text. When Wablas does not send,
 * Staff copy each one into WhatsApp on the shop phone and mark it sent.
 */
export function WAReminderDrafts() {
  const { success, error: toastError } = useToast();
  const [drafts, setDrafts] = useState<WAReminderDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDrafts(await apiClient.getWAReminderDrafts());
    } catch (e) {
      toastError("Could not load today's reminders", apiErrorMessage(e, 'Please try again.'));
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCopy = async (draft: WAReminderDraft) => {
    if (await copyText(draft.message)) {
      success('Message copied', `Paste it in WhatsApp to ${draft.customer_name}.`);
    } else {
      toastError('Could not copy', 'Select the text and copy it by hand.');
    }
  };

  const onMarkSent = async (draft: WAReminderDraft) => {
    setMarking(draft.rental_id);
    try {
      await apiClient.markWAReminderSentByHand(draft.rental_id);
      success('Marked as sent', `${draft.customer_name} · ${draft.type} reminder`);
      await load();
    } catch (e) {
      toastError('Could not mark the reminder', apiErrorMessage(e, 'Please try again.'));
    } finally {
      setMarking(null);
    }
  };

  const toSend = drafts.filter((d) => !d.skip_reason && !d.sent_today).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle size="lg">Today&apos;s reminders</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              If Wablas does not send, copy each message to WhatsApp on the shop phone, then tap <b>Mark sent</b>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && <Badge variant={toSend > 0 ? 'warning' : 'success'}>{toSend} to send</Badge>}
            <Button size="sm" variant="secondary" loading={loading} onClick={() => void load()} aria-label="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!loading && drafts.length === 0 ? (
          <div className="text-sm text-slate-600">No pickups or returns today.</div>
        ) : (
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={`${draft.rental_id}:${draft.type}`}
                className="space-y-2 rounded-xl ring-1 ring-black/5 bg-white/50 px-3 py-3"
                data-testid="wa-reminder-draft"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{draft.customer_name}</span>
                  <Badge variant="default">{draft.type === 'pickup' ? 'Pickup' : 'Return'}</Badge>
                  {draft.sent_today && (
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      Sent today
                    </Badge>
                  )}
                  {draft.skip_reason && <Badge variant="danger">No reminder: {draft.skip_reason}</Badge>}
                  <span className="text-xs text-slate-500">
                    {[draft.invoice_number, draft.phone].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {draft.message && (
                  <>
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                      {draft.message}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void onCopy(draft)}>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                      <a href={waChatLink(draft.phone, draft.message)} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="secondary">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open WhatsApp
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant={draft.sent_today ? 'ghost' : 'primary'}
                        loading={marking === draft.rental_id}
                        onClick={() => void onMarkSent(draft)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {draft.sent_today ? 'Mark sent again' : 'Mark sent'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
