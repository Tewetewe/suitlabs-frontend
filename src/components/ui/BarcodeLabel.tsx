'use client';

import React, { useEffect, useRef, useState } from 'react';
import { drawBarcodeLabel } from '@/lib/barcode-label';

interface BarcodeLabelProps {
  value: string;
  itemName: string;
  itemCode: string;
  sizeLabel?: string;
  format?: 'EAN13' | 'CODE128' | 'CODE39';
  width?: number;
  height?: number;
  fontSize?: number;
  margin?: number;
  className?: string;
  onImageGenerated?: (imageDataUrl: string) => void;
}

export function BarcodeLabel({
  value,
  itemName,
  itemCode,
  sizeLabel,
  format = 'CODE128',
  width = 3,
  height = 120,
  fontSize = 14,
  className = '',
  onImageGenerated
}: BarcodeLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (canvasRef.current && value) {
      try {
        drawBarcodeLabel(canvasRef.current, { value, itemName, itemCode, sizeLabel, format, width, height, fontSize });
        if (onImageGenerated) {
          onImageGenerated(canvasRef.current.toDataURL('image/png'));
        }
      } catch (error) {
        console.error('Error generating barcode label:', error);
        // Clear canvas and show error
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Error generating label', canvasRef.current.width / 2, canvasRef.current.height / 2);
          }
        }
      }
    }
  }, [value, itemName, itemCode, sizeLabel, format, width, height, fontSize, onImageGenerated, isClient]);

  if (!isClient) {
    return (
      <div className={`inline-block ${className}`}>
        <div className="rounded-xl border border-black/5 bg-slate-50 p-4 text-center text-sm text-slate-500">
          Loading barcode label...
        </div>
      </div>
    );
  }

  if (!value || value.trim() === '') {
    return (
      <div className={`inline-block ${className}`}>
        <div className="rounded-xl border border-black/5 bg-slate-50 p-4 text-center text-sm text-slate-500">
          No barcode available
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <canvas 
        ref={canvasRef} 
        className="rounded-xl border border-black/5 shadow-sm"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

export default BarcodeLabel;
