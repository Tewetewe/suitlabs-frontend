'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { User, Branch } from '@/types';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { Plus, Edit, Trash2, UserCog, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, InfiniteScrollSentinel, SkeletonRow } from '@/components/ui/DataDisplay';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { hasNextPage, LIST_PAGE_SIZE, useInfiniteList } from '@/hooks/useInfiniteList';

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [deactivatingBusy, setDeactivatingBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const ready = Boolean(isAuthenticated && !authLoading && isAdmin);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (!ready) return;
    apiClient.getBranches().then(setBranches).catch(() => setBranches([]));
  }, [ready]);

  const loadUsersPage = useCallback(async (page: number) => {
    if (!ready) return { items: [] as User[], hasMore: false, total: 0 };
    try {
      const { users: rows, pagination } = await apiClient.getUsers({
        page,
        limit: LIST_PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      const items = Array.isArray(rows) ? rows : [];
      return { items, hasMore: hasNextPage(pagination, items.length), total: pagination?.total || 0 };
    } catch (err) {
      console.error('Failed to load users:', err);
      return { items: [] as User[], hasMore: false, total: 0 };
    }
  }, [ready, debouncedSearch]);

  const {
    items: users,
    setItems: setUsers,
    loading,
    loadingMore,
    hasMore,
    total,
    reload,
    sentinelRef,
  } = useInfiniteList(loadUsersPage);

  const roleVariant = (role: string): 'danger' | 'primary' | 'success' | 'default' => {
    switch (role) {
      case 'admin': return 'danger';
      case 'staff': return 'primary';
      case 'user':  return 'success';
      default:      return 'default';
    }
  };

  const handleUserAdded = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
  };

  const toggleUserBranch = async (user: User, branchId: string, checked: boolean) => {
    const current = (user.branches || []).map((branch) => branch.id);
    const next = user.role === 'staff'
      ? [branchId]
      : checked
        ? [...new Set([...current, branchId])]
        : current.filter((id) => id !== branchId);
    try {
      setSavingUserId(user.id);
      const updated = await apiClient.assignUserBranches(user.id, next);
      setUsers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (error) {
      console.error('Failed to assign shops:', error);
    } finally {
      setSavingUserId(null);
    }
  };

  const canAddUsers = isAdmin;
  const canEditUsers = isAdmin;
  const canDeleteUsers = isAdmin;

  const filteredUsers = Array.isArray(users) ? users.filter(user => 
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </>
    );
  }

  // Admin-only page guard (in case router.replace hasn't happened yet)
  if (!isAdmin) {
    return (
      <>
        <PageShell title="Users" subtitle="Admin access required">
          <EmptyState
            icon={<Shield className="h-10 w-10" />}
            title="Admins only"
            description="You don’t have permission to manage users."
            action={<Button onClick={() => router.replace('/dashboard')}>Go back</Button>}
          />
        </PageShell>
      </>
    );
  }

  return (
    <>
      <PageShell
        title="Users"
        subtitle={isAdmin ? 'Manage system users and their permissions' : 'View system users and their information'}
        action={
          canAddUsers ? (
            <Button onClick={() => setIsAddUserModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          ) : undefined
        }
      >
        <FilterBar>
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FilterBar>

        {/* Users List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={<UserCog className="h-10 w-10" />}
              title="No users found"
              description={searchTerm ? 'Try adjusting your search term' : 'Get started by adding your first user'}
              action={canAddUsers ? <Button onClick={() => setIsAddUserModalOpen(true)}><Plus className="h-4 w-4" /> Add User</Button> : undefined}
            />
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} padding="sm">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {user.first_name} {user.last_name}
                      </span>
                      <Badge variant={roleVariant(user.role)} className="capitalize">{user.role}</Badge>
                      {!user.is_active && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {[user.email, user.phone].filter(Boolean).join(' · ')}
                    </p>
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-medium text-slate-400">
                          {user.role === 'staff' ? 'Shop' : 'Shops'}
                        </span>
                        {branches.map((branch) => {
                          const checked = (user.branches || []).some((mine) => mine.id === branch.id);
                          return (
                            <label key={branch.id} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                              <input
                                type={user.role === 'staff' ? 'radio' : 'checkbox'}
                                name={user.role === 'staff' ? `staff-shop-${user.id}` : undefined}
                                checked={checked}
                                disabled={savingUserId === user.id}
                                onChange={(e) => toggleUserBranch(user, branch.id, e.target.checked)}
                              />
                              {branch.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canEditUsers && (
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteUsers && user.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentUser?.id === user.id}
                        title={currentUser?.id === user.id ? "Cannot deactivate your own account" : "Deactivate user"}
                        aria-label={`Deactivate ${user.first_name} ${user.last_name}`.trim()}
                        className={currentUser?.id === user.id ? "opacity-50 cursor-not-allowed" : ""}
                        onClick={() => setDeactivating(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={hasMore}
          loaded={filteredUsers.length}
          total={total}
        />

        {/* Add User Modal - Only for Admins */}
        {canAddUsers && (
          <AddUserModal
            isOpen={isAddUserModalOpen}
            onClose={() => setIsAddUserModalOpen(false)}
            onUserAdded={handleUserAdded}
            branches={branches}
          />
        )}
        <ConfirmModal
          isOpen={!!deactivating}
          title="Deactivate user"
          confirmLabel="Deactivate"
          variant="danger"
          loading={deactivatingBusy}
          onClose={() => setDeactivating(null)}
          onConfirm={async () => {
            if (!deactivating) return;
            try {
              setDeactivatingBusy(true);
              await apiClient.deactivateUser(deactivating.id);
              success('User deactivated', `${deactivating.first_name} ${deactivating.last_name} can no longer sign in.`);
              setDeactivating(null);
              await reload();
            } catch {
              toastError('Could not deactivate user', 'Please try again.');
            } finally {
              setDeactivatingBusy(false);
            }
          }}
          description="History stays. They will not be able to sign in. Users are never deleted."
        />
      </PageShell>
    </>
  );
}