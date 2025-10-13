'use client';

import React, { useState } from 'react';
import { QrCode, X, Camera, CameraOff } from 'lucide-react';

interface SimpleBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
  className?: string;
}

export function SimpleBarcodeScanner({ onScan, onClose, isOpen, className = '' }: SimpleBarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestScan = () => {
    // Simulate a barcode scan for testing
    onScan('TEST123456789');
  };

  const handleCameraTest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Test camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setError('Camera access successful! QuaggaJS library needs to be loaded for actual scanning.');
    } catch (err) {
      let errorMessage = 'Camera access denied or not available';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please ensure a camera is connected.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints cannot be satisfied.';
        } else {
          errorMessage = `Camera error: ${err.message}`;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-white flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            Simple Barcode Scanner Test
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">
              This is a simplified test to check if the basic functionality works.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <CameraOff className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleCameraTest}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isLoading ? 'Testing Camera...' : 'Test Camera Access'}
            </button>

            <button
              onClick={handleTestScan}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Simulate Barcode Scan
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>This test will help identify if the issue is with:</p>
            <p>• Camera permissions</p>
            <p>• QuaggaJS library loading</p>
            <p>• Component rendering</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleBarcodeScanner;
