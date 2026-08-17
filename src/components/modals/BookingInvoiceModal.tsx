'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { InvoiceData } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { printBookingInvoice } from '@/lib/print-router';
import { RECEIPT_STYLES } from '@/lib/receipt-styles';
import { invoiceBarcodeValue } from '@/lib/barcode';
import { formatCurrency } from '@/lib/currency';
import { ThermalPrinterButton } from '@/components/print/ThermalPrinterButton';
import SimpleModal from '@/components/modals/SimpleModal';
import { RackPullList } from '@/components/items/RackPullList';
import { useToast } from '@/contexts/ToastContext';
import Barcode from '@/components/ui/Barcode';

interface BookingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function BookingInvoiceModal({ isOpen, onClose, invoice }: BookingInvoiceModalProps) {
  const { error: toastError, success } = useToast();

  if (!isOpen || !invoice) return null;

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

  // Bprint-style date formats (match backend bprint)
  const bprintDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const bprintDateTime = (d: string | Date) => {
    const x = new Date(d);
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handlePrint = async () => {
    try {
      const { route } = await printBookingInvoice(invoice);
      if (route === 'thermal') {
        success('Sent to the printer', 'Cash drawer opened.');
      }
    } catch (err) {
      toastError('Could not print', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const downloadInvoice = async () => {
    if (!invoice) return;
    
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
                  {/* Company Header - same as bprint */}
                  <div className="receipt-center">
                    <div className="receipt-title">SUITLABS BALI</div>
                    <div className="receipt-subtitle">{invoice.company?.subtitle || 'Sewa Jas Jimbaran'}</div>
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

