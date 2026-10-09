'use client';

import React from 'react';
import { Sale } from '@/types';
import { downloadReceiptPdf } from '@/lib/receipt-image';
import { printSaleInvoice } from '@/lib/print-router';
import { RECEIPT_STYLES } from '@/lib/receipt-styles';
import { invoiceBarcodeValue, saleInvoiceNumber } from '@/lib/barcode';
import { formatCurrency } from '@/lib/currency';
import { receiptTotals } from '@/lib/receipt-totals';
import { InvoicePrintActions } from '@/components/print/InvoicePrintActions';
import SimpleModal from '@/components/modals/SimpleModal';
import { RackPullList } from '@/components/items/RackPullList';
import { useToast } from '@/contexts/ToastContext';
import Barcode from '@/components/ui/Barcode';
import { receiptAddress, receiptHours, receiptPhone, receiptSubtitle } from '@/lib/branch-scope';
import { customerItemName } from '@/lib/item-name';

interface SaleInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  /** Sends the receipt to the customer's WhatsApp on open. Set it right after a payment. */
  autoSendWhatsApp?: boolean;
}

export function SaleInvoiceModal({ isOpen, onClose, sale, autoSendWhatsApp = false }: SaleInvoiceModalProps) {
  const { error: toastError } = useToast();

  if (!isOpen || !sale) return null;

  const invoiceNumber = saleInvoiceNumber(sale);
  const totals = receiptTotals({
    subtotal: sale.subtotal || 0,
    discount: sale.discount_amount,
    fee: sale.transaction_fee,
    paid: sale.paid_amount || 0,
    owed: sale.total_amount || 0,
  });
  const shopSubtitle = receiptSubtitle(sale.branch?.receipt_subtitle);
  const shopAddress = receiptAddress(sale.branch?.address);
  const shopPhone = receiptPhone(sale.branch?.phone);
  const shopHours = receiptHours(sale.branch?.opening_hours);
  const bprintDateTime = (d: string | Date) => {
    const x = new Date(d);
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const customerName = sale.customer
    ? [sale.customer.first_name, sale.customer.last_name].filter(Boolean).join(' ').trim() || 'Walk-in'
    : 'Walk-in';
  const rackItems = (sale.items || []).map((line) => ({
    name: line.item?.name || 'Item',
    code: line.item?.code,
    size: line.item?.size?.label,
    quantity: line.quantity,
  }));

  const downloadInvoice = async () => {
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
        title="Sale Invoice"
        size="xl"
        nested
        footer={
          <InvoicePrintActions
            onClose={onClose}
            onDownload={downloadInvoice}
            printInvoice={() => printSaleInvoice(sale)}
            printBarcode={() => printSaleInvoice(sale, { barcodeOnly: true })}
            whatsapp={{
              kind: 'sale',
              id: sale.id,
              invoiceNumber,
              customerPhone: sale.customer?.phone,
              customerId: sale.customer?.id,
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
                <div className="receipt-center">
                  <div className="receipt-title">SUITLABS BALI</div>
                  <div className="receipt-subtitle">{shopSubtitle}</div>
                  <div className="receipt-line">{shopAddress}</div>
                  {shopPhone && <div className="receipt-line">{shopPhone}</div>}
                  {shopHours.map((hours) => <div key={hours} className="receipt-line">{hours}</div>)}
                </div>
                <div className="receipt-divider"></div>
                <div className="receipt-line">Invoice: {invoiceNumber}</div>
                <div className="receipt-line">Date: {bprintDateTime(sale.created_at || new Date())}</div>
                <div className="receipt-line">Sale: {invoiceNumber}</div>
                <div className="receipt-line">Status: {(sale.status || 'completed').toUpperCase()}</div>
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
                <div className="receipt-label">CUSTOMER:</div>
                <div className="receipt-line">{customerName}</div>

                <div className="receipt-divider"></div>

                <div className="receipt-label">ITEMS:</div>
                {(sale.items || []).length > 0 ? (
                  (sale.items || []).map((line) => {
                    const name = customerItemName(line.item) || 'Item';
                    const size = line.item?.size?.label ? ` - ${line.item.size.label}` : '';
                    return (
                      <div key={line.id} className="receipt-item">
                        <div className="receipt-line">  {name}{size}</div>
                        <div className="receipt-line">    {line.quantity} x {formatCurrency(line.unit_price || 0)} = {formatCurrency(line.line_total || 0)}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="receipt-line">Sale</div>
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
      <style data-thermal-receipt dangerouslySetInnerHTML={{ __html: RECEIPT_STYLES }} />
    </>
  );
}

export default SaleInvoiceModal;
