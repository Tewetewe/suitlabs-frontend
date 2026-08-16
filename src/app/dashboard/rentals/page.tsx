'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import ClientOnly from '@/components/ClientOnly';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { Rental } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, FileText, Eye, Printer, ShoppingBag, Calendar } from 'lucide-react';
import { CreateRentalModal } from '@/components/modals/CreateRentalModal';
import { RentalInvoiceModal } from '@/components/modals/RentalInvoiceModal';
import { RentalDetailsModal } from '@/components/modals/RentalDetailsModal';
import { EditRentalModal } from '@/components/modals/EditRentalModal';
import { PickupRentalModal } from '@/components/modals/PickupRentalModal';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, SkeletonRow, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
import { useToast } from '@/contexts/ToastContext';
import { SALE_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';

export default function RentalsPage() {
  const { user } = useAuth();
  const { warning } = useToast();
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
  const [chargePaymentMethod, setChargePaymentMethod] = useState<string>('cash');
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

  // Hydration warnings are already handled globally in `HydrationSuppressor`.

  const loadRentals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRentals({ page: currentPage, limit: itemsPerPage });
      const data = response?.data?.data?.rentals || [];
      setRentals(Array.isArray(data) ? data : []);
    } catch {
      // Avoid noisy console spam; show a user-facing hint instead.
      warning('Unable to load rentals', 'Backend may be offline. Please try again.');
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  const rentalStatusVariant = (s: string): 'success' | 'warning' | 'default' | 'danger' => {
    switch (s) {
      case 'active':    return 'success';
      case 'pending':   return 'warning';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      case 'overdue':   return 'danger';
      default:          return 'default';
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
    setChargePaymentMethod('cash');
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
      await apiClient.completeRental(selectedRental.id, user.id, isoActual, parsedCharge, damageNotes || undefined, chargePaymentMethod);
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
      <PageShell
        title="Rentals"
        subtitle="Track active and completed rentals"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            New Rental
          </Button>
        }
      >
        <ClientOnly>
          <FilterBar>
            <Input
              placeholder="Search rentals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FilterBar>
        </ClientOnly>

        {/* Rentals List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filteredRentals.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No rentals found"
              description={searchTerm ? 'Try adjusting your search term' : 'Get started by creating your first rental'}
              action={<Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4" /> New Rental</Button>}
            />
          ) : (
            filteredRentals.map((rental) => {
              const customerName = rental.customer
                ? `${rental.customer.first_name} ${rental.customer.last_name}`.trim()
                : `Rental #${rental.id.slice(-8)}`;
              const itemSummary = (rental.items || [])
                .slice(0, 2)
                .map((line) => line.item?.name || 'Item')
                .join(', ') + ((rental.items?.length || 0) > 2 ? ` +${rental.items!.length - 2}` : '');
              const meta = [
                `${formatDateShort(rental.rental_date)} – ${formatDateShort(rental.return_date)}`,
                itemSummary,
                rental.branch?.name,
              ].filter(Boolean).join(' · ');
              const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);

              return (
                <Card key={rental.id} padding="sm" className="relative z-0 [&:has(details[open])]:z-30">
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleViewRental(rental)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{customerName}</span>
                        <Badge variant={rentalStatusVariant(rental.status)} dot className="capitalize">{rental.status}</Badge>
                      </div>
                      {meta && <p className="mt-0.5 truncate text-sm text-slate-500">{meta}</p>}
                    </button>
                    <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                      {rental.status === 'pending' && (
                        <Button size="sm" onClick={() => handlePickupRental(rental.id)}>Pickup</Button>
                      )}
                      {(rental.status === 'active' || rental.status === 'overdue') && (
                        <Button size="sm" variant="secondary" onClick={() => handleCompleteRental(rental.id)}>Complete</Button>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</p>
                      </div>
                      <OverflowMenu>
                        <OverflowMenuItem icon={<Eye className="h-4 w-4 text-slate-400" />} onClick={() => handleViewRental(rental)}>
                          View
                        </OverflowMenuItem>
                        <OverflowMenuItem icon={<Edit className="h-4 w-4 text-slate-400" />} onClick={() => handleEditRental(rental)}>
                          Edit
                        </OverflowMenuItem>
                        {rental.status !== 'cancelled' && (
                          <OverflowMenuItem
                            icon={<Printer className="h-4 w-4 text-slate-400" />}
                            onClick={() => {
                              setSelectedRental(rental);
                              setShowInvoiceModal(true);
                            }}
                          >
                            Invoice
                          </OverflowMenuItem>
                        )}
                        {(rental.status === 'active' || rental.status === 'overdue') && (
                          <OverflowMenuItem
                            icon={<ShoppingBag className="h-4 w-4 text-slate-400" />}
                            href={`/dashboard/sales?rental_id=${rental.id}&customer_id=${rental.user_id}`}
                          >
                            Lost / add-ons
                          </OverflowMenuItem>
                        )}
                        {(rental.status === 'pending' || rental.status === 'active') && (
                          <>
                            <OverflowMenuItem icon={<Calendar className="h-4 w-4 text-slate-400" />} onClick={() => handleChangeDates(rental)}>
                              Change dates
                            </OverflowMenuItem>
                            <OverflowMenuItem danger onClick={() => handleCancelRental(rental)}>
                              Cancel rental
                            </OverflowMenuItem>
                          </>
                        )}
                      </OverflowMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {!loading && activeRentals.length > 0 && (
          <p className="text-sm text-slate-500">
            {activeRentals.length} rentals
            {' · '}
            {activeRentals.filter(r => r.status === 'active').length} active
            {' · '}
            {activeRentals.filter(r => r.status === 'completed').length} completed
          </p>
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
          onEdit={() => {
            if (!selectedRental) return;
            setShowDetailsModal(false);
            handleEditRental(selectedRental);
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
          <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
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
          <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Complete Rental</h3>
              <p className="text-gray-600 mb-4">Rental ID: {selectedRental.id}</p>
              <p className="mb-4 text-sm text-slate-600">
                If anything is missing, record lost items / add-ons first, then complete.
              </p>
              <Link
                href={`/dashboard/sales?rental_id=${selectedRental.id}&customer_id=${selectedRental.user_id}`}
                className="mb-4 inline-flex"
              >
                <Button variant="secondary" size="sm">
                  <ShoppingBag className="h-4 w-4" />
                  Lost items / add-ons
                </Button>
              </Link>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Damage Charge</label>
                  <CurrencyInput
                    value={damageCharges}
                    onChange={(n) => setDamageCharges(n ? String(n) : '')}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave 0 if no damage charge.</p>
                </div>
                <Select
                  searchable={false}
                  label="Paid with (damage / late fee)"
                  options={[...SALE_PAYMENT_METHOD_OPTIONS]}
                  value={chargePaymentMethod}
                  onChange={(e) => setChargePaymentMethod(e.target.value)}
                />
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
          <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
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
      </PageShell>
    </DashboardLayout>
  );
}