'use client';

import React, { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { apiClient } from '@/lib/api';
import { persistBranchScope, readStoredBranchId, ALL_BRANCHES_ID } from '@/lib/branch-scope';

function applyUserBranchStorage(user: User | null) {
  if (!user) return;
  const assigned = user.branches || [];
  const allowed = new Set(assigned.map((branch) => branch.id));
  const stored = readStoredBranchId();

  if (user.role === 'admin') {
    if (stored === ALL_BRANCHES_ID) {
      persistBranchScope(ALL_BRANCHES_ID, assigned[0]?.id ?? undefined);
      return;
    }
    // Admins can open any shop, not only assigned ones. Keep the saved
    // selection across refresh; BranchContext validates it against the live list.
    if (stored) {
      persistBranchScope(stored, stored);
      return;
    }
    persistBranchScope(ALL_BRANCHES_ID, assigned[0]?.id ?? undefined);
    return;
  }

  const first = assigned[0]?.id;
  if (stored && stored !== ALL_BRANCHES_ID && allowed.has(stored)) {
    persistBranchScope(stored, stored);
    return;
  }
  persistBranchScope(first ?? null, first ?? null);
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        apiClient.setToken(token);
        const userData = await apiClient.getProfile();
        setUser(userData);
      }
    } catch (error: unknown) {
      // Only log non-401 errors to avoid console spam during redirects
      if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        console.error('Auth check failed:', error);
      }
      apiClient.clearToken();
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await apiClient.login({ email, password });
    applyUserBranchStorage(response.user);
    setUser(response.user);
  };

  const logout = () => {
    apiClient.clearToken();
    localStorage.removeItem('auth_token');
    persistBranchScope(null, null);
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}