'use client';

import React, { useState } from 'react';
import { QrCode, Search } from 'lucide-react';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import SimpleBarcodeScanner from '@/components/ui/SimpleBarcodeScanner';
import Barcode from '@/components/ui/Barcode';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export function BarcodeScanExample() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSimpleScannerOpen, setIsSimpleScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const handleScan = (barcode: string) => {
    setScannedCode(barcode);
    setIsScannerOpen(false);
  };

  const handleSimpleScan = (barcode: string) => {
    setScannedCode(barcode);
    setIsSimpleScannerOpen(false);
  };

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      setScannedCode(manualCode.trim());
    }
  };

  const clearCode = () => {
    setScannedCode(null);
    setManualCode('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="flex items-center text-base font-semibold text-slate-900">
            <QrCode className="mr-2 h-5 w-5 text-slate-500" />
            Scanner
          </h2>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => setIsSimpleScannerOpen(true)}>
              <QrCode className="h-4 w-4" />
              Test scanner
            </Button>
            <Button variant="secondary" onClick={() => setIsScannerOpen(true)}>
              <QrCode className="h-4 w-4" />
              Scan with camera
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter barcode manually"
              enterKeyHint="search"
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <Button
              variant="secondary"
              onClick={handleManualSearch}
              disabled={!manualCode.trim()}
              aria-label="Search barcode"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {scannedCode && (
            <div className="space-y-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-semibold">Scanned barcode</p>
              <code className="block rounded-xl bg-white/80 px-3 py-2 font-mono text-slate-800">{scannedCode}</code>
              <div className="flex justify-center">
                <Barcode
                  value={scannedCode}
                  format="CODE128"
                  width={2}
                  height={80}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={clearCode}>
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SimpleBarcodeScanner
        isOpen={isSimpleScannerOpen}
        onScan={handleSimpleScan}
        onClose={() => setIsSimpleScannerOpen(false)}
      />
      <BarcodeScanner
        isOpen={isScannerOpen}
        onScan={handleScan}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}

export default BarcodeScanExample;
