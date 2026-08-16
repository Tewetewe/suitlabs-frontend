'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Branch } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import {
  ALL_BRANCHES_ID,
  persistBranchScope,
  readStoredBranchId,
  readStoredWriteBranchId,
} from '@/lib/branch-scope';

interface BranchContextType {
  branches: Branch[];
  allowedBranches: Branch[];
  currentBranch: Branch | null;
  currentBranchId: string | null;
  viewingAll: boolean;
  writeBranchId: string | null;
  loading: boolean;
  setCurrentBranchId: (id: string | null) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchIdState] = useState<string | null>(null);
  const [writeBranchId, setWriteBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  const allowedBranches = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return branches.filter((branch) => branch.is_active) || branches;
    const ids = new Set((user.branches || []).map((branch) => branch.id));
    if (ids.size === 0) return [];
    return branches.filter((branch) => ids.has(branch.id));
  }, [branches, isAdmin, user]);

  const applySelection = useCallback((branchId: string | null, writeId?: string | null) => {
    setCurrentBranchIdState(branchId);
    const nextWrite = writeId !== undefined ? writeId : writeBranchId;
    const stored = branchId ?? ALL_BRANCHES_ID;
    persistBranchScope(stored, nextWrite ?? undefined);
    if (writeId !== undefined) {
      setWriteBranchId(writeId);
    }
  }, [writeBranchId]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setBranches([]);
      setCurrentBranchIdState(null);
      setWriteBranchId(null);
      setLoading(false);
      return;
    }

    const stored = readStoredBranchId();
    const storedWrite = readStoredWriteBranchId();
    if (stored === ALL_BRANCHES_ID) {
      setCurrentBranchIdState(null);
    } else if (stored) {
      setCurrentBranchIdState(stored);
    }
    if (storedWrite) {
      setWriteBranchId(storedWrite);
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const rows = await apiClient.getBranches();
        if (cancelled) return;
        setBranches(rows);
        const membership = user.role === 'admin'
          ? rows.filter((branch) => branch.is_active)
          : rows.filter((branch) => (user.branches || []).some((mine) => mine.id === branch.id));
        const latestStored = readStoredBranchId();
        const latestWrite = readStoredWriteBranchId();
        const allowedIds = new Set(membership.map((branch) => branch.id));
        const fallback = membership[0]?.id ?? null;

        if (user.role === 'admin' && latestStored === ALL_BRANCHES_ID) {
          applySelection(null, latestWrite && allowedIds.has(latestWrite) ? latestWrite : fallback);
          return;
        }
        if (user.role !== 'admin' && latestStored === ALL_BRANCHES_ID) {
          applySelection(fallback, fallback);
          return;
        }
        if (latestStored && latestStored !== ALL_BRANCHES_ID && allowedIds.has(latestStored)) {
          applySelection(latestStored, latestStored);
          return;
        }
        if (membership.length === 1) {
          applySelection(membership[0].id, membership[0].id);
          return;
        }
        applySelection(fallback, fallback);
      } catch (error) {
        console.error('Failed to load branches:', error);
        const fromUser = user.branches || [];
        if (!cancelled) {
          setBranches(fromUser);
          const latestStored = readStoredBranchId();
          const match = fromUser.find((branch) => branch.id === latestStored);
          if (latestStored && latestStored !== ALL_BRANCHES_ID && (user.role === 'admin' || match)) {
            applySelection(match?.id ?? latestStored, match?.id ?? latestStored);
            return;
          }
          applySelection(match?.id ?? fromUser[0]?.id ?? null, match?.id ?? fromUser[0]?.id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, user?.role]);

  const setCurrentBranchId = useCallback((id: string | null) => {
    if (id === null) {
      if (!isAdmin) {
        applySelection(allowedBranches[0]?.id ?? null, allowedBranches[0]?.id ?? null);
        return;
      }
      applySelection(null, writeBranchId ?? allowedBranches[0]?.id ?? null);
      return;
    }
    if (!isAdmin && !allowedBranches.some((branch) => branch.id === id)) {
      applySelection(allowedBranches[0]?.id ?? null, allowedBranches[0]?.id ?? null);
      return;
    }
    applySelection(id, id);
  }, [allowedBranches, applySelection, isAdmin, writeBranchId]);

  const currentBranch = allowedBranches.find((branch) => branch.id === currentBranchId)
    ?? branches.find((branch) => branch.id === currentBranchId)
    ?? null;

  const value: BranchContextType = {
    branches,
    allowedBranches,
    currentBranch,
    currentBranchId,
    viewingAll: isAdmin && currentBranchId === null,
    writeBranchId,
    loading,
    setCurrentBranchId,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
