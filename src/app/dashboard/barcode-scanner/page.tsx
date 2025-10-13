'use client';

import React from 'react';
import BarcodeScanExample from '@/components/features/BarcodeScanExample';

export default function BarcodeScannerPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Barcode Scanner
          </h1>
          <p className="text-gray-600">
            Test the barcode scanning functionality on your iPad or mobile device.
          </p>
        </div>

        <BarcodeScanExample />
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            📱 iPad Usage Instructions
          </h3>
          <div className="space-y-2 text-sm text-blue-700">
            <p><strong>1.</strong> Tap &quot;Scan Barcode with Camera&quot; to open the scanner</p>
            <p><strong>2.</strong> Allow camera permission when prompted</p>
            <p><strong>3.</strong> Position the barcode within the white frame</p>
            <p><strong>4.</strong> Hold the device steady until the barcode is detected</p>
            <p><strong>5.</strong> The scanner will automatically close when a barcode is found</p>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            ⚠️ Troubleshooting
          </h3>
          <div className="space-y-2 text-sm text-yellow-700">
            <p><strong>Camera not working?</strong> Make sure you&apos;re using HTTPS or localhost</p>
            <p><strong>Can&apos;t detect barcode?</strong> Try better lighting and hold the device steady</p>
            <p><strong>Permission denied?</strong> Check your browser settings for camera access</p>
            <p><strong>Scanner not loading?</strong> Check your internet connection for the QuaggaJS library</p>
          </div>
        </div>
      </div>
    </div>
  );
}
