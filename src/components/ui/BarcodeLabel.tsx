'use client';

import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeLabelProps {
  value: string;
  itemName: string;
  itemCode: string;
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
  format = 'CODE128',
  width = 2,
  height = 80,
  fontSize = 12,
  margin = 20,
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
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate dimensions
        const labelWidth = 400;
        const labelHeight = 200;
        
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
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(itemName, labelWidth / 2, 40);

        // Draw item code
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Arial';
        ctx.fillText(`#${itemCode}`, labelWidth / 2, 60);

        // Create barcode on a separate canvas
        const barcodeCanvas = document.createElement('canvas');
        JsBarcode(barcodeCanvas, cleanedValue, {
          format: format,
          width: width,
          height: height,
          displayValue: true,
          fontSize: fontSize,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2
        });

        // Draw barcode in the center
        const barcodeX = (labelWidth - barcodeCanvas.width) / 2;
        const barcodeY = 80;
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
  }, [value, itemName, itemCode, format, width, height, fontSize, margin, onImageGenerated, isClient]);

  if (!isClient) {
    return (
      <div className={`inline-block ${className}`}>
        <div className="bg-gray-100 border border-gray-300 rounded p-4 text-center text-gray-500 text-sm">
          Loading barcode label...
        </div>
      </div>
    );
  }

  if (!value || value.trim() === '') {
    return (
      <div className={`inline-block ${className}`}>
        <div className="bg-gray-100 border border-gray-300 rounded p-4 text-center text-gray-500 text-sm">
          No barcode available
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <canvas 
        ref={canvasRef} 
        className="border border-gray-200 rounded-lg shadow-sm"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

export default BarcodeLabel;
