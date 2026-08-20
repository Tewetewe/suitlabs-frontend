'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { PaymentProof, PaymentProofKind } from '@/types';

const KIND_LABEL: Record<PaymentProofKind, string> = {
  booking_payment: 'Booking payment',
  deposit: 'Security deposit',
  deposit_refund: 'Deposit refund',
};

function resolveHref(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
    return `${apiBase}${url}`;
  }
  return url;
}

function isPdf(url: string): boolean {
  return url.toLowerCase().split('?')[0].endsWith('.pdf');
}

interface ProofListProps {
  owner: 'booking' | 'rental';
  ownerId: string;
  title?: string;
}

// ProofList shows every receipt kept for a Booking or a Rental. Proof is
// optional, so an empty list is normal and says so.
export function ProofList({ owner, ownerId, title = 'Payment proofs' }: ProofListProps) {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const rows =
        owner === 'booking'
          ? await apiClient.getBookingPaymentProofs(ownerId)
          : await apiClient.getRentalPaymentProofs(ownerId);
      setProofs(rows);
    } catch (err) {
      console.warn('Could not load payment proofs', err);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [owner, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-xs text-slate-500">Loading payment proofs…</p>;
  }

  if (proofs.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">No proof attached. Proof is optional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <ul className="space-y-2">
        {proofs.map((proof) => (
          <li key={proof.id} className="rounded-2xl border border-slate-200 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-800">{KIND_LABEL[proof.kind] || proof.kind}</span>
              <span>
                {typeof proof.amount === 'number' ? formatCurrency(proof.amount) : ''}
                {proof.method ? ` · ${proof.method}` : ''}
              </span>
            </div>
            <div className="mt-2">
              {isPdf(proof.file_url) ? (
                <a
                  href={resolveHref(proof.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-sky-700"
                >
                  <FileText className="h-4 w-4" /> Open the PDF receipt
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <a href={resolveHref(proof.file_url)} target="_blank" rel="noreferrer">
                  <SafeImage
                    src={proof.file_url}
                    alt={`${KIND_LABEL[proof.kind] || proof.kind} receipt`}
                    width={280}
                    height={160}
                    className="max-h-40 w-auto rounded-xl object-contain"
                    fallback={<p className="text-xs text-slate-500">Could not load the receipt</p>}
                  />
                </a>
              )}
            </div>
            {proof.note && <p className="mt-1 text-xs text-slate-500">{proof.note}</p>}
            <p className="mt-1 text-xs text-slate-400">{proof.uploaded_at?.slice(0, 10)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProofList;
