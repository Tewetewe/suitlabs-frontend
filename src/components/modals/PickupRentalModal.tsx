'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FilePick, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import SimpleModal from './SimpleModal';
import CameraModal from './CameraModal';
import { RackPullList } from '@/components/items/RackPullList';
import { ProofPick } from '@/components/payments/ProofPick';
import { TransactionFeeLines } from '@/components/payments/TransactionFeeLines';
import { PotPicker } from '@/components/payments/PotPicker';
import { POT_MISSING_MESSAGE, potForRequest, potMissing } from '@/lib/pots';
import { SafeImage } from '@/components/ui/SafeImage';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { DEPOSIT_PAYMENT_METHOD_OPTIONS, SALE_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';
import { waDeliveryLabel } from '@/lib/wa-delivery';
import { PickupPrep, Rental } from '@/types';

function rentalsFromUserResponse(payload: unknown): Rental[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { data?: unknown };
  const data = root.data;
  if (!data || typeof data !== 'object') return [];
  const nested = data as { rentals?: Rental[]; data?: { rentals?: Rental[] } };
  if (Array.isArray(nested.rentals)) return nested.rentals;
  if (Array.isArray(nested.data?.rentals)) return nested.data.rentals;
  return [];
}

interface PickupRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Gets the Booking ID when the Pickup collected its remaining amount. */
  onSuccess: (paidBookingId?: string) => void;
  rental: Rental | null;
  depositEnabled?: boolean;
  onSendAgreement?: (rentalId: string) => Promise<void>;
}

