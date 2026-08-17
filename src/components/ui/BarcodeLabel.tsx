'use client';

import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

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
  margin = 8,
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
        // Clean the barcode value
        let cleanedValue = value.trim();
        
        if (cleanedValue.startsWith('\\"') && cleanedValue.endsWith('\\"')) {
          cleanedValue = cleanedValue.substring(2, cleanedValue.length - 2);
        } else if (cleanedValue.startsWith('"') && cleanedValue.endsWith('"')) {
          cleanedValue = cleanedValue.substring(1, cleanedValue.length - 1);
        }

        // Set canvas size for the label
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;

        // Calculate dimensions
        const labelWidth = 384;
        const labelHeight = 320;
        
        canvas.width = labelWidth;
        canvas.height = labelHeight;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, labelWidth, labelHeight);

        // Add border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, labelWidth, labelHeight);

        // Draw item name
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(itemName, labelWidth / 2, 28);

        let barcodeY = 48;
        if (sizeLabel) {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 42px Arial';
          ctx.fillText(sizeLabel, labelWidth / 2, 78);
          barcodeY = 96;
        }

        ctx.fillStyle = '#374151';
        ctx.font = '14px Arial';
        ctx.fillText(`#${itemCode}`, labelWidth / 2, barcodeY);
        barcodeY += 12;

        const barcodeCanvas = document.createElement('canvas');
        JsBarcode(barcodeCanvas, cleanedValue, {
          format: format,
          width: width,
          height: height,
          displayValue: true,
          fontSize: fontSize,
          margin: 8,
          background: '#ffffff',
          lineColor: '#000000',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 4
        });

        const maxBarcodeW = 360;
        let drawW = barcodeCanvas.width;
        if (drawW > maxBarcodeW) {
          const barWidth = Math.max(1, Math.floor(maxBarcodeW / Math.max(1, cleanedValue.length * 11 + 35)));
          JsBarcode(barcodeCanvas, cleanedValue, {
            format: format,
            width: barWidth,
            height: height,
            displayValue: true,
            fontSize: fontSize,
            margin: 8,
            background: '#ffffff',
            lineColor: '#000000',
            textAlign: 'center',
            textPosition: 'bottom',
            textMargin: 4,
          });
          drawW = barcodeCanvas.width;
        }
        const barcodeX = Math.floor((labelWidth - drawW) / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(barcodeCanvas, barcodeX, barcodeY);

        // Call callback with image data
        if (onImageGenerated) {
          const imageDataUrl = canvas.toDataURL('image/png');
          onImageGenerated(imageDataUrl);
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
  }, [value, itemName, itemCode, sizeLabel, format, width, height, fontSize, margin, onImageGenerated, isClient]);

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
