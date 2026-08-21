'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { DepositAgreementView } from '@/types';
import { Button } from '@/components/ui/Button';

export default function DepositAgreementPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const [view, setView] = useState<DepositAgreementView | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getPublicDepositAgreement(token);
      setView(data);
    } catch {
      setError('Agreement not found or no longer available.');
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError('');
    try {
      const data = await apiClient.acceptPublicDepositAgreement(token);
      setView(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the agreement.');
    } finally {
      setAccepting(false);
    }
  };

  const isEN = view?.language === 'en';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <header className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">SuitLabs</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isEN ? 'Security Deposit Agreement' : 'Perjanjian Jaminan'}
          </h1>
        </header>

        {loading && <p className="text-center text-sm text-slate-500">{isEN ? 'Loading…' : 'Memuat…'}</p>}
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        {view && !loading && (
          <div className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">{view.company_name}{view.branch_name ? ` · ${view.branch_name}` : ''}</p>
              <p className="text-lg font-semibold text-slate-900">{view.customer_name}</p>
              <p className="text-sm text-slate-600">
                {formatDateShort(view.rental_date)} – {formatDateShort(view.return_date)}
              </p>
              {view.branch_address && (
                <p className="pt-1 text-xs text-slate-500">
                  {isEN ? 'Pickup and return at' : 'Pengambilan dan pengembalian di'}: {view.branch_address}
                </p>
              )}
              {view.branch_phone && (
                <p className="text-xs text-slate-500">
                  {isEN ? 'Shop phone' : 'Telepon toko'}: {view.branch_phone}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isEN ? 'Security deposit' : 'Jaminan (Security Deposit)'}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {formatCurrency(view.deposit_amount)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {view.deposit_percent}% {isEN ? 'of the rental' : 'dari nilai sewa'} ({formatCurrency(view.booking_amount)}) · {isEN ? 'refundable' : 'dapat dikembalikan'}
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">
                {isEN ? 'Replacement fee per item' : 'Biaya penggantian per barang'}
              </h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {view.items.map((item) => (
                  <li key={item.item_id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</p>
                      {item.code && <p className="font-mono text-xs text-slate-500">{item.code}</p>}
                    </div>
                    <p className="shrink-0 tabular-nums text-slate-700">{formatCurrency(item.replacement_fee)}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3 text-sm leading-relaxed text-slate-700">
              <p>{view.deposit_clause}</p>
              <p>{view.replacement_clause}</p>
              <p>{view.release_clause}</p>
            </section>

            {view.accepted ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {isEN
                  ? 'Accepted. Your rental may be collected at the shop.'
                  : 'Telah disetujui. Sewaan Anda dapat diambil di toko.'}
                {view.accepted_at && (
                  <span className="mt-1 block text-xs opacity-80">{formatDateShort(view.accepted_at)}</span>
                )}
              </div>
            ) : (
              <Button className="w-full" loading={accepting} onClick={handleAccept}>
                {isEN ? 'I have read and accept' : 'Saya telah membaca dan menyetujui'}
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