function dataUrlToFile(dataUrl: string, name: string) {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

export function PickupRentalModal({
  isOpen,
  onClose,
  onSuccess,
  rental,
  depositEnabled = false,
  onSendAgreement,
}: PickupRentalModalProps) {
  const [identityCardFile, setIdentityCardFile] = useState<File | null>(null);
  const [priorIdentityCardUrl, setPriorIdentityCardUrl] = useState<string | null>(null);
  const [loadingPriorId, setLoadingPriorId] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingAgreement, setSendingAgreement] = useState(false);
  const [depositMethod, setDepositMethod] = useState('cash');
  const [remainingMethod, setRemainingMethod] = useState('cash');
  const [remainingFeeRuleId, setRemainingFeeRuleId] = useState('');
  const [remainingPot, setRemainingPot] = useState('');
  const [depositPot, setDepositPot] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [depositProofFile, setDepositProofFile] = useState<File | null>(null);
  const [remainingProofFile, setRemainingProofFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [prep, setPrep] = useState<PickupPrep | null>(null);

  const previewUrl = useMemo(
    () => (identityCardFile ? URL.createObjectURL(identityCardFile) : null),
    [identityCardFile],
  );

  const agreementAccepted = Boolean(rental?.agreement_accepted_at);
  const agreementDelivery = rental?.agreement_sent_at ? waDeliveryLabel(rental.agreement_delivery_status) : null;
  const needsDeposit = depositEnabled;
  const remainingAmount = rental?.booking?.remaining_amount || 0;
  const needsRemaining = remainingAmount > 0.009;
  const canPickup = (!needsDeposit || agreementAccepted);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isOpen || !rental) return;
    setDepositMethod('cash');
    setRemainingMethod('cash');
    setRemainingFeeRuleId('');
    setRemainingPot('');
    setDepositPot('');
    setBankName(rental.deposit_bank_name || '');
    setAccountName(rental.deposit_account_name || '');
    setAccountNumber(rental.deposit_account_number || '');
    setIdentityCardFile(null);
    setPriorIdentityCardUrl(null);
    setDepositProofFile(null);
    setRemainingProofFile(null);
    setErrors({});
    setPrep(null);

    const customerId = rental.user_id || rental.customer?.id;
    if (!customerId) return;

    let cancelled = false;
    // The H-1 checklist only warns. Walk-in and same-day Bookings have no H-1,
    // so a missing checklist must not stop Pickup.
    apiClient
      .getPickupPrep(rental.id)
      .then((row) => {
        if (!cancelled) setPrep(row);
      })
      .catch((error) => console.warn('Could not load pickup checklist', error));

    setLoadingPriorId(true);
    (async () => {
      try {
        const payload = await apiClient.getUserRentals(customerId, { page: 1, limit: 50 });
        if (cancelled) return;
        const prior = rentalsFromUserResponse(payload).find(
          (row) => row.id !== rental.id && Boolean(row.identity_card_url),
        );
        setPriorIdentityCardUrl(prior?.identity_card_url || null);
      } catch (error) {
        if (!cancelled) {
          console.warn('Could not load prior identity card', error);
          setPriorIdentityCardUrl(null);
        }
      } finally {
        if (!cancelled) setLoadingPriorId(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, rental]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ identityCard: 'Upload a JPEG, PNG, or WebP image' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ identityCard: 'File must be under 5MB' });
      return;
    }
    setIdentityCardFile(file);
    setErrors({});
  };

  const handleCapture = (imageData: string) => {
    handleFile(dataUrlToFile(imageData, `id-card-${Date.now()}.jpg`));
    setCameraOpen(false);
  };

  const handleSendAgreement = async () => {
    if (!rental || !onSendAgreement) return;
    setSendingAgreement(true);
    setErrors({});
    try {
      await onSendAgreement(rental.id);
    } catch (error) {
      console.error('Failed to send agreement:', error);
      setErrors({ submit: 'Could not send agreement. Check phone and Wablas config.' });
    } finally {
      setSendingAgreement(false);
    }
  };

  const handleSubmit = async () => {
    if (!rental) return;
    setErrors({});
    if (needsDeposit && !agreementAccepted) {
      setErrors({ submit: 'Customer must accept the deposit agreement before pickup.' });
      return;
    }
    if (needsRemaining && !remainingMethod) {
      setErrors({ submit: 'Collect the remaining booking balance before pickup.' });
      return;
    }
    if ((needsRemaining && potMissing(remainingMethod, remainingPot)) || (needsDeposit && potMissing(depositMethod, depositPot))) {
      setErrors({ submit: POT_MISSING_MESSAGE });
      return;
    }
    if (needsDeposit && depositMethod === 'transfer') {
      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
        setErrors({ submit: 'Customer bank name, account name, and number are required for transfer.' });
        return;
      }
    }
    setUploading(true);
    try {
      let identityCardUrl: string | undefined;
      if (identityCardFile) {
        identityCardUrl = await apiClient.uploadIdentityCard(identityCardFile);
      } else if (priorIdentityCardUrl) {
        identityCardUrl = priorIdentityCardUrl;
      }
      // Proof is optional, so an upload failure never blocks the Pickup.
      let depositProofUrl: string | undefined;
      if (needsDeposit && depositProofFile) {
        try {
          depositProofUrl = await apiClient.uploadProofFile(depositProofFile, 'deposit', rental.id);
        } catch (uploadError) {
          console.warn('Deposit proof upload failed', uploadError);
        }
      }
      let remainingProofUrl: string | undefined;
      if (needsRemaining && remainingProofFile) {
        try {
          remainingProofUrl = await apiClient.uploadProofFile(
            remainingProofFile,
            'booking_payment',
            rental.booking_id || rental.id,
          );
        } catch (uploadError) {
          console.warn('Remaining payment proof upload failed', uploadError);
        }
      }
      await apiClient.activateRental(
        rental.id,
        rental.created_by,
        identityCardUrl,
        needsDeposit
          ? {
              deposit_payment_method: depositMethod,
              deposit_bank_name: bankName.trim(),
              deposit_account_name: accountName.trim(),
              deposit_account_number: accountNumber.trim(),
            }
          : undefined,
        needsRemaining ? remainingMethod : undefined,
        {
          deposit_proof_url: depositProofUrl,
          remaining_payment_proof_url: remainingProofUrl,
        },
        needsRemaining ? remainingFeeRuleId : undefined,
        {
          remaining_pot: needsRemaining ? potForRequest(remainingMethod, remainingPot) : undefined,
          deposit_pot: needsDeposit ? potForRequest(depositMethod, depositPot) : undefined,
        },
      );
      onSuccess(needsRemaining ? rental.booking_id || undefined : undefined);
      onClose();
    } catch (error) {
      console.error('Failed to pickup rental:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Could not complete pickup. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIdentityCardFile(null);
    setPriorIdentityCardUrl(null);
    setDepositProofFile(null);
    setRemainingProofFile(null);
    setCameraOpen(false);
    setErrors({});
    onClose();
  };

  return (
    <>
      <SimpleModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Pickup rental"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={handleClose} disabled={uploading || sendingAgreement}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading || sendingAgreement || loadingPriorId || !canPickup}
              loading={uploading}
              data-testid="confirm-pickup"
            >
              Confirm pickup
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {rental && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">
                  {rental.customer ? `${rental.customer.first_name} ${rental.customer.last_name}` : 'Customer'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Deposit {needsDeposit ? formatCurrency(rental.security_deposit || 0) : 'not required'}
                  {needsRemaining ? ` · Remaining booking ${formatCurrency(remainingAmount)}` : ''}
                </p>
              </div>

              {prep && prep.status !== 'ready' && (
                <div
                  className={`flex gap-2 rounded-2xl px-4 py-3 text-sm ${
                    prep.status === 'problem' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                  }`}
                  data-testid="pickup-prep-warning"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    {prep.status === 'problem'
                      ? 'The H-1 check found a problem: '
                      : `H-1 check not finished (${prep.items_passed}/${prep.items_total} Items). `}
                    {prep.items
                      .filter((item) => item.problem)
                      .map((item) => `${item.code} ${item.problem === 'damaged' ? 'damaged' : 'not found'}${item.problem_note ? ` (${item.problem_note})` : ''}`)
                      .join(', ') || 'Check the Items before you hand them over.'}
                  </div>
                </div>
              )}

              {needsRemaining && (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    Collect remaining booking {formatCurrency(remainingAmount)}
                  </p>
                  <p className="text-xs text-slate-600">
                    Booking was paid as DP. Remaining balance must be settled before pickup.
                  </p>
                  <Select
                    searchable={false}
                    label="Remaining paid with"
                    options={[...SALE_PAYMENT_METHOD_OPTIONS]}
                    value={remainingMethod}
                    onChange={(e) => setRemainingMethod(e.target.value)}
                  />
                  <TransactionFeeLines
                    amount={remainingAmount}
                    method={remainingMethod}
                    pot={remainingPot}
                    onPotChange={setRemainingPot}
                    ruleId={remainingFeeRuleId}
                    onRuleIdChange={setRemainingFeeRuleId}
                    className="text-sm text-slate-600"
                  />
                  <ProofPick
                    id="pickup-remaining-proof"
                    label="Remaining payment proof (optional)"
                    file={remainingProofFile}
                    onChange={setRemainingProofFile}
                    disabled={uploading}
                    hint="Attach the receipt when the balance arrives by transfer or QRIS."
                  />
                </div>
              )}

              {needsDeposit && (
                <div className="space-y-3 rounded-2xl border border-slate-200 px-4 py-3">
                  {!agreementAccepted ? (
                    <>
                      <p className="text-sm text-slate-700">
                        {rental.agreement_sent_at
                          ? 'Agreement sent. Waiting for the customer to accept before pickup.'
                          : 'Send the deposit agreement on WhatsApp. Pickup is blocked until they accept.'}
                      </p>
                      {agreementDelivery?.failed && (
                        <p className="text-sm text-red-700">
                          WhatsApp did not deliver the agreement{rental.agreement_delivery_note ? ` (${rental.agreement_delivery_note})` : ''}. Check the number and resend.
                        </p>
                      )}
                      {agreementDelivery?.queued && (
                        <p className="text-sm text-amber-700">
                          The agreement still waits in the Wablas queue. The customer has not got it yet.
                        </p>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={sendingAgreement}
                        onClick={handleSendAgreement}
                        disabled={!onSendAgreement}
                      >
                        {rental.agreement_sent_at ? 'Resend agreement' : 'Send agreement'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-emerald-700">Agreement accepted</p>
                      <p className="text-sm text-slate-600">
                        Collect security deposit {formatCurrency(rental.security_deposit || 0)}
                      </p>
                      <Select
                        searchable={false}
                        label="Deposit paid with"
                        options={[...DEPOSIT_PAYMENT_METHOD_OPTIONS]}
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value)}
                      />
                      <PotPicker method={depositMethod} pot={depositPot} onChange={setDepositPot} />
                      {depositMethod === 'transfer' && (
                        <div className="space-y-3">
                          <Input label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA" />
                          <Input label="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                          <Input label="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                        </div>
                      )}
                      <ProofPick
                        id="pickup-deposit-proof"
                        label="Deposit proof (optional)"
                        file={depositProofFile}
                        onChange={setDepositProofFile}
                        disabled={uploading}
                        hint="Attach the receipt when the deposit arrives by transfer, or when a courier collects it."
                      />
                    </>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-slate-800">
                  Identity card photo (optional)
                </p>
                {loadingPriorId && (
                  <p className="mb-2 text-xs text-slate-500">Checking for an ID already on file…</p>
                )}
                {!loadingPriorId && priorIdentityCardUrl && !identityCardFile && (
                  <div className="mb-3 space-y-2">
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      ID already on file from a previous rental. Attach a new one only if you want to replace it.
                    </p>
                    <SafeImage
                      src={priorIdentityCardUrl}
                      alt="Identity card on file"
                      width={280}
                      height={160}
                      className="max-h-40 w-auto rounded-xl object-contain"
                      fallback={<p className="text-xs text-slate-500">Could not load saved ID photo</p>}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <FilePick
                    id="pickup-id-card"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFile}
                    buttonLabel={identityCardFile || priorIdentityCardUrl ? 'Replace photo' : 'Choose photo'}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => setCameraOpen(true)}>
                    <Camera className="h-4 w-4" /> Camera
                  </Button>
                </div>
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="ID preview" className="mt-3 max-h-40 rounded-xl object-cover" />
                )}
                {errors.identityCard && <p className="mt-1 text-sm text-rose-600">{errors.identityCard}</p>}
                {!errors.identityCard && !priorIdentityCardUrl && (
                  <p className="mt-1 text-xs text-slate-500">If the customer leaves an ID: a clear photo of the KTP or passport, under 5MB.</p>
                )}
              </div>

              {rental.items && rental.items.length > 0 && (
                <RackPullList items={rental.items.map((line) => ({
                  name: line.item?.name || 'Item',
                  code: line.item?.code,
                  size: line.item?.size?.label,
                  quantity: line.quantity,
                }))} />
              )}
            </div>
          )}
          {errors.submit && <p className="text-sm text-rose-600">{errors.submit}</p>}
        </div>
      </SimpleModal>

      <CameraModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCapture} />
    </>
  );
}
