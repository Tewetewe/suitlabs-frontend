'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Customer, CustomerFilters, CreateCustomerRequest } from '@/types';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import GenericDeleteConfirmModal from '@/components/modals/GenericDeleteConfirmModal';
import EditCustomerModal from '@/components/modals/EditCustomerModal';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, Pagination, SkeletonRow, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import SimpleModal from '@/components/modals/SimpleModal';
import { useBranch } from '@/contexts/BranchContext';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const emptyForm: CreateCustomerRequest = {
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    instagram: '',
    tiktok: '',
    address: '',
    notes: ''
  };
  const [formData, setFormData] = useState<CreateCustomerRequest>(emptyForm);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentBranch, viewingAll } = useBranch();
  const { success, error } = useToast();

  // Don't automatically redirect - let user decide
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // User can stay on page without being redirected
    }
  }, [isAuthenticated, authLoading]);

  const loadCustomers = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const paginationFilters = {
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      };
      const response = await apiClient.getCustomers(paginationFilters);
      
      if (!response?.success) {
        throw new Error('API request failed');
      }

      const nextCustomers = response.data?.data?.customers || [];
      setCustomers(nextCustomers);
      setTotal(response.data?.pagination?.total || 0);
      setTotalPages(response.data?.pagination?.total_pages || 1);
    } catch (err) {
      console.error('Failed to load customers:', err);
      error(
        'Failed to Load Customers',
        'Unable to fetch customer data. Please try again.'
      );
      setCustomers([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage, isAuthenticated, error]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCustomers();
    }
  }, [loadCustomers, isAuthenticated]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined }));
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    try {
      setCreateLoading(true);
      await apiClient.createCustomer(formData);
      
      // Show success toast
      success(
        'Customer Created Successfully!',
        `${formData.first_name} ${formData.last_name} has been added to the system.`
      );
      
      // Reset form and close modal
      setFormData(emptyForm);
      setShowCreateModal(false);
      
      // Reload customers
      await loadCustomers();
    } catch (err) {
      console.error('Failed to create customer:', err);
      error(
        'Failed to Create Customer',
        'Please check the form data and try again.'
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleUpdateCustomer = async (id: string, customerData: Partial<CreateCustomerRequest>) => {
    try {
      await apiClient.updateCustomer(id, customerData);
      
      // Find the customer to get their name for the success message
      const customer = customers.find(c => c.id === id);
      const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'Customer';
      
      // Show success toast
      success(
        'Customer Updated Successfully!',
        `${customerName} has been updated.`
      );
      
      // Reload customers
      await loadCustomers();
    } catch (err) {
      console.error('Failed to update customer:', err);
      error(
        'Failed to Update Customer',
        'Please check the form data and try again.'
      );
      throw err; // Re-throw to let the modal handle the error
    }
  };

  const closeEditModal = () => {
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeletingCustomer(customer);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;

    try {
      setDeleteLoading(true);
      await apiClient.deleteCustomer(deletingCustomer.id);
      
      success(
        'Customer Deleted Successfully!',
        `${deletingCustomer.first_name} ${deletingCustomer.last_name} has been removed from the system.`
      );
      
      setDeletingCustomer(null);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      error(
        'Failed to Delete Customer',
        'Please try again or contact support if the problem persists.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData(emptyForm);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <PageShell
        title="Customers"
        subtitle={
          viewingAll
            ? 'Shared directory — Origin Branch shows which shop they first registered at'
            : `New customers belong to ${currentBranch?.name || 'this shop'}. Origin Branch is visible on every record.`
        }
        action={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      >
        <FilterBar>
          <Input
            placeholder="Search customers..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            searchable={false}
            value={filters.is_active?.toString() || ''}
            onChange={(e) => {
              setFilters({ ...filters, is_active: e.target.value ? e.target.value === 'true' : undefined });
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Customers' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
        </FilterBar>

        {/* Customers List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : customers.length === 0 ? (
            <EmptyState
              icon={<User className="h-10 w-10" />}
              title="No customers found"
              description={filters.search || filters.is_active !== undefined ? 'Try adjusting your filters' : 'Get started by adding your first customer'}
              action={<Button onClick={openCreateModal}><Plus className="h-4 w-4" /> Add Customer</Button>}
            />
          ) : (
            customers.map((customer) => {
              const meta = [
                customer.phone,
                customer.email,
                customer.instagram ? `IG ${customer.instagram}` : '',
                customer.tiktok ? `TikTok ${customer.tiktok}` : '',
                customer.branch?.name,
              ].filter(Boolean).join(' · ');

              return (
                <Card key={customer.id} padding="sm" className="relative z-0 [&:has(details[open])]:z-30">
                  <CardContent className="flex items-start gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleEditCustomer(customer)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {customer.first_name} {customer.last_name}
                        </span>
                        {!customer.is_active && <Badge variant="danger">Inactive</Badge>}
                      </div>
                      {meta && <p className="mt-0.5 truncate text-sm text-slate-500">{meta}</p>}
                    </button>
                    <OverflowMenu>
                      <OverflowMenuItem icon={<Edit className="h-4 w-4 text-slate-400" />} onClick={() => handleEditCustomer(customer)}>
                        Edit
                      </OverflowMenuItem>
                      <OverflowMenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDeleteCustomer(customer)}>
                        Delete
                      </OverflowMenuItem>
                    </OverflowMenu>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          total={total}
          perPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />

        {/* Create Customer Modal */}
        <SimpleModal
          isOpen={showCreateModal}
          title="Add Customer"
          onClose={closeCreateModal}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={closeCreateModal} disabled={createLoading}>
                Cancel
              </Button>
              <Button type="submit" form="create-customer-form" loading={createLoading}>
                Create
              </Button>
            </>
          }
        >
          <form id="create-customer-form" onSubmit={handleCreateCustomer} className="space-y-4" suppressHydrationWarning>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First name"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
              />
              <Input
                label="Last name"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
              />
            </div>

            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.doe@example.com"
            />

            <Input
              label="Phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08xx-xxxx-xxxx"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Instagram (optional)"
                value={formData.instagram || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@username"
              />
              <Input
                label="TikTok (optional)"
                value={formData.tiktok || ''}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                placeholder="@username"
              />
            </div>

            <Input
              label="Address (optional)"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street, city"
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anything staff should know…"
                className={[
                  'block w-full rounded-xl border text-slate-900',
                  'glass-control',
                  'placeholder:text-slate-400 text-sm',
                  'px-3 py-2 touch-manipulation resize-y',
                  'border-black/10 focus:border-indigo-500/60 focus:ring-indigo-500/40',
                  'focus:outline-none focus:ring-1 transition-colors',
                ].join(' ')}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Visible to staff only.
              </p>
            </div>
          </form>
        </SimpleModal>
      </PageShell>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={!!editingCustomer}
        onClose={closeEditModal}
        onUpdate={handleUpdateCustomer}
        customer={editingCustomer}
      />

      {/* Delete Confirmation Modal */}
      <GenericDeleteConfirmModal
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleConfirmDelete}
        title="Customer"
        itemName={deletingCustomer ? `${deletingCustomer.first_name} ${deletingCustomer.last_name}` : ''}
        itemDetails={deletingCustomer ? deletingCustomer.email : undefined}
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
}