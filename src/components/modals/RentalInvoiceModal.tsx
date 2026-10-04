'use client';

import React from 'react';
import { Rental } from '@/types';
import { downloadReceiptPdf } from '@/lib/receipt-image';
import { printRentalInvoice } from '@/lib/print-router';
import { RECEIPT_STYLES } from '@/lib/receipt-styles';
import { invoiceBarcodeValue, rentalInvoiceNumber } from '@/lib/barcode';
import { formatCurrency } from '@/lib/currency';
import { TRANSACTION_FEE_LABEL } from '@/lib/transaction-fee';
import { InvoicePrintActions } from '@/components/print/InvoicePrintActions';
import SimpleModal from '@/components/modals/SimpleModal';
import { RackPullList } from '@/components/items/RackPullList';
import { useToast } from '@/contexts/ToastContext';
import Barcode from '@/components/ui/Barcode';
import { receiptAddress, receiptPhone, receiptSubtitle } from '@/lib/branch-scope';

interface RentalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  /** Sends the receipt to the customer's WhatsApp on open. Set it right after a payment. */
  autoSendWhatsApp?: boolean;
}

export function RentalInvoiceModal({ isOpen, onClose, rental, autoSendWhatsApp = false }: RentalInvoiceModalProps) {
  const { error: toastError } = useToast();

  if (!isOpen || !rental) return null;

  // Generate invoice number
  const invoiceNumber = rentalInvoiceNumber(rental);
  const shopSubtitle = receiptSubtitle(rental.branch?.receipt_subtitle);
  const shopAddress = receiptAddress(rental.branch?.address);
  const shopPhone = receiptPhone(rental.branch?.phone);

  // Bprint-style date formats (match backend bprint & booking invoice)
  const bprintDateTime = (d: string | Date) => {
    const x = new Date(d);
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const bprintDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const customerName = rental.customer
    ? [rental.customer.first_name, rental.customer.last_name].filter(Boolean).join(' ').trim() || '-'
    : '-';
  const items = (rental.items || rental.booking?.items || []) as Array<{
    item?: { name?: string; code?: string; size?: { label?: string } };
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_amount?: number;
  }>;
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.total_price || (item.unit_price || 0) * (item.quantity || 1)), 0);
  const itemsDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
  const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);
  const refundableDeposit = Math.max((rental.security_deposit || 0) - (rental.damage_charges || 0), 0);
  const rackItems = items.map((line) => ({
    name: line.item?.name || 'Item',
    code: line.item?.code,
    size: line.item?.size?.label,
    quantity: line.quantity,
  }));

  const downloadInvoice = async () => {
    if (!rental) return;
    try {
      await downloadReceiptPdf(`invoice_${invoiceNumber}.pdf`);
    } catch (error) {
      toastError('Could not generate PDF', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <>
      <SimpleModal
        isOpen={isOpen}
        onClose={onClose}
        title="Rental Invoice"
        size="xl"
        nested
        footer={
          <InvoicePrintActions
            onClose={onClose}
            onDownload={downloadInvoice}
            printInvoice={() => printRentalInvoice(rental)}
            printBarcode={() => printRentalInvoice(rental, { barcodeOnly: true })}
            whatsapp={{
              kind: 'rental',
              id: rental.id,
              invoiceNumber,
              customerPhone: rental.customer?.phone,
              autoSend: autoSendWhatsApp,
            }}
          />
        }
      >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-full max-w-[420px]">
              <RackPullList items={rackItems} />
            </div>
            <div className="w-full max-w-[420px] rounded-2xl bg-white ring-1 ring-black/10 shadow-sm px-3 py-3">
              <div className="thermal-receipt-container">
                <div className="thermal-receipt" data-testid="thermal-receipt">
              {/* Company Header - same as bprint/booking */}
              <div className="receipt-center">
                <div className="receipt-title">SUITLABS BALI</div>
                <div className="receipt-subtitle">{shopSubtitle}</div>
                <div className="receipt-line">{shopAddress}</div>
                {shopPhone && <div className="receipt-line">TEL: {shopPhone}</div>}
              </div>

              <div className="receipt-divider"></div>

              {/* Invoice & rental info - same as bprint */}
              <div className="receipt-line">Invoice: {invoiceNumber}</div>
              <div className="receipt-line">Date: {bprintDateTime(new Date())}</div>
              <div className="receipt-line">Rental ID: {rental.id.slice(-8)}</div>
              <div className="receipt-line">Status: {rental.status.toUpperCase()}</div>
              {invoiceNumber && (
                <div className="receipt-barcode">
                  <Barcode
                    value={invoiceBarcodeValue(invoiceNumber)}
                    format="CODE128"
                    width={3}
                    height={120}
                    fontSize={10}
                    margin={0}
                    displayValue={false}
                  />
                </div>
              )}

              <div className="receipt-divider"></div>

              {/* Customer - name only, same as bprint */}
              <div className="receipt-label">CUSTOMER:</div>
              <div className="receipt-line">{customerName}</div>

              <div className="receipt-divider"></div>

              <div className="receipt-line">Rental: {bprintDate(rental.rental_date)}</div>
              <div className="receipt-line">Return: {bprintDate(rental.return_date)}</div>

              <div className="receipt-divider"></div>

              <div className="receipt-label">ITEMS:</div>
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const itemName = item.item?.name || 'Item';
                  const itemSize = item.item?.size?.label || '';
                  const description = itemSize ? `${itemName} - ${itemSize}` : itemName;
                  const quantity = item.quantity || 1;
                  const unitPrice = item.unit_price || item.total_price || 0;
                  const itemTotal = item.total_price || unitPrice * quantity;
                  return (
                    <div key={idx} className="receipt-item">
                      <div className="receipt-line">  {description}</div>
                      <div className="receipt-line">    {quantity} x {formatCurrency(unitPrice)} = {formatCurrency(itemTotal)}</div>
                    </div>
                  );
                })
              ) : (
                <div className="receipt-line">Rental Package</div>
              )}

              <div className="receipt-divider"></div>

              <div className="receipt-line">Subtotal: {formatCurrency(itemsSubtotal || rental.total_cost || 0)}</div>
              {itemsDiscount > 0 && (
                <div className="receipt-line receipt-discount">Discount: ({formatCurrency(itemsDiscount)})</div>
              )}
              {(rental.late_fee || 0) > 0 && (
                <div className="receipt-line">Late Fee: {formatCurrency(rental.late_fee || 0)}</div>
              )}
              {(rental.damage_charges || 0) > 0 && (
                <div className="receipt-line">Damage: {formatCurrency(rental.damage_charges || 0)}</div>
              )}
              <div className="receipt-total">GRAND TOTAL: {formatCurrency(total)}</div>
              {(rental.transaction_fee || 0) > 0 && (
                <div className="receipt-line">{TRANSACTION_FEE_LABEL}: {formatCurrency(rental.transaction_fee || 0)}</div>
              )}
              {(rental.security_deposit || 0) > 0 && (
                <>
                  <div className="receipt-line">Deposit: {formatCurrency(rental.security_deposit || 0)}</div>
                  {(rental.damage_charges || 0) > 0 && (
                    <div className="receipt-line receipt-discount">Deduction: ({formatCurrency(rental.damage_charges || 0)})</div>
                  )}
                  <div className="receipt-line">Refundable: {formatCurrency(refundableDeposit)}</div>
                </>
              )}

              {(rental.actual_pickup_date || rental.actual_return_date) && (
                <>
                  <div className="receipt-divider"></div>
                  {rental.actual_pickup_date && <div className="receipt-line">Pickup: {bprintDate(rental.actual_pickup_date)}</div>}
                  {rental.actual_return_date && <div className="receipt-line">Returned: {bprintDate(rental.actual_return_date)}</div>}
                </>
              )}

              {rental.notes && (
                <>
                  <div className="receipt-divider"></div>
                  <div className="receipt-label">NOTE:</div>
                  <div className="receipt-line">{rental.notes}</div>
                </>
              )}

              <div className="receipt-divider"></div>
              <div className="receipt-center">
                <div className="receipt-line">Thank you for using SuitLabs!</div>
                <div className="receipt-line receipt-small">suitlabs.bali</div>
              </div>
            </div>
          </div>
            </div>
          </div>
      </SimpleModal>

      {/* Thermal Receipt Styles - same as booking invoice */}
      <style data-thermal-receipt dangerouslySetInnerHTML={{ __html: RECEIPT_STYLES }} />
    </>
  );
}

export default RentalInvoiceModal;