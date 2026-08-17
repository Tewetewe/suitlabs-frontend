'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
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
import SimpleModal from '@/components/modals/SimpleModal';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, SkeletonRow, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
import { useToast } from '@/contexts/ToastContext';
import { SALE_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';

export default function RentalsPage() {
  const { user } = useAuth();
  const { warning, success, error: toastError } = useToast();
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
        toastError('Please sign in again', 'Your session expired.');
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
        toastError('Please sign in again', 'Your session expired.');
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
      toastError('Could not complete rental', 'Please try again.');
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
      warning('Check the dates', 'Return date must be after rental date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.changeRentalDates(selectedRental.id, newRentalDate, newReturnDate);
      await loadRentals();
      success('Dates updated');
      setShowChangeDatesModal(false);
      setSelectedRental(null);
      setNewRentalDate('');
      setNewReturnDate('');
    } catch (error) {
      console.error('Failed to change rental dates:', error);
      toastError('Could not change dates', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCancelRental = async () => {
    if (!selectedRental || !cancellationReason.trim()) {
      warning('Reason needed', 'Please provide a cancellation reason.');
      return;
    }

    if (!user?.id) {
      toastError('Please sign in again', 'Your session expired.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.cancelRentalWithReason(selectedRental.id, cancellationReason, user.id);
      await loadRentals();
      success('Rental cancelled');
      setShowCancelModal(false);
      setSelectedRental(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Failed to cancel rental:', error);
      toastError('Could not cancel rental', 'Please try again.');
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
    <>
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
            <div className="text-sm text-slate-500">Page {currentPage}</div>
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

        <SimpleModal
          isOpen={showChangeDatesModal && Boolean(selectedRental)}
          title="Change dates"
          onClose={() => { setShowChangeDatesModal(false); setNewRentalDate(''); setNewReturnDate(''); }}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setShowChangeDatesModal(false); setNewRentalDate(''); setNewReturnDate(''); }} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleSubmitChangeDates} disabled={isSubmitting || !newRentalDate || !newReturnDate} loading={isSubmitting}>Save dates</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Rental date" type="date" value={newRentalDate} onChange={(e) => setNewRentalDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            <Input label="Return date" type="date" value={newReturnDate} onChange={(e) => setNewReturnDate(e.target.value)} min={newRentalDate || new Date().toISOString().split('T')[0]} />
            {selectedRental && (
              <p className="text-xs text-slate-500">Current: {selectedRental.rental_date.split('T')[0]} → {selectedRental.return_date.split('T')[0]}</p>
            )}
          </div>
        </SimpleModal>

        <SimpleModal
          isOpen={showCompleteModal && Boolean(selectedRental)}
          title="Complete rental"
          onClose={() => setShowCompleteModal(false)}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
              <Button onClick={submitCompleteRental}>Complete</Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">If anything is missing, record lost items or add-ons first.</p>
            {selectedRental && (
              <Link href={`/dashboard/sales?rental_id=${selectedRental.id}&customer_id=${selectedRental.user_id}`} className="inline-flex">
                <Button variant="secondary" size="sm"><ShoppingBag className="h-4 w-4" /> Lost items / add-ons</Button>
              </Link>
            )}
            <Input label="Actual return date" type="date" value={actualReturnDate} onChange={(e) => setActualReturnDate(e.target.value)} helperText="Leave empty to use now." />
            <Textarea label="Damage notes" rows={3} value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Optional" />
            <CurrencyInput label="Damage charge" value={damageCharges} onChange={(n) => setDamageCharges(n ? String(n) : '')} helperText="Leave 0 if none." />
            <Select searchable={false} label="Paid with" options={[...SALE_PAYMENT_METHOD_OPTIONS]} value={chargePaymentMethod} onChange={(e) => setChargePaymentMethod(e.target.value)} />
            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
              <input id="send-maintenance" type="checkbox" className="h-4 w-4" checked={sendToMaintenance} onChange={(e) => setSendToMaintenance(e.target.checked)} />
              Send rented items to maintenance
            </label>
          </div>
        </SimpleModal>

        <SimpleModal
          isOpen={showCancelModal && Boolean(selectedRental)}
          title="Cancel rental"
          onClose={() => { setShowCancelModal(false); setCancellationReason(''); }}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setShowCancelModal(false); setCancellationReason(''); }} disabled={isSubmitting}>Keep rental</Button>
              <Button variant="danger" onClick={handleSubmitCancelRental} disabled={isSubmitting || !cancellationReason.trim()} loading={isSubmitting}>Cancel rental</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Textarea label="Reason" required rows={3} value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} placeholder="Why is this rental cancelled?" />
            {selectedRental && (
              <p className="text-xs text-slate-500 capitalize">
                {selectedRental.status} · {selectedRental.rental_date.split('T')[0]} → {selectedRental.return_date.split('T')[0]}
              </p>
            )}
          </div>
        </SimpleModal>

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
    </>
  );
}