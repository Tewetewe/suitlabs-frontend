'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { InvoiceData } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { thermalPrinter } from '@/lib/thermal-printer';
import { getBprintBookingInvoiceUrl } from '@/lib/bprint';

interface BookingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function BookingInvoiceModal({ isOpen, onClose, invoice }: BookingInvoiceModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string>('');

  if (!isOpen || !invoice) return null;

  // Format date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const bprintUrl = getBprintBookingInvoiceUrl(invoice.booking_id, invoice.invoice_type === 'dp' ? 'dp' : 'full');

  const printDirect = async () => {
    if (!invoice) return;
    if (thermalPrinter.isAvailable()) {
      setIsPrinting(true);
      setPrinterStatus('');
      try {
        if (!thermalPrinter.isConnected()) {
          setPrinterStatus('Connecting...');
          await thermalPrinter.connect();
          setPrinterStatus(`Connected to ${thermalPrinter.getDeviceName()}`);
        }
        setPrinterStatus('Printing...');
        await thermalPrinter.printBookingInvoice(invoice);
        setPrinterStatus('Done');
        setTimeout(() => setPrinterStatus(''), 2000);
        alert('Printed.');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setPrinterStatus(`Error: ${msg}`);
        alert(`Print failed: ${msg}`);
      } finally {
        setIsPrinting(false);
      }
    } else {
      window.print();
    }
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
            {/* Company Header */}
            <div className="receipt-center">
              <div className="receipt-title">SUITLABS BALI</div>
              <div className="receipt-subtitle">Sewa Jas Jimbaran & Nusa Dua</div>
              <div className="receipt-line">{invoice.company?.address || 'Jl. Example Street No. 123'}</div>
              <div className="receipt-line">{invoice.company?.phone ? `TEL: ${invoice.company.phone}` : 'TEL: +62 123 456 7890'}</div>
              <div className="receipt-line">{invoice.company?.email ? `Email: ${invoice.company.email}` : 'Email: suitlabsbali@gmail.com'}</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoice.invoice_number}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Booking ID: {invoice.booking_id.slice(-8)}</div>
            <div className="receipt-line">Type: {invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
            {invoice.due_date && (
              <div className="receipt-line">Due: {formatDate(invoice.due_date)}</div>
            )}
            <div className="receipt-line">Status: {invoice.payment_status?.toUpperCase() || 'PENDING'}</div>
            {invoice.booking_date && (
              <div className="receipt-line">Booking: {formatDate(invoice.booking_date)}</div>
            )}

            <div className="receipt-divider"></div>

            {/* Customer Info (name only) */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{invoice.customer_name || '-'}</div>

            <div className="receipt-divider"></div>

            {/* Items */}
            <div className="receipt-label">ITEMS:</div>
            {invoice.items && invoice.items.length > 0 ? (
              <>
                {invoice.items.map((item, idx) => {
                  if (isPackagePricing && (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
                    return (
                      <div key={idx} className="receipt-item">
                        <div className="receipt-line">{item.description}</div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={idx} className="receipt-item">
                      <div className="receipt-line">{item.description}</div>
                      <div className="receipt-line">
                        {item.quantity} PCS × {formatCurrency(item.unit_price || 0)} = {formatCurrency(item.total || 0)}
                      </div>
                    </div>
                  );
                })}
                {isPackagePricing && (
                  <div className="receipt-item">
                    <div className="receipt-line">Package: {formatCurrency(invoice.total_amount || 0)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="receipt-line">{invoice.product_name || 'Booking Package'}</div>
            )}

            <div className="receipt-divider"></div>

            {/* Summary */}
            <div className="receipt-line">
              Subtotal: {formatCurrency(invoice.total_amount || 0)}
            </div>
            {(invoice.discount_amount || 0) > 0 && (
              <div className="receipt-line receipt-discount">
                Discount: ({formatCurrency(invoice.discount_amount || 0)})
              </div>
            )}
            <div className="receipt-total">
              TOTAL: {formatCurrency(invoice.final_amount || invoice.total_amount || 0)}
            </div>
            {invoice.invoice_type === 'dp' ? (
              <>
                <div className="receipt-line">DP: {formatCurrency(invoice.due_amount || 0)}</div>
                <div className="receipt-line">
                  Remaining: {formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}
                </div>
              </>
            ) : (
              <div className="receipt-line">Due: {formatCurrency(invoice.due_amount || 0)}</div>
            )}

            {/* Footer */}
            <div className="receipt-divider"></div>
            <div className="receipt-center">
              <div className="receipt-line">Thank you for using SuitLabs!</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
        <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Booking Invoice</h3>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap items-center">
                <Button variant="ghost" onClick={onClose} className="text-xs px-3 py-1">Close</Button>
                <Button onClick={downloadInvoice} className="text-xs px-3 py-1">Download</Button>
                <Button
                  onClick={printDirect}
                  disabled={isPrinting}
                  className="text-xs px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isPrinting ? 'Printing…' : 'Print'}
                </Button>
                <a
                  href={bprintUrl}
                  className="inline-flex items-center text-xs px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  title="One tap: opens Thermer and prints. No need to press anything in Thermer. Enable Browser Print in the app."
                >
                  Print via Thermer
                </a>
              </div>
              {printerStatus ? <p className="text-[10px] text-gray-500 text-right">{printerStatus}</p> : null}
              <p className="text-[10px] text-gray-500 text-right">
                Print: Bluetooth/browser. Print via Thermer: one tap, no need to press anything in Thermer — enable Browser Print in the app.
              </p>
            </div>
          </div>

          {/* Simple Thermal Receipt */}
          <div className="thermal-receipt-container">
            <div className="thermal-receipt">
            {/* Company Header */}
            <div className="receipt-center">
              <div className="receipt-title">SUITLABS BALI</div>
              <div className="receipt-subtitle">Sewa Jas Jimbaran & Nusa Dua</div>
              <div className="receipt-line">{invoice.company?.address || 'Jl. Example Street No. 123'}</div>
              <div className="receipt-line">{invoice.company?.phone ? `TEL: ${invoice.company.phone}` : 'TEL: +62 123 456 7890'}</div>
              <div className="receipt-line">{invoice.company?.email ? `Email: ${invoice.company.email}` : 'Email: suitlabsbali@gmail.com'}</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoice.invoice_number}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Booking ID: {invoice.booking_id.slice(-8)}</div>
            <div className="receipt-line">Type: {invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
            {invoice.due_date && (
              <div className="receipt-line">Due: {formatDate(invoice.due_date)}</div>
            )}
            <div className="receipt-line">Status: {invoice.payment_status?.toUpperCase() || 'PENDING'}</div>
            {invoice.booking_date && (
              <div className="receipt-line">Booking: {formatDate(invoice.booking_date)}</div>
            )}

            <div className="receipt-divider"></div>

            {/* Customer Info (name only) */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{invoice.customer_name || '-'}</div>

            <div className="receipt-divider"></div>

            {/* Items */}
            <div className="receipt-label">ITEMS:</div>
            {invoice.items && invoice.items.length > 0 ? (
              <>
                {invoice.items.map((item, idx) => {
                  // Skip items with zero prices (sub-items in package)
                  if (isPackagePricing && (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
                    return (
                      <div key={idx} className="receipt-item">
                        <div className="receipt-line">{item.description}</div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={idx} className="receipt-item">
                      <div className="receipt-line">{item.description}</div>
                      <div className="receipt-line">
                        {item.quantity} PCS × {formatCurrency(item.unit_price || 0)} = {formatCurrency(item.total || 0)}
                      </div>
                    </div>
                  );
                })}
                {isPackagePricing && (
                  <div className="receipt-item">
                    <div className="receipt-line">Package: {formatCurrency(invoice.total_amount || 0)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="receipt-line">{invoice.product_name || 'Booking Package'}</div>
            )}

            <div className="receipt-divider"></div>

            {/* Summary */}
            <div className="receipt-line">
              Subtotal: {formatCurrency(invoice.total_amount || 0)}
            </div>
            {(invoice.discount_amount || 0) > 0 && (
              <div className="receipt-line receipt-discount">
                Discount: ({formatCurrency(invoice.discount_amount || 0)})
              </div>
            )}
            <div className="receipt-total">
              TOTAL: {formatCurrency(invoice.final_amount || invoice.total_amount || 0)}
            </div>
            {invoice.invoice_type === 'dp' ? (
              <>
                <div className="receipt-line">DP: {formatCurrency(invoice.due_amount || 0)}</div>
                <div className="receipt-line">
                  Remaining: {formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}
                </div>
              </>
            ) : (
              <div className="receipt-line">Due: {formatCurrency(invoice.due_amount || 0)}</div>
            )}

            {/* Footer */}
            <div className="receipt-divider"></div>
            <div className="receipt-center">
              <div className="receipt-line">Thank you for using SuitLabs!</div>
            </div>
          </div>
          </div>
        </div>
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
          
          /* Hide everything; show only the receipt (works when .print-only-invoice is nested in the DOM) */
          body * {
            visibility: hidden !important;
          }
          .print-only-invoice,
          .print-only-invoice * {
            visibility: visible !important;
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

