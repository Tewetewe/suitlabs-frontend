'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { User, Branch } from '@/types';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { Plus, Edit, Trash2, UserCog, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, SkeletonRow } from '@/components/ui/DataDisplay';

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [currentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    const isAdmin = currentUser?.role === 'admin';

    if (isAuthenticated && !authLoading && isAdmin) {
      loadUsers();
    } else if (!authLoading && (!isAuthenticated || !isAdmin)) {
      setLoading(false);
      // This page is admin-only. Non-admins should not be able to access it directly.
      if (isAuthenticated && !isAdmin) {
        router.replace('/dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, currentUser?.role, currentPage, itemsPerPage, searchTerm, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [{ users: rows }, shops] = await Promise.all([
        apiClient.getUsers({ page: currentPage, limit: itemsPerPage, search: searchTerm }),
        apiClient.getBranches(),
      ]);
      setUsers(Array.isArray(rows) ? rows : []);
      setBranches(shops);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Role-based permission checks
  const isAdmin = currentUser?.role === 'admin';
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
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Admin-only page guard (in case router.replace hasn't happened yet)
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <PageShell title="Users" subtitle="Admin access required">
          <EmptyState
            icon={<Shield className="h-10 w-10" />}
            title="Admins only"
            description="You don’t have permission to manage users."
            action={<Button onClick={() => router.replace('/dashboard')}>Go back</Button>}
          />
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
                    {canDeleteUsers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentUser?.id === user.id}
                        title={currentUser?.id === user.id ? "Cannot delete your own account" : "Delete user"}
                        className={currentUser?.id === user.id ? "opacity-50 cursor-not-allowed" : ""}
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


        {/* Add User Modal - Only for Admins */}
        {canAddUsers && (
          <AddUserModal
            isOpen={isAddUserModalOpen}
            onClose={() => setIsAddUserModalOpen(false)}
            onUserAdded={handleUserAdded}
            branches={branches}
          />
        )}
      </PageShell>
    </DashboardLayout>
  );
}