'use client';

import React, { useState } from 'react';
import { QrCode, Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import SimpleModal from '@/components/modals/SimpleModal';

interface SimpleBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
  className?: string;
}

export function SimpleBarcodeScanner({ onScan, onClose, isOpen }: SimpleBarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestScan = () => {
    onScan('TEST123456789');
  };

  const handleCameraTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      stream.getTracks().forEach(track => track.stop());
      setError('Camera access successful. Load QuaggaJS for live scanning.');
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

  return (
    <SimpleModal
      isOpen={isOpen}
      title="Test barcode scanner"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={handleTestScan}>
            <QrCode className="h-4 w-4" />
            Simulate scan
          </Button>
          <Button onClick={handleCameraTest} loading={isLoading}>
            <Camera className="h-4 w-4" />
            Test camera
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <Camera className="mx-auto h-12 w-12 text-slate-400" />
        <p className="text-sm text-slate-600">
          Checks camera permission before live scanning.
        </p>
        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
            <CameraOff className="mx-auto mb-2 h-6 w-6 text-red-400" />
            {error}
          </div>
        )}
      </div>
    </SimpleModal>
  );
}

export default SimpleBarcodeScanner;
