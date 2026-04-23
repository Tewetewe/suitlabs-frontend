'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { Rental } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getAndroidBluetoothRentalInvoiceUrl, getBprintRentalInvoiceUrl } from '@/lib/bprint';
import SimpleModal from '@/components/modals/SimpleModal';

interface RentalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export function RentalInvoiceModal({ isOpen, onClose, rental }: RentalInvoiceModalProps) {
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (!isOpen || !rental) return null;

  const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);
  const refundableDeposit = Math.max((rental.security_deposit || 0) - (rental.damage_charges || 0), 0);

  // Get items from rental or booking
  const items = (rental.items || rental.booking?.items || []) as Array<{
    item?: { name?: string; size?: { label?: string } };
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_amount?: number;
  }>;
  
  // Generate invoice number
  const invoiceNumber = `INV-${rental.id.slice(-8).toUpperCase()}`;

  // Bprint-style date formats (match backend bprint & booking invoice)
  const bprintDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const bprintDateTime = (d: string | Date) => {
    const x = new Date(d);
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const customerName = rental.customer
    ? [rental.customer.first_name, rental.customer.last_name].filter(Boolean).join(' ').trim() || '-'
    : '-';

  const printInvoice = () => {
    if (!rental) return;

    // Build invoice HTML content (same layout as booking invoice)
    const buildInvoiceHTML = () => {
      const itemsHTML = items.length > 0 ? (
        items.map((item) => {
          const itemName = item.item?.name || 'Item';
          const itemSize = item.item?.size?.label || '';
          const description = itemSize ? `${itemName} - ${itemSize}` : itemName;
          const quantity = item.quantity || 1;
          const unitPrice = item.unit_price || item.total_price || 0;
          const itemTotal = item.total_price || unitPrice * quantity;
          return `
            <div class="receipt-item">
              <div class="receipt-line">  ${description}</div>
              <div class="receipt-line">    ${quantity} x ${formatCurrency(unitPrice)} = ${formatCurrency(itemTotal)}</div>
            </div>
          `;
        }).join('')
      ) : '<div class="receipt-line">Rental Package</div>';

      return `
        <div class="thermal-receipt-container">
          <div class="thermal-receipt">
            <div class="receipt-center">
              <div class="receipt-title">SUITLABS BALI</div>
              <div class="receipt-subtitle">Sewa Jas Jimbaran & Nusadua</div>
              <div class="receipt-line">Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362</div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-line">Invoice: ${invoiceNumber}</div>
            <div class="receipt-line">Date: ${bprintDateTime(new Date())}</div>
            <div class="receipt-line">Rental ID: ${rental.id.slice(-8)}</div>
            <div class="receipt-line">Status: ${rental.status.toUpperCase()}</div>
            <div class="receipt-divider"></div>
            <div class="receipt-label">CUSTOMER:</div>
            <div class="receipt-line">${customerName}</div>
            <div class="receipt-divider"></div>
            <div class="receipt-line">Rental: ${bprintDate(rental.rental_date)}</div>
            <div class="receipt-line">Return: ${bprintDate(rental.return_date)}</div>
            <div class="receipt-divider"></div>
            <div class="receipt-label">ITEMS:</div>
            ${itemsHTML}
            <div class="receipt-divider"></div>
            <div class="receipt-line">Subtotal: ${formatCurrency(itemsSubtotal || rental.total_cost || 0)}</div>
            ${itemsDiscount > 0 ? `<div class="receipt-line receipt-discount">Discount: (${formatCurrency(itemsDiscount)})</div>` : ''}
            ${(rental.late_fee || 0) > 0 ? `<div class="receipt-line">Late Fee: ${formatCurrency(rental.late_fee || 0)}</div>` : ''}
            ${(rental.damage_charges || 0) > 0 ? `<div class="receipt-line">Damage: ${formatCurrency(rental.damage_charges || 0)}</div>` : ''}
            <div class="receipt-total">GRAND TOTAL: ${formatCurrency(total)}</div>
            ${(rental.security_deposit || 0) > 0 ? `
              <div class="receipt-line">Deposit: ${formatCurrency(rental.security_deposit || 0)}</div>
              ${(rental.damage_charges || 0) > 0 ? `<div class="receipt-line receipt-discount">Deduction: (${formatCurrency(rental.damage_charges || 0)})</div>` : ''}
              <div class="receipt-line">Refundable: ${formatCurrency(refundableDeposit)}</div>
            ` : ''}
            ${(rental.actual_pickup_date || rental.actual_return_date) ? `
              <div class="receipt-divider"></div>
              ${rental.actual_pickup_date ? `<div class="receipt-line">Pickup: ${bprintDate(rental.actual_pickup_date)}</div>` : ''}
              ${rental.actual_return_date ? `<div class="receipt-line">Returned: ${bprintDate(rental.actual_return_date)}</div>` : ''}
            ` : ''}
            ${rental.notes ? `
              <div class="receipt-divider"></div>
              <div class="receipt-label">NOTE:</div>
              <div class="receipt-line">${rental.notes}</div>
            ` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-center">
              <div class="receipt-line">Thank you for using SuitLabs!</div>
              <div class="receipt-line receipt-small">suitlabs.bali</div>
            </div>
          </div>
        </div>
      `;
    };

    // Create a new window with only the invoice
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      alert('Please allow popups to print invoice');
      return;
    }

    // Complete HTML with all styles
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          @media print {
            @page {
              size: 58mm auto;
              margin: 0;
              width: 58mm;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            width: 58mm !important;
            max-width: 58mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            font-family: 'Courier New', monospace;
          }
          .thermal-receipt-container {
            width: 58mm !important;
            max-width: 58mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .thermal-receipt {
            width: 58mm !important;
            max-width: 58mm !important;
            padding: 8mm 6mm !important;
            margin: 0 !important;
            background: white !important;
            font-family: 'Courier New', monospace !important;
            font-size: 9px !important;
            line-height: 1.4 !important;
            color: #000 !important;
          }
          .receipt-center {
            text-align: center;
            margin-bottom: 6px;
          }
          .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
          }
          .receipt-subtitle {
            font-size: 8px;
            color: #666;
            margin-bottom: 4px;
          }
          .receipt-line {
            font-size: 9px;
            line-height: 1.4;
            margin-bottom: 2px;
            word-wrap: break-word;
          }
          .receipt-label {
            font-weight: bold;
            font-size: 9px;
            margin-bottom: 3px;
          }
          .receipt-small {
            font-size: 7px;
            color: #666;
          }
          .receipt-divider {
            border-top: 1px dashed #999;
            margin: 6px 0;
          }
          .receipt-item {
            margin-bottom: 4px;
          }
          .receipt-discount {
            color: #d32f2f;
          }
          .receipt-bold {
            font-weight: bold;
          }
          .receipt-total {
            font-weight: bold;
            font-size: 10px;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid #333;
          }
        </style>
      </head>
      <body>
        ${buildInvoiceHTML()}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrint = () => {
    // Prefer native bprint flows on mobile; fall back to browser print.
    if (isIOS) {
      window.location.href = getBprintRentalInvoiceUrl(rental.id);
      return;
    }
    if (isAndroid) {
      window.location.href = getAndroidBluetoothRentalInvoiceUrl(rental.id);
      return;
    }
    printInvoice();
  };

  const downloadInvoice = async () => {
    if (!rental) return;

    // Get the receipt container - prefer the visible one in the modal
    let receiptContainer = document.querySelector('.thermal-receipt-container') as HTMLElement;
    if (!receiptContainer) {
      receiptContainer = document.querySelector('.print-only-invoice .thermal-receipt-container') as HTMLElement;
    }

    if (!receiptContainer) {
      alert('Invoice element not found. Please try again.');
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
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Calculate totals
  const itemsSubtotal = items.reduce((sum, item) => {
    const itemTotal = item.total_price || (item.unit_price || 0) * (item.quantity || 1);
    return sum + itemTotal;
  }, 0);
  const itemsDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);

  return (
    <>
      {/* Print-only copy - always at top of body, hidden on screen (same layout as booking) */}
      <div className="print-only-invoice" style={{ display: 'none' }}>
        <div className="thermal-receipt-container">
          <div className="thermal-receipt">
            {/* Company Header - same as bprint/booking */}
            <div className="receipt-center">
              <div className="receipt-title">SUITLABS BALI</div>
              <div className="receipt-subtitle">Sewa Jas Jimbaran & Nusadua</div>
              <div className="receipt-line">Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice & rental info - same as bprint */}
            <div className="receipt-line">Invoice: {invoiceNumber}</div>
            <div className="receipt-line">Date: {bprintDateTime(new Date())}</div>
            <div className="receipt-line">Rental ID: {rental.id.slice(-8)}</div>
            <div className="receipt-line">Status: {rental.status.toUpperCase()}</div>

            <div className="receipt-divider"></div>

            {/* Customer - name only, same as bprint */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{customerName}</div>

            <div className="receipt-divider"></div>

            {/* Rental period */}
            <div className="receipt-line">Rental: {bprintDate(rental.rental_date)}</div>
            <div className="receipt-line">Return: {bprintDate(rental.return_date)}</div>

            <div className="receipt-divider"></div>

            {/* Items - same format as booking */}
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

            {/* Summary - same as bprint */}
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

            {/* Actual dates */}
            {(rental.actual_pickup_date || rental.actual_return_date) && (
              <>
                <div className="receipt-divider"></div>
                {rental.actual_pickup_date && <div className="receipt-line">Pickup: {bprintDate(rental.actual_pickup_date)}</div>}
                {rental.actual_return_date && <div className="receipt-line">Returned: {bprintDate(rental.actual_return_date)}</div>}
              </>
            )}

            {/* Notes */}
            {rental.notes && (
              <>
                <div className="receipt-divider"></div>
                <div className="receipt-label">NOTE:</div>
                <div className="receipt-line">{rental.notes}</div>
              </>
            )}

            {/* Footer - same as bprint/booking */}
            <div className="receipt-divider"></div>
            <div className="receipt-center">
              <div className="receipt-line">Thank you for using SuitLabs!</div>
              <div className="receipt-line receipt-small">suitlabs.bali</div>
            </div>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <SimpleModal
          isOpen={isOpen}
          onClose={onClose}
          title="Rental Invoice"
          size="xl"
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Close
              </Button>
              <Button variant="outline" onClick={downloadInvoice} className="w-full sm:w-auto">
                Download
              </Button>
              <Button onClick={handlePrint} className="w-full sm:w-auto">
                Print
              </Button>
            </div>
          }
        >
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[420px] rounded-2xl bg-white ring-1 ring-black/10 shadow-sm px-3 py-3">
              <div className="thermal-receipt-container">
                <div className="thermal-receipt">
              {/* Company Header - same as bprint/booking */}
              <div className="receipt-center">
                <div className="receipt-title">SUITLABS BALI</div>
                <div className="receipt-subtitle">Sewa Jas Jimbaran & Nusadua</div>
                <div className="receipt-line">Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362</div>
              </div>

              <div className="receipt-divider"></div>

              {/* Invoice & rental info - same as bprint */}
              <div className="receipt-line">Invoice: {invoiceNumber}</div>
              <div className="receipt-line">Date: {bprintDateTime(new Date())}</div>
              <div className="receipt-line">Rental ID: {rental.id.slice(-8)}</div>
              <div className="receipt-line">Status: {rental.status.toUpperCase()}</div>

              <div className="receipt-divider"></div>

              {/* Customer - name only, same as bprint */}
              <div className="receipt-label">CUSTOMER:</div>
              <div className="receipt-line">{customerName}</div>

              <div className="receipt-divider"></div>

              {/* Rental period */}
              <div className="receipt-line">Rental: {bprintDate(rental.rental_date)}</div>
              <div className="receipt-line">Return: {bprintDate(rental.return_date)}</div>

              <div className="receipt-divider"></div>

              {/* Items - same format as booking */}
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

              {/* Summary - same as bprint */}
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

              {/* Actual dates */}
              {(rental.actual_pickup_date || rental.actual_return_date) && (
                <>
                  <div className="receipt-divider"></div>
                  {rental.actual_pickup_date && <div className="receipt-line">Pickup: {bprintDate(rental.actual_pickup_date)}</div>}
                  {rental.actual_return_date && <div className="receipt-line">Returned: {bprintDate(rental.actual_return_date)}</div>}
                </>
              )}

              {/* Notes */}
              {rental.notes && (
                <>
                  <div className="receipt-divider"></div>
                  <div className="receipt-label">NOTE:</div>
                  <div className="receipt-line">{rental.notes}</div>
                </>
              )}

              {/* Footer - same as bprint/booking */}
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
      </div>

      {/* Thermal Receipt Styles - same as booking invoice */}
      <style jsx global data-thermal-receipt>{`
        .thermal-receipt-container {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .thermal-receipt {
          width: 58mm;
          max-width: 58mm;
          margin: 0 auto;
          padding: 8px 6px;
          background: white;
          font-family: 'Courier New', monospace;
          font-size: 9px;
          line-height: 1.4;
          color: #000;
        }

        .receipt-center {
          text-align: center;
          margin-bottom: 6px;
        }

        .receipt-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 3px;
          letter-spacing: 0.5px;
        }

        .receipt-subtitle {
          font-size: 8px;
          color: #666;
          margin-bottom: 4px;
        }

        .receipt-line {
          font-size: 9px;
          line-height: 1.4;
          margin-bottom: 2px;
          word-wrap: break-word;
        }

        .receipt-label {
          font-weight: bold;
          font-size: 9px;
          margin-bottom: 3px;
        }

        .receipt-small {
          font-size: 7px;
          color: #666;
        }

        .receipt-divider {
          border-top: 1px dashed #999;
          margin: 6px 0;
        }

        .receipt-item {
          margin-bottom: 4px;
        }

        .receipt-discount {
          color: #d32f2f;
        }

        .receipt-bold {
          font-weight: bold;
        }

        .receipt-total {
          font-weight: bold;
          font-size: 10px;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px solid #333;
        }

        /* Hide print-only invoice on screen */
        .print-only-invoice {
          display: none !important;
        }

        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html {
            margin: 0 !important;
            padding: 0 !important;
            width: 58mm !important;
            height: auto !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 58mm !important;
            height: auto !important;
            min-height: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          
          /* Hide everything */
          body > * {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Show only the print-only invoice */
          .print-only-invoice {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 58mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            z-index: 999999 !important;
          }
          
          .print-only-invoice .thermal-receipt-container {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            width: 58mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .print-only-invoice .thermal-receipt {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 58mm !important;
            max-width: 58mm !important;
            padding: 8mm 6mm !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            display: block !important;
            visibility: visible !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .print-only-invoice * {
            visibility: visible !important;
          }
          
        }
      `}</style>
    </>
  );
}

export default RentalInvoiceModal;