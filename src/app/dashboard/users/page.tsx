'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { User } from '@/types';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { Plus, Edit, Trash2, UserCog, Mail, Phone, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function UsersPage() {
  const { isAuthenticated, loading: authLoading, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadUsers();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
      // Don't automatically redirect - let user decide
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, currentPage, itemsPerPage, searchTerm]);

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isAdmin ? 'Manage system users and their permissions' : 'View system users and their information'}
            </p>
          </div>
          {canAddUsers && (
            <Button onClick={() => setIsAddUserModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>

        {/* Staff Permission Notice */}
        {isStaff && !isAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Limited Access
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>As a staff member, you can view user information but cannot add, edit, or delete users. Contact an administrator for user management tasks.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardContent>
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : users.length}
                </div>
                <div className="text-sm text-gray-500">Total Users</div>
                <div className="text-lg font-semibold text-green-600 mt-1">
                  {loading ? '...' : (Array.isArray(users) ? users.filter(u => u.is_active).length : 0)}
                </div>
                <div className="text-xs text-gray-500">Active</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between py-4">
            <div className="text-sm text-gray-500">Page {currentPage}</div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Users Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredUsers.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? 'Try adjusting your search term'
                      : 'Get started by adding your first user'}
                  </p>
                  <Button onClick={() => setIsAddUserModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              return (
                <Card key={user.id}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${getRoleColor(user.role)}`}>
                          <RoleIcon className="h-6 w-6" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
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
      </div>
    </DashboardLayout>
  );
}