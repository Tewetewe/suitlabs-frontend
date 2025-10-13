'use client';

import React, { useState } from 'react';
import { QrCode, Search } from 'lucide-react';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import SimpleBarcodeScanner from '@/components/ui/SimpleBarcodeScanner';
import Barcode from '@/components/ui/Barcode';

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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <QrCode className="h-5 w-5 mr-2" />
          Barcode Scanner Demo
        </h2>
        
        <div className="space-y-4">
          {/* Scanner Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setIsSimpleScannerOpen(true)}
              className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <QrCode className="h-5 w-5 mr-2" />
              Test Scanner (Simple)
            </button>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              <QrCode className="h-5 w-5 mr-2" />
              Scan Barcode with Camera (Full)
            </button>
          </div>

          {/* Manual Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter barcode manually..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <button
              onClick={handleManualSearch}
              disabled={!manualCode.trim()}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          {scannedCode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Scanned Barcode:</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <code className="text-sm font-mono">{scannedCode}</code>
                </div>
                
                {/* Display Barcode */}
                <div className="flex justify-center">
                  <Barcode 
                    value={scannedCode} 
                    format="CODE128"
                    width={2}
                    height={80}
                  />
                </div>
                
                <button
                  onClick={clearCode}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Modals */}
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
