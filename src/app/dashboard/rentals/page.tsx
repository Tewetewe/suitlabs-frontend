'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { InvoiceSearchField } from '@/components/ui/InvoiceSearchField';
import ClientOnly from '@/components/ClientOnly';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { Rental } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, FileText, Eye, Printer, ShoppingBag, Calendar, MessageCircle } from 'lucide-react';
import { CreateRentalModal } from '@/components/modals/CreateRentalModal';
import { RentalInvoiceModal } from '@/components/modals/RentalInvoiceModal';
import { RentalDetailsModal } from '@/components/modals/RentalDetailsModal';
import { EditRentalModal } from '@/components/modals/EditRentalModal';
import { PickupRentalModal } from '@/components/modals/PickupRentalModal';
import { ProofPick } from '@/components/payments/ProofPick';
import SimpleModal from '@/components/modals/SimpleModal';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, InfiniteScrollSentinel, SkeletonRow, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
import { useToast } from '@/contexts/ToastContext';
import { SALE_PAYMENT_METHOD_OPTIONS, DEPOSIT_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { hasNextPage, LIST_PAGE_SIZE, useInfiniteList } from '@/hooks/useInfiniteList';

/** Matches usecase.DepositReleaseGraceDays on the backend. */
const DEPOSIT_GRACE_DAYS = 7;

/** Whole days since the suit came back, or null when it has not. */
function daysSinceReturn(rental: Rental): number | null {
  if (!rental.actual_return_date) return null;
  const returned = new Date(rental.actual_return_date).getTime();
  if (Number.isNaN(returned)) return null;
  return Math.floor((Date.now() - returned) / 86_400_000);
}

export default function RentalsPage() {
  const { user } = useAuth();
  const { warning, success, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
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
  const [depositRefundMethod, setDepositRefundMethod] = useState<string>('cash');
  const [refundProofFile, setRefundProofFile] = useState<File | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState<string>('');
  const [sendToMaintenance, setSendToMaintenance] = useState<boolean>(false);
  const [newRentalDate, setNewRentalDate] = useState('');
  const [newReturnDate, setNewReturnDate] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [depositState, setDepositState] = useState<'' | 'held' | 'awaiting_check' | 'released' | 'auto_released'>('');
  const [sendingAgreementId, setSendingAgreementId] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setSearchTerm(q);
    // The Customer Deposits figure on the balance sheet links in with
    // ?deposit=held, so the number opens the rentals behind it.
    const deposit = params.get('deposit');
    if (deposit === 'held' || deposit === 'awaiting_check' || deposit === 'released' || deposit === 'auto_released') {
      setDepositState(deposit);
    }
  }, []);

  useEffect(() => {
    void apiClient.getDepositSettings()
      .then((settings) => setDepositEnabled(Boolean(settings.enabled)))
      .catch(() => setDepositEnabled(false));
  }, []);

  const agreementBadge = (rental: Rental): { label: string; variant: 'success' | 'warning' | 'default' | 'danger' } | null => {
    if (!depositEnabled || rental.status !== 'pending') return null;
    if (rental.agreement_accepted_at) return { label: 'Agreement accepted', variant: 'success' };
    if (rental.agreement_sent_at) return { label: 'Agreement sent', variant: 'warning' };
    return { label: 'Needs agreement', variant: 'danger' };
  };

  // One line per rental saying whose money the shop is sitting on. Held is the
  // detail behind the Customer Deposits balance, so the amount reads plainly
  // rather than hiding in the Complete modal.
  const isDepositHeld = (rental: Rental) =>
    Boolean(rental.deposit_collected_at) && !rental.deposit_refunded_at && (rental.security_deposit || 0) > 0;

  // A returned rental keeps its deposit until somebody checks the item. That
  // wait is normal for DEPOSIT_GRACE_DAYS, so only an overdue check reads as a
  // warning.
  const depositLine = (rental: Rental): { text: string; warn: boolean } | null => {
    const amount = rental.security_deposit || 0;
    if (amount <= 0) return null;
    if (rental.deposit_refunded_at) {
      const how = rental.deposit_auto_released ? 'auto-released' : 'released';
      return { text: `Deposit ${formatCurrency(amount)} ${how} ${formatDateShort(rental.deposit_refunded_at)}`, warn: false };
    }
    if (!rental.deposit_collected_at) {
      return { text: `Deposit ${formatCurrency(amount)} not collected`, warn: false };
    }
    if (rental.status !== 'completed') {
      return { text: `Deposit ${formatCurrency(amount)} held`, warn: false };
    }
    const daysWaiting = daysSinceReturn(rental);
    if (daysWaiting !== null && daysWaiting >= DEPOSIT_GRACE_DAYS) {
      return { text: `Deposit ${formatCurrency(amount)} awaiting check for ${daysWaiting} days`, warn: true };
    }
    return { text: `Deposit ${formatCurrency(amount)} awaiting item check`, warn: false };
  };

  const handleSendAgreement = async (rentalId: string) => {
    setSendingAgreementId(rentalId);
    try {
      const updated = await apiClient.sendDepositAgreement(rentalId);
      success('Agreement sent', 'Customer received the WhatsApp link.');
      await reload();
      setSelectedRental(updated);
    } catch (error) {
      console.error('Failed to send deposit agreement:', error);
      toastError('Could not send agreement', error instanceof Error ? error.message : 'Check phone and Wablas.');
      throw error;
    } finally {
      setSendingAgreementId(null);
    }
  };

  const canSendWAReminder = (rental: Rental) =>
    rental.status === 'pending' || rental.status === 'active' || rental.status === 'overdue';

  const handleSendWAReminder = async (rental: Rental) => {
    setSendingReminderId(rental.id);
    try {
      const reminder = await apiClient.sendRentalWAReminder(rental.id);
      const kind = reminder.reminder_type === 'pickup' ? 'Pickup' : 'Return';
      success(`${kind} reminder sent`, `WhatsApp to ${reminder.phone} (${reminder.language.toUpperCase()})`);
    } catch (error) {
      console.error('Failed to send WA reminder:', error);
      // The backend explains a cooldown or a daily cap in its message, so show
      // that instead of the status code.
      toastError('Could not send WhatsApp reminder', apiErrorMessage(error, 'Check phone and Wablas.'));
    } finally {
      setSendingReminderId(null);
    }
  };

  const loadRentalsPage = useCallback(async (page: number) => {
    try {
      const response = await apiClient.getRentals({
        page,
        limit: LIST_PAGE_SIZE,
        search: debouncedSearch || undefined,
        deposit_state: depositState || undefined,
      });
      const data = response?.data?.data?.rentals || [];
      const pagination = response?.data?.pagination;
      const items = Array.isArray(data) ? data : [];
      return { items, hasMore: hasNextPage(pagination, items.length), total: pagination?.total || 0 };
    } catch {
      warning('Unable to load rentals', 'Backend may be offline. Please try again.');
      return { items: [], hasMore: false, total: 0 };
    }
  }, [debouncedSearch, depositState, warning]);

  const {
    items: rentals,
    loading,
    loadingMore,
    hasMore,
    total,
    reload,
    sentinelRef,
  } = useInfiniteList(loadRentalsPage);

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
      await reload();
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
    setDepositRefundMethod(rental?.deposit_payment_method === 'transfer' ? 'transfer' : 'cash');
    setRefundProofFile(null);
    setShowCompleteModal(true);
  };

  const handleReleaseDeposit = (rental: Rental) => {
    setSelectedRental(rental);
    setDamageCharges('');
    setDamageNotes('');
    setChargePaymentMethod('cash');
    setDepositRefundMethod(rental.deposit_payment_method === 'transfer' ? 'transfer' : 'cash');
    setRefundProofFile(null);
    setShowReleaseModal(true);
  };

  const submitReleaseDeposit = async () => {
    if (!selectedRental) return;
    setIsSubmitting(true);
    try {
      const parsedCharge = damageCharges ? parseFloat(damageCharges) : 0;
      const refundable = Math.max((selectedRental.security_deposit || 0) - parsedCharge, 0);

      // Proof is optional, so an upload failure never blocks the release.
      let refundProofUrl: string | undefined;
      if (refundProofFile && refundable > 0) {
        try {
          refundProofUrl = await apiClient.uploadProofFile(refundProofFile, 'deposit_refund', selectedRental.id);
        } catch (uploadError) {
          console.warn('Refund proof upload failed', uploadError);
        }
      }

      await apiClient.releaseDeposit(selectedRental.id, {
        damage_charges: parsedCharge || undefined,
        damage_notes: damageNotes || undefined,
        payment_method: chargePaymentMethod,
        deposit_refund_method: refundable > 0 ? depositRefundMethod : undefined,
        deposit_refund_proof_url: refundProofUrl,
      });
      success('Deposit released', refundable > 0 ? formatCurrency(refundable) : 'Damage took the whole deposit.');
      setShowReleaseModal(false);
      await reload();
    } catch (error) {
      console.error('Failed to release deposit:', error);
      toastError('Could not release deposit', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCompleteRental = async () => {
    if (!selectedRental) return;
    try {
      const parsedCharge = damageCharges ? parseFloat(damageCharges) : undefined;
      let isoActual: string | undefined = undefined;
      if (actualReturnDate) {
        const dt = new Date(actualReturnDate);
        if (!isNaN(dt.getTime())) isoActual = dt.toISOString();
      }
      if (!user?.id) {
        toastError('Please sign in again', 'Your session expired.');
        return;
      }
      // A held deposit settles at the item check, so Complete sends no damage
      // charge and no refund. The backend refuses one anyway.
      const depositHeld = isDepositHeld(selectedRental);
      await apiClient.completeRental(
        selectedRental.id,
        user.id,
        isoActual,
        depositHeld ? undefined : parsedCharge,
        damageNotes || undefined,
        chargePaymentMethod,
      );
      // Optionally send all rented items to maintenance
      if (sendToMaintenance && Array.isArray(selectedRental.items)) {
        for (const it of selectedRental.items) {
          try {
            await apiClient.sendToMaintenance(it.item_id, damageNotes || 'Maintenance after return', it.quantity || 1);
          } catch (e) {
            console.warn('Failed to send item to maintenance', it.item_id, e);
          }
        }
      }
      await reload();
      setShowCompleteModal(false);
      setShowDetailsModal(false);
      setRefundProofFile(null);
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
      await reload();
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
      await reload();
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

  const filteredRentals = Array.isArray(rentals) ? rentals.filter(rental => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const customerName = rental.customer
      ? `${rental.customer.first_name} ${rental.customer.last_name}`.toLowerCase()
      : '';
    return (
      rental.id.toLowerCase().includes(q) ||
      customerName.includes(q) ||
      (rental.items?.some(item => item.item?.name?.toLowerCase().includes(q)) || false)
    );
  }) : [];

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
            <InvoiceSearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search name or scan invoice…"
              onFound={async (booking) => {
                if (!booking.rental_id) {
                  toastError('No rental yet', 'This booking has not been turned into a rental.');
                  return;
                }
                try {
                  const rental = await apiClient.getRental(booking.rental_id);
                  setSelectedRental(rental);
                  if (rental.status === 'pending') {
                    setShowPickupModal(true);
                  } else {
                    setShowDetailsModal(true);
                  }
                } catch {
                  toastError('Rental not found', 'The booking is there, but the rental could not be opened.');
                }
              }}
            />
            {depositEnabled && (
              <Select
                searchable={false}
                value={depositState}
                onChange={(e) => setDepositState(e.target.value as '' | 'held' | 'awaiting_check' | 'released' | 'auto_released')}
                options={[
                  { value: '', label: 'Any deposit' },
                  { value: 'held', label: 'Deposit held' },
                  { value: 'awaiting_check', label: 'Awaiting item check' },
                  { value: 'released', label: 'Deposit released' },
                  { value: 'auto_released', label: 'Auto-released, unchecked' },
                ]}
              />
            )}
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
              description={
                depositState === 'held'
                  ? 'The shop is not holding a deposit on any rental right now.'
                  : depositState === 'released'
                    ? 'No deposit has been released yet.'
                    : depositState === 'awaiting_check'
                      ? 'No returned suit is waiting for a check. Every deposit is settled.'
                      : depositState === 'auto_released'
                        ? 'No deposit has been released without a check.'
                        : searchTerm
                      ? 'Try adjusting your search term'
                      : 'Get started by creating your first rental'
              }
              action={
                depositState ? (
                  <Button variant="secondary" onClick={() => setDepositState('')}>Show every rental</Button>
                ) : (
                  <Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4" /> New Rental</Button>
                )
              }
            />
          ) : (
            filteredRentals.map((rental) => {
              const customerName = rental.customer
                ? `${rental.customer.first_name} ${rental.customer.last_name}`.trim()
                : `Rental #${rental.id.slice(-8)}`;
              const itemSummary = (rental.items || [])
                .slice(0, 2)
                .map((line) => {
                  const name = line.item?.name || 'Item';
                  return line.item?.code ? `${name} ${line.item.code}` : name;
                })
                .join(', ') + ((rental.items?.length || 0) > 2 ? ` +${rental.items!.length - 2}` : '');
              const meta = [
                `${formatDateShort(rental.rental_date)} – ${formatDateShort(rental.return_date)}`,
                itemSummary,
                rental.branch?.name,
              ].filter(Boolean).join(' · ');
              const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);

              return (
                <Card key={rental.id} padding="sm" className="relative z-0 [&:has(details[open])]:z-30" data-testid="rental-row" data-status={rental.status}>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleViewRental(rental)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{customerName}</span>
                        <Badge variant={rentalStatusVariant(rental.status)} dot className="capitalize">{rental.status}</Badge>
                        {(() => {
                          const badge = agreementBadge(rental);
                          return badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null;
                        })()}
                      </div>
                      {meta && <p className="mt-0.5 truncate text-sm text-slate-500">{meta}</p>}
                      {(() => {
                        const deposit = depositLine(rental);
                        if (!deposit) return null;
                        return (
                          <p className={`mt-0.5 truncate text-sm ${deposit.warn ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
                            {deposit.text}
                          </p>
                        );
                      })()}
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                      {rental.status === 'pending' && depositEnabled && !rental.agreement_accepted_at && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={sendingAgreementId === rental.id}
                          onClick={() => void handleSendAgreement(rental.id)}
                        >
                          {rental.agreement_sent_at ? 'Resend agreement' : 'Send agreement'}
                        </Button>
                      )}
                      {canSendWAReminder(rental) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={sendingReminderId === rental.id}
                          data-testid="rental-send-wa"
                          onClick={() => void handleSendWAReminder(rental)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {rental.status === 'pending' ? 'Send pickup WA' : 'Send return WA'}
                        </Button>
                      )}
                      {rental.status === 'pending' && (
                        <Button size="sm" data-testid="rental-pickup" onClick={() => handlePickupRental(rental.id)}>Pickup</Button>
                      )}
                      {(rental.status === 'active' || rental.status === 'overdue') && (
                        <Button size="sm" variant="secondary" data-testid="rental-complete" onClick={() => handleCompleteRental(rental.id)}>Complete</Button>
                      )}
                      {rental.status === 'completed' && isDepositHeld(rental) && (
                        <Button size="sm" data-testid="rental-release-deposit" onClick={() => handleReleaseDeposit(rental)}>
                          Release deposit
                        </Button>
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

        {!loading && filteredRentals.length > 0 && (
          <InfiniteScrollSentinel
            sentinelRef={sentinelRef}
            loadingMore={loadingMore}
            hasMore={hasMore}
            loaded={filteredRentals.length}
            total={total}
          />
        )}

        {/* Modals */}
        <CreateRentalModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { void reload(); }}
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
          onSendWAReminder={() => selectedRental && void handleSendWAReminder(selectedRental)}
          sendingWAReminder={Boolean(selectedRental && sendingReminderId === selectedRental.id)}
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
          onSuccess={() => { void reload(); }}
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
              <Button onClick={submitCompleteRental} data-testid="confirm-complete">Complete</Button>
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
            {selectedRental && isDepositHeld(selectedRental) ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                  Deposit {formatCurrency(selectedRental.security_deposit || 0)} stays held
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Check the item first, then tap <b>Release deposit</b> on this rental to charge damage and pay the rest back.
                  If nobody checks it within {DEPOSIT_GRACE_DAYS} days, the whole deposit goes back automatically.
                </p>
              </div>
            ) : (
              <>
                <CurrencyInput label="Damage charge" value={damageCharges} onChange={(n) => setDamageCharges(n ? String(n) : '')} helperText="Leave 0 if none." />
                <Select searchable={false} label="Charges paid with" options={[...SALE_PAYMENT_METHOD_OPTIONS]} value={chargePaymentMethod} onChange={(e) => setChargePaymentMethod(e.target.value)} helperText="Late fee and damage." />
              </>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
              <input id="send-maintenance" type="checkbox" className="h-4 w-4" checked={sendToMaintenance} onChange={(e) => setSendToMaintenance(e.target.checked)} />
              Send rented items to maintenance
            </label>
          </div>
        </SimpleModal>

        <SimpleModal
          isOpen={showReleaseModal && Boolean(selectedRental)}
          title="Release deposit"
          onClose={() => setShowReleaseModal(false)}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
              <Button loading={isSubmitting} onClick={submitReleaseDeposit} data-testid="confirm-release-deposit">Release</Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Check the item, then price it. Damage comes off the deposit first.</p>
            <Textarea label="Damage notes" rows={3} value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Optional" />
            <CurrencyInput label="Damage charge" value={damageCharges} onChange={(n) => setDamageCharges(n ? String(n) : '')} helperText="Leave 0 if the item came back clean." />
            {selectedRental && (
              <div className="space-y-3 rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                  Refundable deposit{' '}
                  {formatCurrency(Math.max((selectedRental.security_deposit || 0) - (damageCharges ? parseFloat(damageCharges) || 0 : 0), 0))}
                </p>
                {(damageCharges ? parseFloat(damageCharges) || 0 : 0) > (selectedRental.security_deposit || 0) && (
                  <p className="text-xs font-medium text-amber-700">
                    Collect{' '}
                    {formatCurrency((damageCharges ? parseFloat(damageCharges) || 0 : 0) - (selectedRental.security_deposit || 0))}
                    {' '}from the customer. Damage runs past the deposit.
                  </p>
                )}
                {(selectedRental.deposit_bank_name || selectedRental.deposit_account_number) && (
                  <p className="text-xs text-slate-500">
                    Customer bank: {[selectedRental.deposit_bank_name, selectedRental.deposit_account_name, selectedRental.deposit_account_number].filter(Boolean).join(' · ')}
                  </p>
                )}
                <Select
                  searchable={false}
                  label="Refund deposit with"
                  options={[...DEPOSIT_PAYMENT_METHOD_OPTIONS]}
                  value={depositRefundMethod}
                  onChange={(e) => setDepositRefundMethod(e.target.value)}
                />
                <Select
                  searchable={false}
                  label="Charges paid with"
                  options={[...SALE_PAYMENT_METHOD_OPTIONS]}
                  value={chargePaymentMethod}
                  onChange={(e) => setChargePaymentMethod(e.target.value)}
                  helperText="Only used when damage runs past the deposit."
                />
                <ProofPick
                  id="release-refund-proof"
                  label="Refund proof (optional)"
                  file={refundProofFile}
                  onChange={setRefundProofFile}
                  hint="Attach the transfer receipt when the deposit goes back to the customer account."
                />
              </div>
            )}
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
          onSuccess={() => { void reload(); }}
          rental={selectedRental}
          depositEnabled={depositEnabled}
          onSendAgreement={handleSendAgreement}
        />
      </PageShell>
    </>
  );
}