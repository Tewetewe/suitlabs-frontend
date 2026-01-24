'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ClientOnly from '@/components/ClientOnly';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/date';
import { Rental } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, FileText, User, Calendar, DollarSign, Eye } from 'lucide-react';
import { CreateRentalModal } from '@/components/modals/CreateRentalModal';
import { RentalInvoiceModal } from '@/components/modals/RentalInvoiceModal';
import { RentalDetailsModal } from '@/components/modals/RentalDetailsModal';
import { EditRentalModal } from '@/components/modals/EditRentalModal';
import { PickupRentalModal } from '@/components/modals/PickupRentalModal';

export default function RentalsPage() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangeDatesModal, setShowChangeDatesModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [damageCharges, setDamageCharges] = useState<string>('');
  const [damageNotes, setDamageNotes] = useState<string>('');
  const [actualReturnDate, setActualReturnDate] = useState<string>('');
  const [sendToMaintenance, setSendToMaintenance] = useState<boolean>(false);
  const [newRentalDate, setNewRentalDate] = useState('');
  const [newReturnDate, setNewReturnDate] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRentals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  // Handle browser extension hydration issues
  useEffect(() => {
    // Suppress hydration warnings for browser extensions
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('hydration')) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRentals({ page: currentPage, limit: itemsPerPage });
      const data = response?.data?.data?.rentals || [];
      setRentals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load rentals:', error);
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  const handleViewRental = (rental: Rental) => {
    setSelectedRental(rental);
    setShowDetailsModal(true);
  };

  const handleActivateRental = async (rentalId: string) => {
    try {
      if (!user?.id) {
        alert('User not authenticated. Please login again.');
        return;
      }
      await apiClient.activateRental(rentalId, user.id);
      await loadRentals();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Failed to activate rental:', error);
    }
  };

  const handlePickupRental = (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId) || null;
    setSelectedRental(rental);
    setShowPickupModal(true);
  };

  const handleCompleteRental = (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId) || null;
    setSelectedRental(rental);
    setDamageCharges('');
    setDamageNotes('');
    setShowCompleteModal(true);
  };

  const submitCompleteRental = async () => {
    if (!selectedRental) return;
    try {
      const parsedCharge = damageCharges ? parseFloat(damageCharges) : undefined;
      // Convert optional actualReturnDate (YYYY-MM-DD) to ISO if provided
      let isoActual: string | undefined = undefined;
      if (actualReturnDate) {
        const dt = new Date(actualReturnDate);
        if (!isNaN(dt.getTime())) isoActual = dt.toISOString();
      }
      if (!user?.id) {
        alert('User not authenticated. Please login again.');
        return;
      }
      await apiClient.completeRental(selectedRental.id, user.id, isoActual, parsedCharge, damageNotes || undefined);
      // Optionally send all rented items to maintenance
      if (sendToMaintenance && Array.isArray(selectedRental.items)) {
        for (const it of selectedRental.items) {
          try {
            await apiClient.sendToMaintenance(it.item_id, damageNotes || 'Maintenance after return');
          } catch (e) {
            console.warn('Failed to send item to maintenance', it.item_id, e);
          }
        }
      }
      await loadRentals();
      setShowCompleteModal(false);
      setShowDetailsModal(false);
      // Refresh selected rental to show updated totals, then show invoice
      try {
        const latest = await apiClient.getRental(selectedRental.id);
        setSelectedRental(latest);
      } catch {}
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Failed to complete rental:', error);
      alert('Failed to complete rental.');
    }
  };


  const handleEditRental = (rental: Rental) => {
    setSelectedRental(rental);
    setShowEditModal(true);
  };

  const handleChangeDates = (rental: Rental) => {
    setSelectedRental(rental);
    setNewRentalDate(rental.rental_date.split('T')[0]);
    setNewReturnDate(rental.return_date.split('T')[0]);
    setShowChangeDatesModal(true);
  };

  const handleCancelRental = (rental: Rental) => {
    setSelectedRental(rental);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  const handleSubmitChangeDates = async () => {
    if (!selectedRental || !newRentalDate || !newReturnDate) return;
    
    if (new Date(newReturnDate) <= new Date(newRentalDate)) {
      alert('Return date must be after rental date');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.changeRentalDates(selectedRental.id, newRentalDate, newReturnDate);
      await loadRentals();
      setShowChangeDatesModal(false);
      setSelectedRental(null);
      setNewRentalDate('');
      setNewReturnDate('');
    } catch (error) {
      console.error('Failed to change rental dates:', error);
      alert('Failed to change rental dates. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCancelRental = async () => {
    if (!selectedRental || !cancellationReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated. Please login again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.cancelRentalWithReason(selectedRental.id, cancellationReason, user.id);
      await loadRentals();
      setShowCancelModal(false);
      setSelectedRental(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Failed to cancel rental:', error);
      alert('Failed to cancel rental. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Currency formatting uses shared IDR utility

  const filteredRentals = Array.isArray(rentals) ? rentals.filter(rental => 
    rental.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rental.items?.some(item => item.item?.name?.toLowerCase().includes(searchTerm.toLowerCase())) || false)
  ) : [];

  // Filter out cancelled rentals for statistics
  const activeRentals = filteredRentals.filter(r => r.status !== 'cancelled');

  return (
    <DashboardLayout>
      <div className="space-y-6" suppressHydrationWarning>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track active and completed rentals
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Rental
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent>
            <ClientOnly>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search rentals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </ClientOnly>
          </CardContent>
        </Card>

        {/* Rentals List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredRentals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rentals found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm
                    ? 'Try adjusting your search term'
                    : 'Get started by creating your first rental'}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Rental
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRentals.map((rental) => (
              <Card key={rental.id}>
                <CardContent>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Rental #{rental.id.slice(-8)}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                          {rental.status}
                        </span>
                      </div>
                      {rental.items && rental.items.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <FileText className="h-4 w-4 mr-2" />
                          <span>{rental.items.length} item{rental.items.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency((rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <div>
                        <div>Start: {formatDate(rental.rental_date)}</div>
                        <div>Planned Return: {formatDate(rental.return_date)}</div>
                        {rental.actual_pickup_date && (
                          <div>Picked up: {formatDateTime(rental.actual_pickup_date)}</div>
                        )}
                        {rental.actual_return_date && (
                          <div>Returned: {formatDate(rental.actual_return_date)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span>Total: {formatCurrency((rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0))}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">
                          {rental.customer ? `${rental.customer.first_name} ${rental.customer.last_name}` : `Customer ID: ${rental.user_id.slice(-8)}`}
                        </div>
                        {rental.customer && (
                          <div className="text-xs text-gray-500">{rental.customer.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <User className="h-3 w-3 mr-1" />
                      <span>
                        Staff created: {rental.creator ? `${rental.creator.first_name} ${rental.creator.last_name}` : 'Unknown'}
                      </span>
                    </div>
                    {rental.updater && (
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        <span>Staff updated: {rental.updater.first_name} {rental.updater.last_name}</span>
                      </div>
                    )}
                  </div>

                  {rental.items && rental.items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Items ({rental.items.length})</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="space-y-2">
                          {rental.items.map((item, index) => (
                            <div key={index} className="text-sm border-b border-gray-200 pb-2 last:border-b-0">
                              <div className="font-medium">{item.item?.name || 'Item'}</div>
                              <div className="text-gray-600">
                                Qty: {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(rental.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewRental(rental)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditRental(rental)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {rental.status === 'pending' && (
                        <Button variant="primary" size="sm" onClick={() => handlePickupRental(rental.id)}>
                          Pickup
                        </Button>
                      )}
                      {rental.status === 'active' && (
                        <Button variant="secondary" size="sm" onClick={() => handleCompleteRental(rental.id)}>
                          Complete Rental
                        </Button>
                      )}
                      {(rental.status === 'pending' || rental.status === 'active') && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => handleChangeDates(rental)}>
                            Change Dates
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleCancelRental(rental)}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {!loading && activeRentals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {activeRentals.length}
                </div>
                <div className="text-sm text-gray-500">Total Rentals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {activeRentals.filter(r => r.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {activeRentals.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    activeRentals.reduce((sum, rental) => sum + ((rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0)), 0)
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pagination */}
        {!loading && rentals.length > 0 && (
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

        {/* Modals */}
        <CreateRentalModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => loadRentals()}
        />

        <RentalDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
          onActivate={() => selectedRental && handleActivateRental(selectedRental.id)}
          onComplete={() => selectedRental && handleCompleteRental(selectedRental.id)}
          onCancel={() => selectedRental && handleCancelRental(selectedRental)}
          onInvoice={() => {
            setShowDetailsModal(false);
            setShowInvoiceModal(true);
          }}
        />

        <EditRentalModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
          onSuccess={() => loadRentals()}
        />

        <RentalInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedRental(null);
          }}
          rental={selectedRental}
        />

        {/* Change Dates Modal */}
        {showChangeDatesModal && selectedRental && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Change Rental Dates</h3>
              <p className="text-gray-600 mb-4">
                Rental ID: {selectedRental.id}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Rental Date
                  </label>
                  <Input
                    type="date"
                    value={newRentalDate}
                    onChange={(e) => setNewRentalDate(e.target.value)}
                    className="w-full"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Return Date
                  </label>
                  <Input
                    type="date"
                    value={newReturnDate}
                    onChange={(e) => setNewReturnDate(e.target.value)}
                    className="w-full"
                    min={newRentalDate || new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="text-sm text-gray-500">
                  <p>Current dates:</p>
                  <p>Rental: {selectedRental.rental_date.split('T')[0]}</p>
                  <p>Return: {selectedRental.return_date.split('T')[0]}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowChangeDatesModal(false);
                    setNewRentalDate('');
                    setNewReturnDate('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSubmitChangeDates}
                  disabled={isSubmitting || !newRentalDate || !newReturnDate}
                  loading={isSubmitting}
                >
                  Change Dates
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Rental Modal */}
        {showCompleteModal && selectedRental && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Complete Rental</h3>
              <p className="text-gray-600 mb-4">Rental ID: {selectedRental.id}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Return Date (optional)</label>
                <Input
                  type="date"
                  value={actualReturnDate}
                  onChange={(e) => setActualReturnDate(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use now. Set a past date to backdate and compute late fee correctly.</p>
              </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Defect/Damage Notes</label>
                  <textarea
                    value={damageNotes}
                    onChange={(e) => setDamageNotes(e.target.value)}
                    placeholder="Describe any damages or defects..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Damage Charge (IDR)</label>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={damageCharges}
                    onChange={(e) => setDamageCharges(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave 0 if no damage charge.</p>
                </div>
            <div className="flex items-center gap-2">
              <input
                id="send-maintenance"
                type="checkbox"
                className="h-4 w-4"
                checked={sendToMaintenance}
                onChange={(e) => setSendToMaintenance(e.target.checked)}
              />
              <label htmlFor="send-maintenance" className="text-sm text-gray-700">Send rented items to maintenance</label>
            </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button variant="ghost" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={submitCompleteRental}>Complete Rental</Button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Rental Modal */}
        {showCancelModal && selectedRental && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Cancel Rental</h3>
              <p className="text-gray-600 mb-4">
                Rental ID: {selectedRental.id}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cancellation Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please provide a reason for cancellation..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    required
                  />
                </div>

                <div className="text-sm text-gray-500">
                  <p>Current status: <span className="font-medium capitalize">{selectedRental.status}</span></p>
                  <p>Rental period: {selectedRental.rental_date.split('T')[0]} to {selectedRental.return_date.split('T')[0]}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                  }}
                  disabled={isSubmitting}
                >
                  No, Keep Rental
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleSubmitCancelRental}
                  disabled={isSubmitting || !cancellationReason.trim()}
                  loading={isSubmitting}
                >
                  Yes, Cancel Rental
                </Button>
              </div>
            </div>
          </div>
        )}

        <PickupRentalModal
          isOpen={showPickupModal}
          onClose={() => {
            setShowPickupModal(false);
            setSelectedRental(null);
          }}
          onSuccess={() => loadRentals()}
          rental={selectedRental}
        />
      </div>
    </DashboardLayout>
  );
}