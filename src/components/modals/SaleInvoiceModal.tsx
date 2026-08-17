'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Sale } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { printSaleInvoice } from '@/lib/print-router';
import { RECEIPT_STYLES } from '@/lib/receipt-styles';
import { invoiceBarcodeValue, saleInvoiceNumber } from '@/lib/barcode';
import { ThermalPrinterButton } from '@/components/print/ThermalPrinterButton';
import SimpleModal from '@/components/modals/SimpleModal';
import { RackPullList } from '@/components/items/RackPullList';
import { useToast } from '@/contexts/ToastContext';
import Barcode from '@/components/ui/Barcode';

interface SaleInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export function SaleInvoiceModal({ isOpen, onClose, sale }: SaleInvoiceModalProps) {
  const { error: toastError, success } = useToast();

  if (!isOpen || !sale) return null;

  const invoiceNumber = saleInvoiceNumber(sale);
  const shopSubtitle = sale.branch?.receipt_subtitle || 'Sewa Jas Jimbaran';
  const shopAddress = sale.branch?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362';
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

  const handlePrint = async () => {
    try {
      const { route } = await printSaleInvoice(sale);
      if (route === 'thermal') {
        success('Sent to the printer', 'Cash drawer opened.');
      }
    } catch (err) {
      toastError('Could not print', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const downloadInvoice = async () => {
    const receiptContainer = document.querySelector('.thermal-receipt-container') as HTMLElement;
    if (!receiptContainer) {
      toastError('Invoice not ready', 'Please try again.');
      return;
    }

    const clone = receiptContainer.cloneNode(true) as HTMLElement;
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
    const computedStyle = window.getComputedStyle(receiptContainer);
    tempContainer.style.fontFamily = computedStyle.fontFamily || "'Courier New', monospace";
    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const clonedReceipt = tempContainer.querySelector('.thermal-receipt') as HTMLElement;
      if (!clonedReceipt) {
        throw new Error('Cloned receipt element not found');
      }
      const width = receiptContainer.offsetWidth || 219;
      const height = clonedReceipt.scrollHeight || clonedReceipt.offsetHeight || 800;
      const canvas = await html2canvas(clonedReceipt, {
        scale: 1.8,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width,
        height,
        allowTaint: false,
      });
      document.body.removeChild(tempContainer);
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas is empty or invalid. Please ensure the invoice is visible.');
      }
      const imgWidth = 58;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight],
        compress: true,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (!imgData || !imgData.startsWith('data:image/jpeg;base64,')) {
        throw new Error('Invalid image data generated');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice_${invoiceNumber}.pdf`);
    } catch (error) {
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
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
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                <div className="receipt-center">
                  <div className="receipt-title">SUITLABS BALI</div>
                  <div className="receipt-subtitle">{shopSubtitle}</div>
                  <div className="receipt-line">{shopAddress}</div>
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
                      width={1.1}
                      height={36}
                      fontSize={8}
                      margin={0}
                      displayValue={false}
                    />
                  </div>
                )}
                <div className="receipt-divider"></div>
                <div className="receipt-label">CUSTOMER:</div>
                <div className="receipt-line">{customerName}</div>
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
