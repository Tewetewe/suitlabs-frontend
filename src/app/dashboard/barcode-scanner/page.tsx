'use client';

import React from 'react';
import BarcodeScanExample from '@/components/features/BarcodeScanExample';
import { PageShell } from '@/components/ui/PageShell';

export default function BarcodeScannerPage() {
  return (
    <PageShell
      title="Barcode scanner"
      subtitle="Test camera scanning on a phone or tablet"
    >
      <BarcodeScanExample />

      <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        <p className="font-semibold">How to scan</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Tap Scan barcode and allow camera access</li>
          <li>Hold the code inside the frame until it detects</li>
          <li>The scanner closes automatically when a code is found</li>
        </ol>
      </div>

      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">If it does not work</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Use HTTPS or localhost</li>
          <li>Improve lighting and keep the device still</li>
          <li>Check browser camera permission</li>
        </ul>
      </div>
    </PageShell>
  );
}
