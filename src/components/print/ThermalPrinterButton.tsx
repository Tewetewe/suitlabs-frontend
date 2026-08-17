'use client';

import React, { useEffect, useState } from 'react';
import { Bluetooth, BluetoothConnected } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import {
  canUseThermalPrinter,
  connectThermalPrinter,
  disconnectThermalPrinter,
  hasThermalPrinter,
} from '@/lib/print-router';

/**
 * Pair a laptop with the counter's thermal printer.
 *
 * Only rendered where it can actually do something: a Chromium browser on a
 * secure origin, on a device that has no native print app of its own. On a
 * phone the Print button already routes to the bridge or Bluetooth Print, and
 * on an insecure origin the browser refuses to expose Bluetooth at all — in
 * both cases this renders nothing rather than offering a button that fails.
 *
 * The pairing lasts as long as the tab. That is a Web Bluetooth constraint, not
 * a choice: a page cannot silently reconnect to a device the user picked in an
 * earlier session. Printing still works without it — it just goes through the
 * print dialog instead, and the drawer stays shut.
 */
export function ThermalPrinterButton({ className }: { className?: string }) {
  const { success, error } = useToast();
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAvailable(canUseThermalPrinter());
    setConnected(hasThermalPrinter());
  }, []);

  if (!available) return null;

  const handleClick = async () => {
    setBusy(true);
    try {
      if (connected) {
        await disconnectThermalPrinter();
        setConnected(false);
        success('Printer disconnected', 'Print will use the browser dialog again.');
        return;
      }
      const name = await connectThermalPrinter();
      setConnected(true);
      success('Printer connected', `${name} — Print now goes straight to paper.`);
    } catch (err) {
      // Cancelling the browser's device picker throws; that is not a failure.
      const message = err instanceof Error ? err.message : 'Could not reach the printer.';
      if (!/cancell?ed|User cancelled/i.test(message)) {
        error('Could not connect', message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} loading={busy} className={className}>
      {connected ? <BluetoothConnected className="h-4 w-4" /> : <Bluetooth className="h-4 w-4" />}
      {connected ? 'Printer connected' : 'Connect printer'}
    </Button>
  );
}

export default ThermalPrinterButton;
