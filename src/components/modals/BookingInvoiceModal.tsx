'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { InvoiceData } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BookingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function BookingInvoiceModal({ isOpen, onClose, invoice }: BookingInvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  // Format date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const printInvoice = () => {
    if (!invoice) return;

    // Build invoice HTML content
    const buildInvoiceHTML = () => {
      const itemsHTML = invoice.items && invoice.items.length > 0 ? (
        invoice.items.map((item) => {
          if (isPackagePricing && (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
            return `<div class="receipt-item"><div class="receipt-line">${item.description}</div></div>`;
          }
          return `
            <div class="receipt-item">
              <div class="receipt-line">${item.description}</div>
              <div class="receipt-line">${item.quantity} PCS × ${formatCurrency(item.unit_price || 0)} = ${formatCurrency(item.total || 0)}</div>
            </div>
          `;
        }).join('') + (isPackagePricing ? `<div class="receipt-item"><div class="receipt-line receipt-bold">Package Total: ${formatCurrency(invoice.total_amount || 0)}</div></div>` : '')
      ) : `<div class="receipt-line">${invoice.product_name || 'Booking Package'}</div>`;

      return `
        <div class="thermal-receipt-container">
          <div class="thermal-receipt">
            <div class="receipt-center">
              <div class="receipt-title">SUITLABS</div>
              <div class="receipt-subtitle">Suit Rental System</div>
              <div class="receipt-line">${invoice.company?.address || 'Jl. Example Street No. 123'}</div>
              <div class="receipt-line">${invoice.company?.phone ? `TEL: ${invoice.company.phone}` : 'TEL: +62 123 456 7890'}</div>
              <div class="receipt-line">${invoice.company?.email ? `Email: ${invoice.company.email}` : 'Email: info@suitlabs.com'}</div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-line">Invoice: ${invoice.invoice_number}</div>
            <div class="receipt-line">Date: ${dateStr} ${timeStr}</div>
            <div class="receipt-line">Booking ID: ${invoice.booking_id.slice(-8)}</div>
            <div class="receipt-line">Type: ${invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
            ${invoice.due_date ? `<div class="receipt-line">Due Date: ${formatDate(invoice.due_date)}</div>` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-label">CUSTOMER:</div>
            <div class="receipt-line">${invoice.customer_name}</div>
            <div class="receipt-line">Email: ${invoice.customer_email}</div>
            <div class="receipt-line">Phone: ${invoice.customer_phone}</div>
            <div class="receipt-divider"></div>
            <div class="receipt-label">ITEMS:</div>
            ${itemsHTML}
            <div class="receipt-divider"></div>
            <div class="receipt-line">Subtotal: ${formatCurrency(invoice.total_amount || 0)}</div>
            ${(invoice.discount_amount || 0) > 0 ? `<div class="receipt-line receipt-discount">Discount: (${formatCurrency(invoice.discount_amount || 0)})</div>` : ''}
            <div class="receipt-total">TOTAL AMOUNT: ${formatCurrency(invoice.final_amount || invoice.total_amount || 0)}</div>
            <div class="receipt-divider"></div>
            ${invoice.invoice_type === 'dp' ? `
              <div class="receipt-line">Down Payment: ${formatCurrency(invoice.due_amount || 0)}</div>
              <div class="receipt-line">Remaining: ${formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}</div>
            ` : `<div class="receipt-line">Due Amount: ${formatCurrency(invoice.due_amount || 0)}</div>`}
            <div class="receipt-line receipt-bold">Payment Status: ${invoice.payment_status?.toUpperCase() || 'PENDING'}</div>
            ${invoice.booking_date ? `
              <div class="receipt-divider"></div>
              <div class="receipt-line">Booking Date: ${formatDate(invoice.booking_date)}</div>
            ` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-center">
              <div class="receipt-line">Thank you for using SuitLabs!</div>
              <div class="receipt-line receipt-small">All bookings subject to T&C</div>
              <div class="receipt-line receipt-small">6-Month Warranty. T&C apply.</div>
              <div class="receipt-line receipt-small">www.suitlabs.com</div>
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
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
              width: 80mm;
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
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            font-family: 'Courier New', monospace;
          }
          .thermal-receipt-container {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .thermal-receipt {
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 8mm 6mm !important;
            margin: 0 !important;
            background: white !important;
            font-family: 'Courier New', monospace !important;
            font-size: 11px !important;
            line-height: 1.5 !important;
            color: #000 !important;
          }
          .receipt-center {
            text-align: center;
            margin-bottom: 8px;
          }
          .receipt-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 1px;
          }
          .receipt-subtitle {
            font-size: 10px;
            color: #666;
            margin-bottom: 6px;
          }
          .receipt-line {
            font-size: 11px;
            line-height: 1.5;
            margin-bottom: 2px;
            word-wrap: break-word;
          }
          .receipt-label {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 4px;
          }
          .receipt-small {
            font-size: 9px;
            color: #666;
          }
          .receipt-divider {
            border-top: 1px dashed #999;
            margin: 8px 0;
          }
          .receipt-item {
            margin-bottom: 6px;
          }
          .receipt-discount {
            color: #d32f2f;
          }
          .receipt-bold {
            font-weight: bold;
          }
          .receipt-total {
            font-weight: bold;
            font-size: 12px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #333;
          }
          .receipt-footer {
            text-align: center;
            font-size: 9px;
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

  const downloadInvoice = async () => {
    if (!invoice) return;
    
    // Get the receipt element
    const receiptElement = document.querySelector('.thermal-receipt') as HTMLElement;
    if (!receiptElement) return;

    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: receiptElement.scrollWidth,
        height: receiptElement.scrollHeight,
      });

      // Calculate PDF dimensions (80mm width)
      const imgWidth = 80; // 80mm in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight],
      });

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Save PDF with invoice number as filename
      pdf.save(`invoice_${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
              <div className="receipt-title">SUITLABS</div>
              <div className="receipt-subtitle">Suit Rental System</div>
              <div className="receipt-line">{invoice.company?.address || 'Jl. Example Street No. 123'}</div>
              <div className="receipt-line">{invoice.company?.phone ? `TEL: ${invoice.company.phone}` : 'TEL: +62 123 456 7890'}</div>
              <div className="receipt-line">{invoice.company?.email ? `Email: ${invoice.company.email}` : 'Email: info@suitlabs.com'}</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoice.invoice_number}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Booking ID: {invoice.booking_id.slice(-8)}</div>
            <div className="receipt-line">Type: {invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
            {invoice.due_date && (
              <div className="receipt-line">Due Date: {formatDate(invoice.due_date)}</div>
            )}

            <div className="receipt-divider"></div>

            {/* Customer Info */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{invoice.customer_name}</div>
            <div className="receipt-line">Email: {invoice.customer_email}</div>
            <div className="receipt-line">Phone: {invoice.customer_phone}</div>

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
                    <div className="receipt-line receipt-bold">Package Total: {formatCurrency(invoice.total_amount || 0)}</div>
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
              TOTAL AMOUNT: {formatCurrency(invoice.final_amount || invoice.total_amount || 0)}
            </div>

            {/* Payment Info */}
            <div className="receipt-divider"></div>
            {invoice.invoice_type === 'dp' ? (
              <>
                <div className="receipt-line">
                  Down Payment: {formatCurrency(invoice.due_amount || 0)}
                </div>
                <div className="receipt-line">
                  Remaining: {formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}
                </div>
              </>
            ) : (
              <div className="receipt-line">
                Due Amount: {formatCurrency(invoice.due_amount || 0)}
              </div>
            )}
            <div className="receipt-line receipt-bold">
              Payment Status: {invoice.payment_status?.toUpperCase() || 'PENDING'}
            </div>

            {/* Booking Date */}
            {invoice.booking_date && (
              <>
                <div className="receipt-divider"></div>
                <div className="receipt-line">Booking Date: {formatDate(invoice.booking_date)}</div>
              </>
            )}

            {/* Footer */}
            <div className="receipt-divider"></div>
            <div className="receipt-center">
              <div className="receipt-line">Thank you for using SuitLabs!</div>
              <div className="receipt-line receipt-small">All bookings subject to T&C</div>
              <div className="receipt-line receipt-small">6-Month Warranty. T&C apply.</div>
              <div className="receipt-line receipt-small">www.suitlabs.com</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
        <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Booking Invoice</h3>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="text-xs px-3 py-1">Close</Button>
              <Button onClick={downloadInvoice} className="text-xs px-3 py-1">Download</Button>
              <Button onClick={printInvoice} className="text-xs px-3 py-1">Print</Button>
            </div>
          </div>

          {/* Simple Thermal Receipt */}
          <div className="thermal-receipt-container">
            <div className="thermal-receipt">
            {/* Company Header */}
            <div className="receipt-center">
              <div className="receipt-title">SUITLABS</div>
              <div className="receipt-subtitle">Suit Rental System</div>
              <div className="receipt-line">{invoice.company?.address || 'Jl. Example Street No. 123'}</div>
              <div className="receipt-line">{invoice.company?.phone ? `TEL: ${invoice.company.phone}` : 'TEL: +62 123 456 7890'}</div>
              <div className="receipt-line">{invoice.company?.email ? `Email: ${invoice.company.email}` : 'Email: info@suitlabs.com'}</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoice.invoice_number}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Booking ID: {invoice.booking_id.slice(-8)}</div>
            <div className="receipt-line">Type: {invoice.invoice_type?.toUpperCase() || 'FULL'}</div>
            {invoice.due_date && (
              <div className="receipt-line">Due Date: {formatDate(invoice.due_date)}</div>
            )}

            <div className="receipt-divider"></div>

            {/* Customer Info */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{invoice.customer_name}</div>
            <div className="receipt-line">Email: {invoice.customer_email}</div>
            <div className="receipt-line">Phone: {invoice.customer_phone}</div>

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
                    <div className="receipt-line receipt-bold">Package Total: {formatCurrency(invoice.total_amount || 0)}</div>
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
              TOTAL AMOUNT: {formatCurrency(invoice.final_amount || invoice.total_amount || 0)}
            </div>

            {/* Payment Info */}
            <div className="receipt-divider"></div>
            {invoice.invoice_type === 'dp' ? (
              <>
                <div className="receipt-line">
                  Down Payment: {formatCurrency(invoice.due_amount || 0)}
                </div>
                <div className="receipt-line">
                  Remaining: {formatCurrency((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}
                </div>
              </>
            ) : (
              <div className="receipt-line">
                Due Amount: {formatCurrency(invoice.due_amount || 0)}
              </div>
            )}
            <div className="receipt-line receipt-bold">
              Payment Status: {invoice.payment_status?.toUpperCase() || 'PENDING'}
            </div>

            {/* Booking Date */}
            {invoice.booking_date && (
              <>
                <div className="receipt-divider"></div>
                <div className="receipt-line">Booking Date: {formatDate(invoice.booking_date)}</div>
              </>
            )}

            {/* Footer */}
            <div className="receipt-divider"></div>
            <div className="receipt-center">
              <div className="receipt-line">Thank you for using SuitLabs!</div>
              <div className="receipt-line receipt-small">All bookings subject to T&C</div>
              <div className="receipt-line receipt-small">6-Month Warranty. T&C apply.</div>
              <div className="receipt-line receipt-small">www.suitlabs.com</div>
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
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10px 8px;
          background: white;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.5;
          color: #000;
        }

        .receipt-center {
          text-align: center;
          margin-bottom: 8px;
        }

        .receipt-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
          letter-spacing: 1px;
        }

        .receipt-subtitle {
          font-size: 10px;
          color: #666;
          margin-bottom: 6px;
        }

        .receipt-line {
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 2px;
          word-wrap: break-word;
        }

        .receipt-label {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .receipt-small {
          font-size: 9px;
          color: #666;
        }

        .receipt-divider {
          border-top: 1px dashed #999;
          margin: 8px 0;
        }

        .receipt-item {
          margin-bottom: 6px;
        }

        .receipt-discount {
          color: #d32f2f;
        }

        .receipt-bold {
          font-weight: bold;
        }

        .receipt-total {
          font-weight: bold;
          font-size: 12px;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #333;
        }

        /* Hide print-only invoice on screen */
        .print-only-invoice {
          display: none !important;
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            height: auto !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
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
            width: 80mm !important;
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
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .print-only-invoice .thermal-receipt {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
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

