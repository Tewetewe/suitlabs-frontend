'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/DataDisplay';
import apiClient from '@/lib/api';
import { waDeliveryLabel } from '@/lib/wa-delivery';
import type { WAMessageKind, WAMessageKindFilter, WAMessageLog } from '@/types';

const KIND_LABELS: Record<WAMessageKind, string> = {
  reminder_pickup: 'Pickup reminder',
  reminder_return: 'Return reminder',
  receipt_booking: 'Booking receipt',
  receipt_rental: 'Rental receipt',
  receipt_sale: 'Sale receipt',
  deposit_agreement: 'Deposit agreement',
  other: 'Other',
};

type Filter = { key: string; label: string; kind?: WAMessageKindFilter; status?: 'failed' };

const FILTERS: Filter[] = [
  { key: 'all', label: 'All' },
  { key: 'reminder', label: 'Reminders', kind: 'reminder' },
  { key: 'receipt', label: 'Receipts', kind: 'receipt' },
  { key: 'deposit_agreement', label: 'Agreements', kind: 'deposit_agreement' },
  { key: 'failed', label: 'Failed', status: 'failed' },
];

/** Every WhatsApp message the system gave to Wablas, newest first. */
export function WAMessageList() {
  const [filter, setFilter] = useState<Filter>(FILTERS[0]);
  const [messages, setMessages] = useState<WAMessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (current: Filter) => {
    setLoading(true);
    setError(null);
    try {
      setMessages(await apiClient.getWAMessages({ kind: current.kind, status: current.status, limit: 100 }));
    } catch (e: unknown) {
      const value = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(value?.response?.data?.error || value?.response?.data?.message || value?.message || 'Failed to load');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle size="lg">All WhatsApp messages</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={option.key === filter.key ? 'primary' : 'secondary'}
                onClick={() => setFilter(option)}
              >
                {option.label}
              </Button>
            ))}
            <Button size="sm" variant="secondary" loading={loading} onClick={() => void load(filter)} aria-label="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {!loading && messages.length === 0 ? (
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <MessageCircle className="mt-0.5 h-5 w-5 text-slate-400" />
            <div>No WhatsApp messages for this filter yet.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((row) => {
              const delivery = waDeliveryLabel(row.delivery_status);
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl ring-1 ring-black/5 bg-white/50 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{KIND_LABELS[row.kind] ?? row.kind}</span>
                      <Badge variant={row.status === 'sent' ? 'success' : 'danger'}>
                        {row.status === 'sent' ? 'Queued at Wablas' : 'Send failed'}
                      </Badge>
                      {delivery && <Badge variant={delivery.variant}>{delivery.label}</Badge>}
                    </div>
                    <div className="text-sm text-slate-600">
                      {row.recipient_name ? `${row.recipient_name} · ` : ''}
                      {row.phone}
                    </div>
                    {row.error_summary && <div className="text-xs text-red-700">{row.error_summary}</div>}
                    {delivery?.queued && row.delivery_note && (
                      <div className="text-xs text-amber-700">{row.delivery_note}</div>
                    )}
                    {row.image_url && (
                      <a
                        href={row.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-700 underline"
                      >
                        Open image
                      </a>
                    )}
                    {row.message && (
                      <pre className="whitespace-pre-wrap text-xs text-slate-500 max-h-24 overflow-auto">{row.message}</pre>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
