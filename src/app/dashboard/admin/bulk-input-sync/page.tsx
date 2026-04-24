'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

export default function BulkInputSyncPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const isAdmin = user?.role === 'admin';

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors?: Array<{ row?: number; code?: string; error?: string }>;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return; // DashboardLayout already redirects to login
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const canSubmit = useMemo(() => !!file && !submitting, [file, submitting]);

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected';
    const kb = Math.max(1, Math.round(file.size / 1024));
    return `${file.name} (${kb} KB)`;
  }, [file]);

  function downloadTemplateCSV() {
    const header =
      'code,barcode,name,description,type,gender,quality,brand,color,material,pattern,size_label,size,condition,quantity,standard_price,one_day_price,four_hour_price,purchase_price,thumbnail_url,tags,notes,category_id,category,category_name';
    const example =
      'SL-0001,,Classic Suit,Two-piece suit,suit,men,standard,SuitLabs,Black,Wool,Solid,L,,new,1,150000,60000,40000,900000,,formal;wedding,First batch,,Wedding,';
    const csv = `${header}\n${example}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onUpload() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const resp = await apiClient.syncItemsFromCSVUpload(file);
      setResult({
        created: resp.result.created,
        updated: resp.result.updated,
        skipped: resp.result.skipped,
        errors: (resp.result.errors as Array<{ row?: number; code?: string; error?: string }>) || [],
      });
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { error?: { message?: string } } }; message?: string })?.response?.data?.error?.message ||
        (e as { message?: string })?.message ||
        'Upload failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <DashboardLayout>
        <PageShell title="Bulk Input Sync" subtitle="Admin only">
          <Card>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-slate-600">
                  <Sheet className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Access denied</div>
                  <div className="text-sm text-slate-600">This page is only available to administrators.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell
        title="Bulk Item Import (CSV)"
        subtitle="Upload a CSV to create/update items (admin only)."
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle size="lg">Upload CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-slate-600">
                  Required columns: <span className="font-mono">code,name,type,gender,brand,color</span>. Optional: <span className="font-mono">category</span> / <span className="font-mono">category_name</span> to auto-create categories.
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Button variant="outline" onClick={downloadTemplateCSV}>
                    Download CSV template
                  </Button>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        Choose CSV file
                      </Button>
                      <div className="flex-1 rounded-xl bg-white/70 ring-1 ring-black/10 px-3 py-2 text-sm text-slate-700">
                        <div className="truncate">{fileLabel}</div>
                        <div className="text-xs text-slate-500">Tip: you can re-upload the same file after edits.</div>
                      </div>
                    </div>
                  </div>
                  <Button variant="primary" loading={submitting} disabled={!canSubmit} onClick={onUpload}>
                    Upload & Sync
                  </Button>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {result && (
                  <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-sm text-emerald-800 space-y-2">
                    <div className="font-semibold text-emerald-900">Sync complete</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <div>Created: <span className="font-semibold">{result.created}</span></div>
                      <div>Updated: <span className="font-semibold">{result.updated}</span></div>
                      <div>Skipped: <span className="font-semibold">{result.skipped}</span></div>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer select-none">Row errors ({result.errors.length})</summary>
                        <div className="mt-2 space-y-1 text-xs text-emerald-900/90">
                          {result.errors.slice(0, 50).map((er, idx) => (
                            <div key={idx} className="font-mono">
                              row={er.row ?? '?'} code={er.code ?? '-'} err={(er.error || '').slice(0, 220)}
                            </div>
                          ))}
                          {result.errors.length > 50 && (
                            <div className="text-emerald-900/70">Showing first 50 errors…</div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

