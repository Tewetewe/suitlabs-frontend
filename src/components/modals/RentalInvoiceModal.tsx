'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Rental } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { thermalPrinter } from '@/lib/thermal-printer';

interface RentalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export function RentalInvoiceModal({ isOpen, onClose, rental }: RentalInvoiceModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string>('');

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
  
  // Format date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const printInvoice = () => {
    if (!rental) return;

    // Build invoice HTML content
    const buildInvoiceHTML = () => {
      const itemsHTML = items.length > 0 ? (
        items.map((item) => {
          const itemName = item.item?.name || 'Item';
          const itemSize = item.item?.size?.label || '';
          const description = itemSize ? `${itemName} - ${itemSize}` : itemName;
          const quantity = item.quantity || 1;
          const unitPrice = item.unit_price || item.total_price || 0;
          const itemTotal = item.total_price || unitPrice * quantity;
          const discount = item.discount_amount ?? 0;
          
          return `
            <div class="receipt-item">
              <div class="receipt-line">${description}</div>
              <div class="receipt-line">${quantity} PCS × ${formatCurrency(unitPrice)} = ${formatCurrency(itemTotal)}</div>
              ${discount > 0 ? `<div class="receipt-line receipt-discount">Discount: (${formatCurrency(discount)})</div>` : ''}
            </div>
          `;
        }).join('')
      ) : '<div class="receipt-line">Rental Package</div>';

      return `
        <div class="thermal-receipt-container">
          <div class="thermal-receipt">
            <div class="receipt-center">
              <div class="receipt-title">SUITLABS</div>
              <div class="receipt-subtitle">Suit Rental System</div>
              <div class="receipt-line">Jl. Example Street No. 123</div>
              <div class="receipt-line">City, Country</div>
              <div class="receipt-line">TEL: +62 123 456 7890</div>
              <div class="receipt-line">Email: info@suitlabs.com</div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-line">Invoice: ${invoiceNumber}</div>
            <div class="receipt-line">Date: ${dateStr} ${timeStr}</div>
            <div class="receipt-line">Rental ID: ${rental.id.slice(-8)}</div>
            <div class="receipt-line">Status: ${rental.status.toUpperCase()}</div>
            ${rental.customer ? `
              <div class="receipt-line">Customer: ${rental.customer.first_name} ${rental.customer.last_name}</div>
              <div class="receipt-line">Phone: ${rental.customer.phone}</div>
            ` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-label">ITEMS:</div>
            ${itemsHTML}
            <div class="receipt-divider"></div>
            <div class="receipt-line">Subtotal: ${formatCurrency(itemsSubtotal || rental.total_cost || 0)}</div>
            ${itemsDiscount > 0 ? `<div class="receipt-line receipt-discount">Discount: (${formatCurrency(itemsDiscount)})</div>` : ''}
            ${rental.late_fee > 0 ? `<div class="receipt-line">Late Fee: ${formatCurrency(rental.late_fee)}</div>` : ''}
            ${rental.damage_charges > 0 ? `<div class="receipt-line">Damage: ${formatCurrency(rental.damage_charges)}</div>` : ''}
            <div class="receipt-total">GRAND TOTAL: ${formatCurrency(total)}</div>
            ${rental.security_deposit > 0 ? `
              <div class="receipt-divider"></div>
              <div class="receipt-line">Security Deposit: ${formatCurrency(rental.security_deposit)}</div>
              ${rental.damage_charges > 0 ? `<div class="receipt-line receipt-discount">Damage Deduction: (${formatCurrency(rental.damage_charges)})</div>` : ''}
              <div class="receipt-line receipt-bold">Refundable: ${formatCurrency(refundableDeposit)}</div>
            ` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-line">Rental Date: ${formatDate(rental.rental_date)}</div>
            <div class="receipt-line">Return Date: ${formatDate(rental.return_date)}</div>
            ${rental.actual_pickup_date ? `<div class="receipt-line">Pickup: ${formatDate(rental.actual_pickup_date)}</div>` : ''}
            ${rental.actual_return_date ? `<div class="receipt-line">Returned: ${formatDate(rental.actual_return_date)}</div>` : ''}
            ${rental.notes ? `
              <div class="receipt-divider"></div>
              <div class="receipt-label">NOTE:</div>
              <div class="receipt-line">${rental.notes}</div>
            ` : ''}
            <div class="receipt-divider"></div>
            <div class="receipt-center">
              <div class="receipt-line">Thank you for using SuitLabs!</div>
              <div class="receipt-line receipt-small">All rentals subject to T&C</div>
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

  const printToThermalPrinter = async () => {
    if (!rental) return;

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
        await thermalPrinter.printRentalInvoice(rental);
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
    if (!rental) return;
    
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

      // Calculate PDF dimensions (58mm width)
      const imgWidth = 58; // 58mm in mm
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
      pdf.save(`invoice_${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
      {/* Print-only copy - always at top of body, hidden on screen */}
      <div className="print-only-invoice" style={{ display: 'none' }}>
        <div className="thermal-receipt-container">
          <div className="thermal-receipt">
            {/* Company Header */}
            <div className="receipt-center">
              <div className="receipt-title">SUITLABS</div>
              <div className="receipt-subtitle">Suit Rental System</div>
              <div className="receipt-line">Jl. Example Street No. 123</div>
              <div className="receipt-line">City, Country</div>
              <div className="receipt-line">TEL: +62 123 456 7890</div>
              <div className="receipt-line">Email: info@suitlabs.com</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoiceNumber}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Rental ID: {rental.id.slice(-8)}</div>
            <div className="receipt-line">Status: {rental.status.toUpperCase()}</div>
            {rental.customer && (
              <>
                <div className="receipt-line">Customer: {rental.customer.first_name} {rental.customer.last_name}</div>
                <div className="receipt-line">Phone: {rental.customer.phone}</div>
              </>
            )}

            <div className="receipt-divider"></div>

            {/* Items */}
            <div className="receipt-label">ITEMS:</div>
            {items.length > 0 ? (
              items.map((item, idx) => {
                const itemName = item.item?.name || 'Item';
                const itemSize = item.item?.size?.label || '';
                const description = itemSize ? `${itemName} - ${itemSize}` : itemName;
                const quantity = item.quantity || 1;
                const unitPrice = item.unit_price || item.total_price || 0;
                const itemTotal = item.total_price || unitPrice * quantity;
                const discount = item.discount_amount ?? 0;
                
                return (
                  <div key={idx} className="receipt-item">
                    <div className="receipt-line">{description}</div>
                    <div className="receipt-line">
                      {quantity} PCS × {formatCurrency(unitPrice)} = {formatCurrency(itemTotal)}
                    </div>
                    {discount > 0 && (
                      <div className="receipt-line receipt-discount">
                        Discount: ({formatCurrency(discount)})
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="receipt-line">Rental Package</div>
            )}

            <div className="receipt-divider"></div>

            {/* Summary */}
            <div className="receipt-line">
              Subtotal: {formatCurrency(itemsSubtotal || rental.total_cost || 0)}
            </div>
            {itemsDiscount > 0 && (
              <div className="receipt-line receipt-discount">
                Discount: ({formatCurrency(itemsDiscount)})
              </div>
            )}
            {rental.late_fee > 0 && (
              <div className="receipt-line">Late Fee: {formatCurrency(rental.late_fee)}</div>
            )}
            {rental.damage_charges > 0 && (
              <div className="receipt-line">Damage: {formatCurrency(rental.damage_charges)}</div>
            )}
            <div className="receipt-total">
              GRAND TOTAL: {formatCurrency(total)}
            </div>

            {/* Deposit */}
            {rental.security_deposit > 0 && (
              <>
                <div className="receipt-divider"></div>
                <div className="receipt-line">Security Deposit: {formatCurrency(rental.security_deposit)}</div>
                {rental.damage_charges > 0 && (
                  <div className="receipt-line receipt-discount">
                    Damage Deduction: ({formatCurrency(rental.damage_charges)})
                  </div>
                )}
                <div className="receipt-line receipt-bold">
                  Refundable: {formatCurrency(refundableDeposit)}
                </div>
              </>
            )}

            {/* Dates */}
            <div className="receipt-divider"></div>
            <div className="receipt-line">Rental Date: {formatDate(rental.rental_date)}</div>
            <div className="receipt-line">Return Date: {formatDate(rental.return_date)}</div>
            {rental.actual_pickup_date && (
              <div className="receipt-line">Pickup: {formatDate(rental.actual_pickup_date)}</div>
            )}
            {rental.actual_return_date && (
              <div className="receipt-line">Returned: {formatDate(rental.actual_return_date)}</div>
            )}

            {/* Notes */}
            {rental.notes && (
              <>
                <div className="receipt-divider"></div>
                <div className="receipt-label">NOTE:</div>
                <div className="receipt-line">{rental.notes}</div>
              </>
            )}

            {/* Footer */}
            <div className="receipt-divider"></div>
            <div className="receipt-center">
              <div className="receipt-line">Thank you for using SuitLabs!</div>
              <div className="receipt-line receipt-small">All rentals subject to T&C</div>
              <div className="receipt-line receipt-small">6-Month Warranty. T&C apply.</div>
              <div className="receipt-line receipt-small">www.suitlabs.com</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
        <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Rental Invoice</h3>
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
            </div>
            {printerStatus && (
              <div className="text-xs text-gray-600 mt-1">{printerStatus}</div>
            )}
          </div>
        </div>

          {/* Simple Thermal Receipt */}
          <div className="thermal-receipt-container">
            <div className="thermal-receipt">
            {/* Company Header */}
            <div className="receipt-center">
              <div className="receipt-title">SUITLABS</div>
              <div className="receipt-subtitle">Suit Rental System</div>
              <div className="receipt-line">Jl. Example Street No. 123</div>
              <div className="receipt-line">City, Country</div>
              <div className="receipt-line">TEL: +62 123 456 7890</div>
              <div className="receipt-line">Email: info@suitlabs.com</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoiceNumber}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Rental ID: {rental.id.slice(-8)}</div>
            <div className="receipt-line">Status: {rental.status.toUpperCase()}</div>
            {rental.customer && (
              <>
                <div className="receipt-line">Customer: {rental.customer.first_name} {rental.customer.last_name}</div>
                <div className="receipt-line">Phone: {rental.customer.phone}</div>
              </>
            )}

            <div className="receipt-divider"></div>

            {/* Items */}
            <div className="receipt-label">ITEMS:</div>
            {items.length > 0 ? (
              items.map((item, idx) => {
                const itemName = item.item?.name || 'Item';
                const itemSize = item.item?.size?.label || '';
                const description = itemSize ? `${itemName} - ${itemSize}` : itemName;
                const quantity = item.quantity || 1;
                const unitPrice = item.unit_price || item.total_price || 0;
                const itemTotal = item.total_price || unitPrice * quantity;
                const discount = item.discount_amount ?? 0;
                
                return (
                  <div key={idx} className="receipt-item">
                    <div className="receipt-line">{description}</div>
                    <div className="receipt-line">
                      {quantity} PCS × {formatCurrency(unitPrice)} = {formatCurrency(itemTotal)}
            </div>
                    {discount > 0 && (
                      <div className="receipt-line receipt-discount">
                        Discount: ({formatCurrency(discount)})
              </div>
            )}
              </div>
                );
              })
            ) : (
              <div className="receipt-line">Rental Package</div>
            )}

            <div className="receipt-divider"></div>

            {/* Summary */}
            <div className="receipt-line">
              Subtotal: {formatCurrency(itemsSubtotal || rental.total_cost || 0)}
            </div>
            {itemsDiscount > 0 && (
              <div className="receipt-line receipt-discount">
                Discount: ({formatCurrency(itemsDiscount)})
              </div>
            )}
            {rental.late_fee > 0 && (
              <div className="receipt-line">Late Fee: {formatCurrency(rental.late_fee)}</div>
            )}
            {rental.damage_charges > 0 && (
              <div className="receipt-line">Damage: {formatCurrency(rental.damage_charges)}</div>
            )}
            <div className="receipt-total">
              GRAND TOTAL: {formatCurrency(total)}
            </div>

            {/* Deposit */}
            {rental.security_deposit > 0 && (
              <>
                <div className="receipt-divider"></div>
                <div className="receipt-line">Security Deposit: {formatCurrency(rental.security_deposit)}</div>
                {rental.damage_charges > 0 && (
                  <div className="receipt-line receipt-discount">
                    Damage Deduction: ({formatCurrency(rental.damage_charges)})
            </div>
                )}
                <div className="receipt-line receipt-bold">
                  Refundable: {formatCurrency(refundableDeposit)}
            </div>
              </>
            )}

            {/* Dates */}
            <div className="receipt-divider"></div>
            <div className="receipt-line">Rental Date: {formatDate(rental.rental_date)}</div>
            <div className="receipt-line">Return Date: {formatDate(rental.return_date)}</div>
            {rental.actual_pickup_date && (
              <div className="receipt-line">Pickup: {formatDate(rental.actual_pickup_date)}</div>
            )}
            {rental.actual_return_date && (
              <div className="receipt-line">Returned: {formatDate(rental.actual_return_date)}</div>
            )}

            {/* Notes */}
            {rental.notes && (
              <>
                <div className="receipt-divider"></div>
                <div className="receipt-label">NOTE:</div>
                <div className="receipt-line">{rental.notes}</div>
              </>
            )}

            {/* Footer */}
            <div className="receipt-divider"></div>
            <div className="receipt-center">
              <div className="receipt-line">Thank you for using SuitLabs!</div>
              <div className="receipt-line receipt-small">All rentals subject to T&C</div>
              <div className="receipt-line receipt-small">6-Month Warranty. T&C apply.</div>
              <div className="receipt-line receipt-small">www.suitlabs.com</div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Styles */}
      <style jsx global>{`
        .thermal-receipt-container {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .thermal-receipt {
          width: 58mm;
          max-width: 58mm;
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