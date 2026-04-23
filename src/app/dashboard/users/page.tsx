'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { User } from '@/types';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { Plus, Edit, Trash2, UserCog, Mail, Phone, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, SkeletonCard } from '@/components/ui/DataDisplay';

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
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
      const { users } = await apiClient.getUsers({ page: currentPage, limit: itemsPerPage, search: searchTerm });
      setUsers(Array.isArray(users) ? users : []);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return Shield;
      case 'staff':
        return UserCog;
      case 'user':
        return UserIcon;
      default:
        return UserIcon;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleUserAdded = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
  };

  // Role-based permission checks
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';
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

        {/* Users Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredUsers.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<UserCog className="h-10 w-10" />}
                title="No users found"
                description={searchTerm ? 'Try adjusting your search term' : 'Get started by adding your first user'}
                action={canAddUsers ? <Button onClick={() => setIsAddUserModalOpen(true)}><Plus className="h-4 w-4" /> Add User</Button> : undefined}
              />
            </div>
          ) : (
            filteredUsers.map((user) => {
              return (
                <Card key={user.id}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          {(() => { const RoleIcon = getRoleIcon(user.role); return <RoleIcon className="h-6 w-6 text-slate-600" />; })()}
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-slate-900">
                            {user.first_name} {user.last_name}
                          </h3>
                          <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                        </div>
                      </div>
                      <Badge variant={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-3">
                        <div>Created: {formatDate(user.created_at)}</div>
                        <div>Updated: {formatDate(user.updated_at)}</div>
                      </div>
                      
                      <div className="flex justify-between">
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
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>


        {/* Role Distribution */}
        {!loading && filteredUsers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Shield className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {Array.isArray(filteredUsers) ? filteredUsers.filter(u => u.role === 'admin').length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Administrators</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <UserCog className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Array.isArray(filteredUsers) ? filteredUsers.filter(u => u.role === 'staff').length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Staff Members</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <UserIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {Array.isArray(filteredUsers) ? filteredUsers.filter(u => u.role === 'user').length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Regular Users</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Add User Modal - Only for Admins */}
        {canAddUsers && (
          <AddUserModal
            isOpen={isAddUserModalOpen}
            onClose={() => setIsAddUserModalOpen(false)}
            onUserAdded={handleUserAdded}
          />
        )}
      </PageShell>
    </DashboardLayout>
  );
}