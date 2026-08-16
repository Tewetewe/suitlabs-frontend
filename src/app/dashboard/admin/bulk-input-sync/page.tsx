'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, RefreshCcw, Sheet } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import apiClient from '@/lib/api';
import type { GoogleSheetsStatus, GoogleSyncRun, ItemSyncResult } from '@/types';

export default function BulkInputSyncPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { currentBranch, viewingAll } = useBranch();

  const isAdmin = user?.role === 'admin';

  const [sheetSyncing, setSheetSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ItemSyncResult | null>(null);
  const [sheetStatus, setSheetStatus] = useState<GoogleSheetsStatus | null>(null);
  const [sheetRuns, setSheetRuns] = useState<GoogleSyncRun[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return; // DashboardLayout already redirects to login
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      apiClient.getGoogleSheetsStatus(),
      apiClient.getGoogleSheetsRuns('item_import', viewingAll ? 20 : 1),
    ])
      .then(([status, runs]) => {
        setSheetStatus(status);
        setSheetRuns(runs);
      })
      .catch(() => {
        setSheetStatus(null);
        setSheetRuns([]);
      });
  }, [isAdmin, currentBranch?.id, viewingAll]);

  async function onSheetSync(branchId?: string) {
    setSheetSyncing(branchId || 'all');
    setError(null);
    setResult(null);
    try {
      const response = await apiClient.syncItemsFromGoogleSheets(branchId);
      setResult(response.result);
      setSheetRuns((prev) => [response.run, ...prev.filter((run) => run.id !== response.run.id)]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Google Sheets sync failed'));
    } finally {
      setSheetSyncing(null);
    }
  }

  const lastSheetRun = sheetRuns[0] || null;
  const shopSheets = sheetStatus?.branches || [];

  function getErrorMessage(errorValue: unknown, fallback: string) {
    const value = errorValue as { response?: { data?: { error?: string; message?: string } }; message?: string };
    return value?.response?.data?.error || value?.response?.data?.message || value?.message || fallback;
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
        title="Item Data Sync"
        subtitle={
          viewingAll
            ? 'All shops. Sync one spreadsheet, or all of them together.'
            : `Synchronize ${currentBranch?.name || 'this shop'}'s inventory with its Google Sheet.`
        }
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle size="lg">Google Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {viewingAll ? (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-900">
                          {sheetStatus?.configured ? 'Connected' : 'Not configured'}
                        </div>
                        <div className="text-sm text-slate-600">
                          Each shop has its own spreadsheet. Sync one row, or all shops at once.
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        loading={sheetSyncing === 'all'}
                        disabled={!sheetStatus?.configured || !!sheetSyncing}
                        onClick={() => onSheetSync()}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Sync all shops
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {shopSheets.map((shop) => {
                        const run = sheetRuns.find((row) => row.branch_id === shop.branch_id);
                        return (
                          <div key={shop.branch_id} className="flex flex-col gap-2 rounded-xl ring-1 ring-black/5 bg-white/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900">{shop.branch_name}</div>
                              <div className="text-xs text-slate-500">
                                {shop.configured ? 'Google Sheet configured' : 'No spreadsheet yet — set it on Branches'}
                                {run ? ` · Last run: ${run.status}` : ''}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {shop.spreadsheet_url && (
                                <a href={shop.spreadsheet_url} target="_blank" rel="noreferrer">
                                  <Button variant="outline" size="sm">
                                    <ExternalLink className="h-4 w-4" />
                                    Open sheet
                                  </Button>
                                </a>
                              )}
                              <Button
                                size="sm"
                                loading={sheetSyncing === shop.branch_id}
                                disabled={!shop.configured || !!sheetSyncing}
                                onClick={() => onSheetSync(shop.branch_id)}
                              >
                                <RefreshCcw className="h-4 w-4" />
                                Sync
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-900">
                      {sheetStatus?.configured ? 'Connected' : 'Not configured'}
                    </div>
                    <div className="text-sm text-slate-600">
                      {sheetStatus?.configured
                        ? `${currentBranch?.name || sheetStatus.branch_name || 'This shop'} · Suit: ${sheetStatus.suit_range} · Accessories: ${sheetStatus.accessory_range}`
                        : 'Set this shop\'s Google Sheet on Admin → Branches. Share it with the service account as Editor.'}
                    </div>
                    {lastSheetRun && (
                      <div className="mt-1 text-xs text-slate-500">
                        Last run: {lastSheetRun.status} · {new Date(lastSheetRun.created_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sheetStatus?.spreadsheet_url && (
                      <a href={sheetStatus.spreadsheet_url} target="_blank" rel="noreferrer">
                        <Button variant="outline">
                          <ExternalLink className="h-4 w-4" />
                          Open sheet
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="primary"
                      loading={!!sheetSyncing}
                      disabled={!sheetStatus?.configured || !!sheetSyncing}
                      onClick={() => onSheetSync()}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Sync items now
                    </Button>
                  </div>
                </div>
                )}

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
                              sheet={er.sheet ?? '-'} row={er.row ?? '?'} code={er.code ?? '-'} err={(er.error || '').slice(0, 220)}
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

