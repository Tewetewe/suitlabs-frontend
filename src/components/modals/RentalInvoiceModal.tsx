'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Rental } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { printRentalInvoice } from '@/lib/print-router';
import { RECEIPT_STYLES } from '@/lib/receipt-styles';
import { invoiceBarcodeValue, rentalInvoiceNumber } from '@/lib/barcode';
import { formatCurrency } from '@/lib/currency';
import { ThermalPrinterButton } from '@/components/print/ThermalPrinterButton';
import SimpleModal from '@/components/modals/SimpleModal';
import { RackPullList } from '@/components/items/RackPullList';
import { useToast } from '@/contexts/ToastContext';
import Barcode from '@/components/ui/Barcode';

interface RentalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export function RentalInvoiceModal({ isOpen, onClose, rental }: RentalInvoiceModalProps) {
  const { error: toastError, success } = useToast();

  if (!isOpen || !rental) return null;

  // Generate invoice number
  const invoiceNumber = rentalInvoiceNumber(rental);
  const shopSubtitle = rental.branch?.receipt_subtitle || 'Sewa Jas Jimbaran';
  const shopAddress = rental.branch?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362';

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
    item?: { name?: string; size?: { label?: string } };
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

  const handlePrint = async () => {
    try {
      const { route } = await printRentalInvoice(rental);
      if (route === 'thermal') {
        success('Sent to the printer', 'Cash drawer opened.');
      }
    } catch (err) {
      toastError('Could not print', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const downloadInvoice = async () => {
    if (!rental) return;

    const receiptContainer = document.querySelector('.thermal-receipt-container') as HTMLElement;

    if (!receiptContainer) {
      toastError('Invoice not ready', 'Please try again.');
      return;
    }

    // Clone the entire container to preserve all styles
    const clone = receiptContainer.cloneNode(true) as HTMLElement;

    // Create a temporary visible container for html2canvas
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '58mm';
    tempContainer.style.maxWidth = '58mm';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.zIndex = '99999';
    tempContainer.style.visibility = 'visible';
    tempContainer.style.display = 'block';

    // Copy computed styles to ensure proper rendering
    const computedStyle = window.getComputedStyle(receiptContainer);
    tempContainer.style.fontFamily = computedStyle.fontFamily || "'Courier New', monospace";

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      // Wait for the clone to be fully rendered
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get the cloned receipt element
      const clonedReceipt = tempContainer.querySelector('.thermal-receipt') as HTMLElement;
      if (!clonedReceipt) {
        throw new Error('Cloned receipt element not found');
      }

      // Get dimensions from the original or use defaults
      const width = receiptContainer.offsetWidth || 219; // 58mm ≈ 219px at 96dpi
      const height = clonedReceipt.scrollHeight || clonedReceipt.offsetHeight || 800;

      // Convert HTML to canvas with optimized settings for quality
      const canvas = await html2canvas(clonedReceipt, {
        scale: 1.8,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: width,
        height: height,
        allowTaint: false,
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Validate canvas
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas is empty or invalid. Please ensure the invoice is visible.');
      }

      // Calculate PDF dimensions (58mm width)
      const imgWidth = 58;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight],
        compress: true,
      });

      // Convert canvas to JPEG with optimized quality
      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      // Validate data URL
      if (!imgData || !imgData.startsWith('data:image/jpeg;base64,')) {
        throw new Error('Invalid image data generated');
      }

      // Add image to PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Save PDF with invoice number as filename
      pdf.save(`invoice_${invoiceNumber}.pdf`);
    } catch (error) {
      // Clean up temp container if it still exists
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
      console.error('Error generating PDF:', error);
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
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
            <ThermalPrinterButton className="w-full sm:w-auto" />
            <Button variant="outline" onClick={downloadInvoice} className="w-full sm:w-auto">
              Download
            </Button>
            <Button onClick={handlePrint} className="w-full sm:w-auto" data-testid="print-invoice">
              Print
            </Button>
          </div>
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
                    width={1.1}
                    height={36}
                    fontSize={8}
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