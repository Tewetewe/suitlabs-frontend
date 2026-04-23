'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { InvoiceData } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getAndroidBluetoothBookingInvoiceUrl, getBprintBookingInvoiceUrl } from '@/lib/bprint';
import SimpleModal from '@/components/modals/SimpleModal';

interface BookingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function BookingInvoiceModal({ isOpen, onClose, invoice }: BookingInvoiceModalProps) {
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (!isOpen || !invoice) return null;

  // Bprint-style date formats (match backend bprint)
  const bprintDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const bprintDateTime = (d: string | Date) => {
    const x = new Date(d);
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const printInvoice = () => {
    if (!invoice) return;

    // Build invoice HTML content
    const buildInvoiceHTML = () => {
      const itemsHTML = invoice.items && invoice.items.length > 0 ? (
        invoice.items.map((item) => {
          if (isPackagePricing && (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
            return `<div class="receipt-item"><div class="receipt-line">  ${item.description}</div></div>`;
          }
          return `
            <div class="receipt-item">
              <div class="receipt-line">  ${item.description}</div>
              <div class="receipt-line">    ${item.quantity} x ${formatCurrency(item.unit_price || 0)} = ${formatCurrency(item.total || 0)}</div>
            </div>
          `;
        }).join('') + (isPackagePricing && (invoice.total_amount || 0) > 0 ? `<div class="receipt-line">Package: ${formatCurrency(invoice.total_amount || 0)}</div>` : '')
      ) : `<div class="receipt-line">${invoice.product_name || 'Booking Package'}</div>`;

      return `
        <div class="thermal-receipt-container">
          <div class="thermal-receipt">
            <div class="receipt-center">
              <div class="receipt-title">SUITLABS BALI</div>
              <div class="receipt-subtitle">Sewa Jas Jimbaran & Nusadua</div>
              <div class="receipt-line">${invoice.company?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362'}</div>
              ${invoice.company?.phone ? `<div class="receipt-line">TEL: ${invoice.company.phone}</div>` : ''}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-line">Invoice: ${invoice.invoice_number}</div>
            <div class="receipt-line">Date: ${bprintDateTime(invoice.generated_at || new Date())}</div>
            <div class="receipt-line">Booking ID: ${invoice.booking_id.slice(-8)}</div>
            <div class="receipt-line">Type: ${invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
            ${invoice.due_date ? `<div class="receipt-line">Due: ${bprintDate(invoice.due_date)}</div>` : ''}
            <div class="receipt-line">Status: ${invoice.payment_status?.toUpperCase() || 'PENDING'}</div>
            ${invoice.booking_date ? `<div class="receipt-line">Booking: ${bprintDate(invoice.booking_date)}</div>` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-label">CUSTOMER:</div>
            <div class="receipt-line">${invoice.customer_name}</div>
            <div class="receipt-divider"></div>
            <div class="receipt-label">ITEMS:</div>
            ${itemsHTML}
            <div class="receipt-divider"></div>
            <div class="receipt-line">Subtotal: ${formatCurrency(invoice.total_amount || 0)}</div>
            ${(invoice.discount_amount || 0) > 0 ? `<div class="receipt-line receipt-discount">Discount: (${formatCurrency(invoice.discount_amount || 0)})</div>` : ''}
            <div class="receipt-total">TOTAL: ${formatCurrency(invoice.final_amount || invoice.total_amount || 0)}</div>
            ${invoice.invoice_type === 'dp' ? `
              <div class="receipt-line">DP: ${formatCurrency(invoice.due_amount || 0)}</div>
              <div class="receipt-line">Remaining: ${formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}</div>
            ` : `<div class="receipt-line">Due: ${formatCurrency(invoice.due_amount || 0)}</div>`}
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
        <title>Invoice ${invoice.invoice_number}</title>
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
          .receipt-footer {
            text-align: center;
            font-size: 7px;
            color: #666;
            margin-top: 10px;
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
      window.location.href = getBprintBookingInvoiceUrl(invoice.booking_id, invoice.invoice_type === 'dp' ? 'dp' : 'full');
      return;
    }
    if (isAndroid) {
      window.location.href = getAndroidBluetoothBookingInvoiceUrl(invoice.booking_id, invoice.invoice_type === 'dp' ? 'dp' : 'full');
      return;
    }
    printInvoice();
  };

  const downloadInvoice = async () => {
    if (!invoice) return;
    
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
      await new Promise(resolve => setTimeout(resolve, 300));

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
        scale: 1.8, // Increased for better quality while keeping file size reasonable
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
      const imgWidth = 58; // 58mm in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight],
        compress: true, // Enable PDF compression
      });

      // Convert canvas to JPEG with optimized quality
      // JPEG quality 0.92 provides better quality while maintaining reasonable file size
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      
      // Validate data URL
      if (!imgData || !imgData.startsWith('data:image/jpeg;base64,')) {
        throw new Error('Invalid image data generated');
      }

      // Add image to PDF (JPEG format is much smaller than PNG)
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Save PDF with invoice number as filename
      pdf.save(`invoice_${invoice.invoice_number}.pdf`);
    } catch (error) {
      // Clean up temp container if it still exists
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Check if package pricing (items with zero prices)
  const isPackagePricing = invoice.items && invoice.items.length > 0 && 
    invoice.items.every((it) => (it.unit_price || 0) <= 0 && (it.total || 0) <= 0) && 
    (invoice.total_amount || 0) > 0;

  return (
    <>
      {/* Print-only copy - always at top of body, hidden on screen */}
      <div className="print-only-invoice" style={{ display: 'none' }}>
        <div className="thermal-receipt-container">
          <div className="thermal-receipt">
            {/* Company Header - same as bprint */}
            <div className="receipt-center">
              <div className="receipt-title">SUITLABS BALI</div>
              <div className="receipt-subtitle">Sewa Jas Jimbaran & Nusadua</div>
              <div className="receipt-line">{invoice.company?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362'}</div>
              {invoice.company?.phone && <div className="receipt-line">TEL: {invoice.company.phone}</div>}
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice & booking info - same as bprint */}
            <div className="receipt-line">Invoice: {invoice.invoice_number}</div>
            <div className="receipt-line">Date: {bprintDateTime(invoice.generated_at || new Date())}</div>
            <div className="receipt-line">Booking ID: {invoice.booking_id.slice(-8)}</div>
            <div className="receipt-line">Type: {invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
            {invoice.due_date && <div className="receipt-line">Due: {bprintDate(invoice.due_date)}</div>}
            <div className="receipt-line">Status: {invoice.payment_status?.toUpperCase() || 'PENDING'}</div>
            {invoice.booking_date && <div className="receipt-line">Booking: {bprintDate(invoice.booking_date)}</div>}

            <div className="receipt-divider"></div>

            {/* Customer - name only, same as bprint */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{invoice.customer_name}</div>

            <div className="receipt-divider"></div>

            {/* Items - same as bprint */}
            <div className="receipt-label">ITEMS:</div>
            {invoice.items && invoice.items.length > 0 ? (
              <>
                {invoice.items.map((item, idx) => {
                  if (isPackagePricing && (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
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

            {/* Summary - same as bprint */}
            <div className="receipt-line">Subtotal: {formatCurrency(invoice.total_amount || 0)}</div>
            {(invoice.discount_amount || 0) > 0 && (
              <div className="receipt-line receipt-discount">Discount: ({formatCurrency(invoice.discount_amount || 0)})</div>
            )}
            <div className="receipt-total">TOTAL: {formatCurrency(invoice.final_amount || invoice.total_amount || 0)}</div>
            {invoice.invoice_type === 'dp' ? (
              <>
                <div className="receipt-line">DP: {formatCurrency(invoice.due_amount || 0)}</div>
                <div className="receipt-line">Remaining: {formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}</div>
              </>
            ) : (
              <div className="receipt-line">Due: {formatCurrency(invoice.due_amount || 0)}</div>
            )}

            {/* Footer - same as bprint */}
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
          title="Booking Invoice"
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
                  {/* Company Header - same as bprint */}
                  <div className="receipt-center">
                    <div className="receipt-title">SUITLABS BALI</div>
                    <div className="receipt-subtitle">Sewa Jas Jimbaran & Nusadua</div>
                    <div className="receipt-line">{invoice.company?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362'}</div>
                    {invoice.company?.phone && <div className="receipt-line">TEL: {invoice.company.phone}</div>}
                  </div>

                  <div className="receipt-divider"></div>

                  {/* Invoice & booking info - same as bprint */}
                  <div className="receipt-line">Invoice: {invoice.invoice_number}</div>
                  <div className="receipt-line">Date: {bprintDateTime(invoice.generated_at || new Date())}</div>
                  <div className="receipt-line">Booking ID: {invoice.booking_id.slice(-8)}</div>
                  <div className="receipt-line">Type: {invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
                  {invoice.due_date && <div className="receipt-line">Due: {bprintDate(invoice.due_date)}</div>}
                  <div className="receipt-line">Status: {invoice.payment_status?.toUpperCase() || 'PENDING'}</div>
                  {invoice.booking_date && <div className="receipt-line">Booking: {bprintDate(invoice.booking_date)}</div>}

                  <div className="receipt-divider"></div>

                  {/* Customer - name only, same as bprint */}
                  <div className="receipt-label">CUSTOMER:</div>
                  <div className="receipt-line">{invoice.customer_name}</div>

                  <div className="receipt-divider"></div>

                  {/* Items - same as bprint */}
                  <div className="receipt-label">ITEMS:</div>
                  {invoice.items && invoice.items.length > 0 ? (
                    <>
                      {invoice.items.map((item, idx) => {
                        if (isPackagePricing && (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
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

                  {/* Summary - same as bprint */}
                  <div className="receipt-line">Subtotal: {formatCurrency(invoice.total_amount || 0)}</div>
                  {(invoice.discount_amount || 0) > 0 && (
                    <div className="receipt-line receipt-discount">Discount: ({formatCurrency(invoice.discount_amount || 0)})</div>
                  )}
                  <div className="receipt-total">TOTAL: {formatCurrency(invoice.final_amount || invoice.total_amount || 0)}</div>
                  {invoice.invoice_type === 'dp' ? (
                    <>
                      <div className="receipt-line">DP: {formatCurrency(invoice.due_amount || 0)}</div>
                      <div className="receipt-line">Remaining: {formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}</div>
                    </>
                  ) : (
                    <div className="receipt-line">Due: {formatCurrency(invoice.due_amount || 0)}</div>
                  )}

                  {/* Footer - same as bprint */}
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

      {/* Thermal Receipt Styles */}
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

export default BookingInvoiceModal;

