'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  format?: 'EAN13' | 'CODE128' | 'CODE39';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  className?: string;
  itemName?: string;
  itemCode?: string;
}

export function Barcode({
  value,
  format = 'EAN13',
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 14,
  margin = 10,
  className = '',
  itemName,
  itemCode
}: BarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        // Clean the barcode value: remove leading/trailing escaped quotes if present
        let cleanedValue = value.trim();
        
        // Check for escaped quotes like \"...\"
        if (cleanedValue.startsWith('\\"') && cleanedValue.endsWith('\\"')) {
          cleanedValue = cleanedValue.substring(2, cleanedValue.length - 2);
        } 
        // Check for unescaped quotes like "..."
        else if (cleanedValue.startsWith('"') && cleanedValue.endsWith('"')) {
          cleanedValue = cleanedValue.substring(1, cleanedValue.length - 1);
        }


        // Determine the best format to use
        let barcodeFormat = format;
        
        // Validate format based on type
        if (format === 'EAN13' && !/^\d{13}$/.test(cleanedValue)) {
          console.warn(`Invalid EAN13 barcode: "${cleanedValue}" (length: ${cleanedValue.length}). Expected 13 digits.`);
          // Try to use CODE128 instead if EAN13 fails
          barcodeFormat = 'CODE128';
          console.log('Falling back to CODE128 format');
        }
        
        // For CODE128, just ensure it's not empty
        if (barcodeFormat === 'CODE128' && cleanedValue.length === 0) {
          console.warn('Empty barcode value for CODE128');
          return;
        }


        JsBarcode(canvasRef.current, cleanedValue, {
          format: barcodeFormat,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: margin,
          background: '#ffffff',
          lineColor: '#000000',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2
        });
      } catch (error) {
        console.error('Failed to generate barcode:', error);
        // Clear canvas and show error message
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Invalid Barcode', canvasRef.current.width / 2, canvasRef.current.height / 2);
          }
        }
      }
    }
  }, [value, format, width, height, displayValue, fontSize, margin]);

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
      {(itemName || itemCode) && (
        <div className="text-center mb-2">
          {itemName && (
            <div className="text-sm font-medium text-gray-900">{itemName}</div>
          )}
          {itemCode && (
            <div className="text-xs text-gray-500">#{itemCode}</div>
          )}
        </div>
      )}
      <canvas ref={canvasRef} />
    </div>
  );
}

export default Barcode;
