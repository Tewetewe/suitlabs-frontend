'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Rental } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { thermalPrinter } from '@/lib/thermal-printer';
import { getBprintRentalInvoiceUrl } from '@/lib/bprint';

interface RentalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export function RentalInvoiceModal({ isOpen, onClose, rental }: RentalInvoiceModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string>('');

  if (!isOpen || !rental) return null;

  const bprintUrl = getBprintRentalInvoiceUrl(rental.id);

  const printDirect = async () => {
    if (!rental) return;
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
        await thermalPrinter.printRentalInvoice(rental);
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
              <div className="receipt-title">SUITLABS BALI</div>
              <div className="receipt-subtitle">Sewa Jas Jimbaran & Nusa Dua</div>
              <div className="receipt-line">Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362</div>
              <div className="receipt-line">TEL: +62 361 123 4567</div>
              <div className="receipt-line">Email: suitlabsbali@gmail.com</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoiceNumber}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Rental ID: {rental.id.slice(-8)}</div>
            <div className="receipt-line">Status: {rental.status.toUpperCase()}</div>
            <div className="receipt-divider"></div>

            {/* Customer (name only) */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{rental.customer ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim() || '-' : '-'}</div>

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
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
        <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Rental Invoice</h3>
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
              <div className="receipt-line">Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362</div>
              <div className="receipt-line">TEL: +62 361 123 4567</div>
              <div className="receipt-line">Email: suitlabsbali@gmail.com</div>
            </div>

            <div className="receipt-divider"></div>

            {/* Invoice Info */}
            <div className="receipt-line">Invoice: {invoiceNumber}</div>
            <div className="receipt-line">Date: {dateStr} {timeStr}</div>
            <div className="receipt-line">Rental ID: {rental.id.slice(-8)}</div>
            <div className="receipt-line">Status: {rental.status.toUpperCase()}</div>
            <div className="receipt-divider"></div>

            {/* Customer (name only) */}
            <div className="receipt-label">CUSTOMER:</div>
            <div className="receipt-line">{rental.customer ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim() || '-' : '-'}</div>

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

export default RentalInvoiceModal;