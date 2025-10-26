'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Customer, CustomerFilters, CreateCustomerRequest } from '@/types';
import { Plus, Edit, Trash2, User, Mail, Phone, X } from 'lucide-react';
import GenericDeleteConfirmModal from '@/components/modals/GenericDeleteConfirmModal';
import EditCustomerModal from '@/components/modals/EditCustomerModal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(6); // Show 6 customers per page
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    notes: ''
  });
  const { isAuthenticated, loading: authLoading } = useAuth();
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
      
      // Handle case where response might be undefined or have unexpected structure
      if (response && response.data && response.data.data && response.data.data.customers && Array.isArray(response.data.data.customers)) {
        setCustomers(response.data.data.customers);
        setTotal(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.total_pages || 1);
      } else {
        console.warn('Unexpected API response structure:', response);
        setCustomers([]);
        setTotal(0);
        setTotalPages(1);
      }
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

  const handleSearch = (search: string) => {
    setFilters({ ...filters, search });
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

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
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: ''
        },
        notes: ''
      });
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
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      address: '',
      notes: ''
    });
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your customer database
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search customers..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={filters.is_active?.toString() || ''}
                  onChange={(e) => {
                    setFilters({ 
                      ...filters, 
                      is_active: e.target.value ? e.target.value === 'true' : undefined 
                    });
                    setCurrentPage(1); // Reset to first page when filtering
                  }}
                >
                  <option value="">All Customers</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : customers.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500 mb-4">
                    {filters.search || filters.is_active !== undefined
                      ? 'Try adjusting your filters'
                      : 'Get started by adding your first customer'}
                  </p>
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            customers.map((customer) => (
              <Card key={customer.id}>
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {customer.first_name} {customer.last_name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          customer.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.address && (
                      <div className="text-sm text-gray-600">
                        <p className="truncate">{customer.address}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-4 mt-4 border-t border-gray-200">
                    <Button variant="ghost" size="sm" onClick={() => handleEditCustomer(customer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomer(customer)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} customers
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="flex items-center"
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Create Customer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Add New Customer</h2>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <Input
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <Input
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, State, Postal Code, Country"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about the customer..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeCreateModal}
                    disabled={createLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1"
                  >
                    {createLoading ? 'Creating...' : 'Create Customer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

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