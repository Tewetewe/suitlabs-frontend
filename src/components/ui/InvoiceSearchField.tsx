'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { QrCode } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { cleanScannedCode, looksLikeInvoiceBarcode } from '@/lib/barcode';
import { useToast } from '@/contexts/ToastContext';
import { Booking } from '@/types';

const BarcodeScanner = dynamic(() => import('@/components/ui/BarcodeScanner'), { ssr: false });

function customerName(booking: Booking) {
  if (booking.customer) {
    return `${booking.customer.first_name} ${booking.customer.last_name}`.trim();
  }
  return booking.full_name || booking.invoice_number || 'Booking';
}

function cleanCode(raw: string) {
  return cleanScannedCode(raw);
}

interface InvoiceSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onFound: (booking: Booking) => void;
  placeholder?: string;
}

export function InvoiceSearchField({
  value,
  onChange,
  onFound,
  placeholder = 'Search or scan invoice…',
}: InvoiceSearchFieldProps) {
  const { success, error } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [looking, setLooking] = useState(false);

  const resolve = async (raw: string) => {
    const cleaned = cleanCode(raw);
    if (!looksLikeInvoiceBarcode(cleaned)) {
      onChange(raw.trim());
      if (cleaned) {
        error('Not an invoice', 'Scan the barcode on the receipt, not an item tag.');
      }
      return;
    }
    setLooking(true);
    try {
      const booking = await apiClient.getBookingByInvoice(cleaned);
      onChange(booking.invoice_number || cleaned);
      onFound(booking);
      success('Invoice found', customerName(booking));
    } catch {
      onChange(cleaned);
      error('Not found', `No booking for invoice ${cleaned}`);
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex w-full gap-2">
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || looking) return;
            if (!looksLikeInvoiceBarcode(value)) return;
            e.preventDefault();
            void resolve(value);
          }}
        />
        <Button
          type="button"
          aria-label="Scan invoice barcode"
          title="Scan invoice barcode"
          className="h-11 w-11 shrink-0 px-0"
          loading={looking}
          onClick={() => setScannerOpen(true)}
        >
          <QrCode className="h-5 w-5" />
        </Button>
      </div>
      <BarcodeScanner
        isOpen={scannerOpen}
        onScan={(code) => {
          setScannerOpen(false);
          void resolve(code);
        }}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
