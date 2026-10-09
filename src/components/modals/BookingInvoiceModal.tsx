'use client';

import React from 'react';
import { InvoiceData } from '@/types';
import { downloadReceiptPdf } from '@/lib/receipt-image';
import { printBookingInvoice } from '@/lib/print-router';
import { RECEIPT_STYLES } from '@/lib/receipt-styles';
import { invoiceBarcodeValue } from '@/lib/barcode';
import { formatCurrency } from '@/lib/currency';
import { receiptTotals } from '@/lib/receipt-totals';
import { InvoicePrintActions } from '@/components/print/InvoicePrintActions';
import SimpleModal from '@/components/modals/SimpleModal';
import { RackPullList } from '@/components/items/RackPullList';
import { useToast } from '@/contexts/ToastContext';
import Barcode from '@/components/ui/Barcode';
import { receiptAddress, receiptHours, receiptPhone, receiptSubtitle } from '@/lib/branch-scope';

interface BookingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
  /** Sends the receipt to the customer's WhatsApp on open. Set it right after a payment. */
  autoSendWhatsApp?: boolean;
}

export function BookingInvoiceModal({ isOpen, onClose, invoice, autoSendWhatsApp = false }: BookingInvoiceModalProps) {
  const { error: toastError } = useToast();

  if (!isOpen || !invoice) return null;

  const shopPhone = receiptPhone(invoice.company?.phone);
  const shopHours = receiptHours(invoice.company?.hours);

  const rackItems = (invoice.items || [])
    .filter((item) => item.item_code || (item.description && !item.description.toUpperCase().includes('PACKAGE')))
    .map((item) => ({
      name: item.description.replace(/^\s*[•\-]\s*/, '').replace(/^Add-on:\s*/i, ''),
      code: item.item_code,
      quantity: item.quantity,
    }));

  const isPackagePricing = Boolean(
    invoice.items?.length &&
    invoice.items.every((item) => (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) &&
    (invoice.total_amount || 0) > 0
  );

  const owing = (invoice.final_amount || invoice.total_amount || 0) - (invoice.paid_amount || 0) > 0.009;
  const totals = receiptTotals({
    subtotal: invoice.total_amount || 0,
    discount: invoice.discount_amount,
    fee: invoice.transaction_fee,
    paid: invoice.paid_amount || 0,
    owed: invoice.final_amount || invoice.total_amount || 0,
  });

  // Bprint-style date formats (match backend bprint)
  const bprintDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const bprintDateTime = (d: string | Date) => {
    const x = new Date(d);
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const downloadInvoice = async () => {
    if (!invoice) return;
    try {
      await downloadReceiptPdf(`invoice_${invoice.invoice_number}.pdf`);
    } catch (error) {
      toastError('Could not generate PDF', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <>
      <SimpleModal
        isOpen={isOpen}
        onClose={onClose}
        title="Booking Invoice"
        size="xl"
        nested
        footer={
          <InvoicePrintActions
            onClose={onClose}
            onDownload={downloadInvoice}
            printInvoice={() => printBookingInvoice(invoice)}
            printBarcode={() => printBookingInvoice(invoice, { barcodeOnly: true })}
            whatsapp={{
              kind: 'booking',
              id: invoice.booking_id,
              invoiceNumber: invoice.invoice_number,
              customerPhone: invoice.customer_phone,
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
                  {/* Company Header - same as bprint */}
                  <div className="receipt-center">
                    <div className="receipt-title">SUITLABS BALI</div>
                    <div className="receipt-subtitle">{receiptSubtitle(invoice.company?.subtitle)}</div>
                    <div className="receipt-line">{receiptAddress(invoice.company?.address)}</div>
                    {shopPhone && <div className="receipt-line">{shopPhone}</div>}
                    {shopHours.map((hours) => <div key={hours} className="receipt-line">{hours}</div>)}
                  </div>

                  <div className="receipt-divider"></div>

                  {/* Invoice & booking info - same as bprint */}
                  <div className="receipt-line">Invoice: {invoice.invoice_number}</div>
                  <div className="receipt-line">Date: {bprintDateTime(invoice.generated_at || new Date())}</div>
                  <div className="receipt-line">Booking ID: {invoice.booking_id.slice(-8)}</div>
                  <div className="receipt-line">Type: {invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
                  {/* Due is the day the rest must be paid, the Pickup date, so it shows only while money is owed. */}
                  {owing && invoice.booking_date && <div className="receipt-line">Due: {bprintDate(invoice.booking_date)}</div>}
                  <div className="receipt-line">Status: {invoice.payment_status?.toUpperCase() || 'PENDING'}</div>
                  {invoice.booking_date && <div className="receipt-line">Booking: {bprintDate(invoice.booking_date)}</div>}
                  {invoice.invoice_number && (
                    <div className="receipt-barcode">
                      <Barcode
                        value={invoiceBarcodeValue(invoice.invoice_number)}
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
                  <div className="receipt-line">{invoice.customer_name}</div>

                  <div className="receipt-divider"></div>

                  <div className="receipt-label">ITEMS:</div>
                  {invoice.items && invoice.items.length > 0 ? (
                    <>
                      {invoice.items.map((item, idx) => {
                        if ((item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
                          return (
                            <div key={idx} className="receipt-item">
                              <div className="receipt-line">  {item.description}</div>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="receipt-item">
                            <div className="receipt-line">  {item.description}</div>
                            <div className="receipt-line">    {item.quantity} x {formatCurrency(item.unit_price || 0)} = {formatCurrency(item.total || 0)}</div>
                          </div>
                        );
                      })}
                      {isPackagePricing && (invoice.total_amount || 0) > 0 && (
                        <div className="receipt-line">Package: {formatCurrency(invoice.total_amount || 0)}</div>
                      )}
                    </>
                  ) : (
                    <div className="receipt-line">{invoice.product_name || 'Booking Package'}</div>
                  )}

                  <div className="receipt-divider"></div>

                  {totals.map((line) => (
                    <div
                      key={line.label}
                      className={line.kind === 'total' ? 'receipt-total' : line.kind === 'discount' ? 'receipt-line receipt-discount' : 'receipt-line'}
                    >
                      {line.label}: {line.kind === 'discount' ? `(${formatCurrency(line.amount)})` : formatCurrency(line.amount)}
                    </div>
                  ))}

                  {invoice.notes?.trim() && (
                    <>
                      <div className="receipt-divider"></div>
                      <div className="receipt-label">NOTE:</div>
                      <div className="receipt-line">{invoice.notes.trim()}</div>
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

      {/* Thermal Receipt Styles */}
      <style data-thermal-receipt dangerouslySetInnerHTML={{ __html: RECEIPT_STYLES }} />
    </>
  );
}

export default BookingInvoiceModal;
