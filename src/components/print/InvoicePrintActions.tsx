'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { ThermalPrinterButton } from '@/components/print/ThermalPrinterButton';
import { useToast } from '@/contexts/ToastContext';
import type { PrintOutcome } from '@/lib/print-router';

export function InvoicePrintActions({
  onClose,
  onDownload,
  printInvoice,
  printBarcode,
}: {
  onClose: () => void;
  onDownload: () => void;
  printInvoice: () => Promise<PrintOutcome>;
  printBarcode: () => Promise<PrintOutcome>;
}) {
  const { error: toastError, success } = useToast();

  const runPrint = async (print: () => Promise<PrintOutcome>) => {
    try {
      const { route, drawer } = await print();
      if (route === 'thermal') {
        success('Sent to the printer', drawer ? 'Cash drawer opened.' : 'Barcode printed.');
      }
    } catch (err) {
      toastError('Could not print', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
        Close
      </Button>
      <ThermalPrinterButton className="w-full sm:w-auto" />
      <Button variant="outline" onClick={onDownload} className="w-full sm:w-auto">
        Download
      </Button>
      <Button
        variant="outline"
        onClick={() => runPrint(printBarcode)}
        className="w-full sm:w-auto"
        data-testid="print-barcode"
      >
        Print barcode
      </Button>
      <Button
        onClick={() => runPrint(printInvoice)}
        className="w-full sm:w-auto"
        data-testid="print-invoice"
      >
        Print invoice
      </Button>
    </div>
  );
}

export default InvoicePrintActions;
