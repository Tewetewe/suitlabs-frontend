'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
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

  const printToThermalPrinter = async () => {
    if (!invoice) return;

    setIsPrinting(true);
    setPrinterStatus('');

    try {
      // Check if Web Bluetooth is available
      if (!thermalPrinter.isAvailable()) {
        const errorMsg = 'Web Bluetooth is not available in this browser. Please use Chrome, Edge, or Opera.';
        setPrinterStatus(errorMsg);
        alert(errorMsg);
        return;
      }

      // Check connection status
      const status = thermalPrinter.getConnectionStatus();
      console.log('Printer connection status:', status);

      // Connect to printer if not already connected
      if (!thermalPrinter.isConnected()) {
        setPrinterStatus('Connecting to printer...');
        console.log('Attempting to connect to printer...');
        
        try {
          await thermalPrinter.connect();
          const deviceName = thermalPrinter.getDeviceName();
          setPrinterStatus(`Connected to ${deviceName}`);
          console.log(`Successfully connected to ${deviceName}`);
        } catch (connectError: unknown) {
          console.error('Connection error:', connectError);
          const errorMessage = connectError instanceof Error ? connectError.message : 'Unknown error';
          setPrinterStatus(`Connection failed: ${errorMessage}`);
          alert(`Failed to connect: ${errorMessage}\n\nTroubleshooting:\n1. Make sure printer is powered on\n2. Put printer in pairing mode\n3. Make sure printer is not connected to another device\n4. Check browser console (F12) for details`);
          return;
        }
      } else {
        setPrinterStatus(`Already connected to ${thermalPrinter.getDeviceName()}`);
      }

      // Print invoice
      setPrinterStatus('Printing invoice...');
      console.log('Starting to print invoice...');
      
      try {
        await thermalPrinter.printBookingInvoice(invoice);
        setPrinterStatus('Invoice printed successfully!');
        console.log('Invoice printed successfully');
        
        // Show success message
        setTimeout(() => {
          setPrinterStatus('');
        }, 2000);
        alert('Invoice printed successfully!');
      } catch (printError: unknown) {
        console.error('Print error:', printError);
        const errorMessage = printError instanceof Error ? printError.message : 'Unknown error';
        setPrinterStatus(`Print failed: ${errorMessage}`);
        alert(`Failed to print: ${errorMessage}\n\nPlease check:\n1. Printer has paper\n2. Printer is not jammed\n3. Printer is within range\n4. Try reconnecting`);
        throw printError;
      }
    } catch (error: unknown) {
      console.error('Thermal printer error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setPrinterStatus(`Error: ${errorMsg}`);
      
      // Don't show alert if we already showed one
      if (error instanceof Error && !error.message.includes('Failed to print') && !error.message.includes('Failed to connect')) {
        alert(`Error: ${errorMsg}\n\nCheck browser console (F12) for details.`);
      }
    } finally {
      setIsPrinting(false);
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

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
        <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Booking Invoice</h3>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} className="text-xs px-3 py-1">Close</Button>
                <Button onClick={downloadInvoice} className="text-xs px-3 py-1">Download</Button>
                <Button onClick={printInvoice} className="text-xs px-3 py-1">Print</Button>
                <Button 
                  onClick={printToThermalPrinter} 
                  disabled={isPrinting}
                  className="text-xs px-3 py-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isPrinting ? 'Printing...' : 'Print to Thermal'}
                </Button>
                <Button 
                  onClick={() => {
                    const bprintUrl = getBprintBookingInvoiceUrl(invoice.booking_id, invoice.invoice_type === 'dp' ? 'dp' : 'full');
                    window.location.href = bprintUrl;
                  }}
                  className="text-xs px-3 py-1 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md"
                  title="Opens Bluetooth Print app to print invoice"
                >
                  Print via Bluetooth Print app
                </Button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                iPhone: tap the link in Safari (don’t paste in address bar). Use your computer’s IP for the API, not localhost.
              </p>
              {printerStatus && (
                <div className="text-xs text-gray-600 mt-1">{printerStatus}</div>
              )}
            </div>
          </div>

          {/* Thermal Receipt - same structure as bprint */}
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

