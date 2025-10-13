'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, X, QrCode } from 'lucide-react';

interface QuaggaConfig {
  inputStream: {
    name: string;
    type: string;
    target: HTMLElement;
    constraints: {
      width: number;
      height: number;
      facingMode: string;
    };
  };
  locator: {
    patchSize: string;
    halfSample: boolean;
  };
  numOfWorkers: number;
  frequency: number;
  decoder: {
    readers: string[];
  };
  locate: boolean;
}

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  className?: string;
}

declare global {
  interface Window {
    Quagga: {
      init: (config: QuaggaConfig, callback: (err: Error | null) => void) => void;
      start: () => void;
      stop: () => void;
      onDetected: (callback: (result: { codeResult: { code: string } }) => void) => void;
      onProcessed: (callback: (result: { boxes?: unknown[]; codeResult?: { code: string } }) => void) => void;
    };
  }
}

export default function BarcodeScanner({ isOpen, onClose, onScan, className = '' }: BarcodeScannerProps) {
  const [isQuaggaLoaded, setIsQuaggaLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugInfo(prev => [...prev.slice(-49), logMessage]);
    console.log(`[BarcodeScanner] ${message}`);
  }, []);

  // Load QuaggaJS when modal opens
  useEffect(() => {
    if (!isOpen || isQuaggaLoaded || isLoading) return;

    addDebugInfo('Loading QuaggaJS library');
    setIsLoading(true);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
    script.async = true;
    
    script.onload = () => {
      addDebugInfo('QuaggaJS script loaded');
      if (window.Quagga) {
        addDebugInfo('QuaggaJS library available');
        setIsQuaggaLoaded(true);
        setIsLoading(false);
      } else {
        addDebugInfo('QuaggaJS loaded but not available on window');
        setError('Failed to load QuaggaJS library');
        setIsLoading(false);
      }
    };
    
    script.onerror = () => {
      addDebugInfo('Failed to load QuaggaJS script');
      setError('Failed to load QuaggaJS library');
      setIsLoading(false);
    };
    
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isOpen, isQuaggaLoaded, isLoading, addDebugInfo]);

  const startScanning = useCallback(async () => {
    if (!isQuaggaLoaded || !scannerRef.current || isScanning) return;

    addDebugInfo('Starting camera initialization');
    setIsScanning(true);
    setError(null);

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      addDebugInfo('Camera permission granted');
      stream.getTracks().forEach(track => track.stop());

      // Clear scanner container
      if (scannerRef.current) {
        scannerRef.current.innerHTML = '';
      }

      // Configure QuaggaJS with better barcode detection settings
      const config: QuaggaConfig = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current as unknown as HTMLElement,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2, // Use workers for better performance
        frequency: 10,
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ]
        },
        locate: true
      };

      addDebugInfo('Initializing QuaggaJS with primary config');
      window.Quagga.init(config, (err: Error | null) => {
        if (err) {
          addDebugInfo(`Primary config failed: ${err.message}, trying fallback...`);
          
          // Try fallback configuration with simpler settings
          const fallbackConfig: QuaggaConfig = {
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: scannerRef.current as unknown as HTMLElement,
              constraints: {
                width: 480,
                height: 360,
                facingMode: "environment"
              }
            },
            locator: {
              patchSize: "small",
              halfSample: true
            },
            numOfWorkers: 0,
            frequency: 5,
            decoder: {
              readers: ["code_128_reader", "ean_reader"]
            },
            locate: true
          };

          addDebugInfo('Trying fallback configuration');
          window.Quagga.init(fallbackConfig, (fallbackErr: Error | null) => {
            if (fallbackErr) {
              addDebugInfo(`Fallback config also failed: ${fallbackErr.message}`);
              setError(`Failed to initialize camera: ${fallbackErr.message}`);
              setIsScanning(false);
              return;
            }
            
            addDebugInfo('QuaggaJS initialized with fallback config');
            setupBarcodeDetection();
          });
          return;
        }
        
        addDebugInfo('QuaggaJS initialized successfully with primary config');
        setupBarcodeDetection();
      });

      const setupBarcodeDetection = () => {
        // Add event listeners before starting
        window.Quagga.onDetected((result: { codeResult: { code: string } }) => {
          const code = result.codeResult.code;
          addDebugInfo(`Barcode detected: ${code}`);
          onScan(code);
          // Stop scanning after detection
          if (window.Quagga) {
            try {
              window.Quagga.stop();
              addDebugInfo('Camera stopped after detection');
            } catch (err) {
              addDebugInfo(`Error stopping camera: ${err}`);
            }
          }
          setIsScanning(false);
        });

        // Add processResult listener for better debugging
        window.Quagga.onProcessed((result: { boxes?: unknown[]; codeResult?: { code: string } }) => {
          if (result) {
            if (result.boxes && result.boxes.length > 0) {
              addDebugInfo(`Processing frame with ${result.boxes.length} potential barcode boxes`);
            }
            if (result.codeResult) {
              addDebugInfo(`Code result found: ${result.codeResult.code}`);
            }
          }
        });

        window.Quagga.start();
        addDebugInfo('Camera started - ready to scan barcodes');
      };

    } catch (err) {
      addDebugInfo(`Camera error: ${err}`);
      
      let errorMessage = 'Camera access denied or not available';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please ensure a camera is connected.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else {
          errorMessage = `Camera error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  }, [isQuaggaLoaded, onScan, addDebugInfo, isScanning]);

  const retryLoading = useCallback(() => {
    addDebugInfo('Retrying QuaggaJS loading');
    setError(null);
    setIsQuaggaLoaded(false);
    setIsLoading(false);
    setIsScanning(false);
  }, [addDebugInfo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (window.Quagga) {
        try {
          window.Quagga.stop();
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-white flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            Scan Barcode
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          <div
            ref={scannerRef}
            className="w-full h-80 bg-white rounded-lg overflow-hidden"
            style={{ minHeight: '320px' }}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading scanner...</p>
                <p className="text-sm text-gray-500 mt-2">Please wait while we initialize the camera</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 bg-red-50/95 border border-red-200 rounded-lg p-8 text-center flex flex-col items-center justify-center">
              <CameraOff className="h-12 w-12 mb-4 text-red-400" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={retryLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                <Camera className="h-4 w-4 inline mr-2" />
                Retry
              </button>
            </div>
          )}

          {/* Ready to scan overlay */}
          {!error && isQuaggaLoaded && !isScanning && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 rounded-lg text-center">
              <div>
                <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Ready to scan</p>
                <p className="text-sm text-gray-500">Click &quot;Start Scanning&quot; below to begin</p>
              </div>
            </div>
          )}

          {/* Scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-white/30" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-blue-500 rounded-lg">
                <div className="absolute inset-0 border-2 border-blue-300 rounded-lg animate-pulse" />
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-16 text-center">
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Scanning for barcodes...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="mt-4">
          {!isLoading && (
            <button
              onClick={error ? retryLoading : startScanning}
              disabled={!isQuaggaLoaded || isScanning}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-4 w-4 inline mr-2" />
              {isLoading ? 'Loading Library...' : !isQuaggaLoaded ? 'Loading...' : isScanning ? 'Scanning...' : error ? 'Retry' : 'Start Scanning'}
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>For best results on iPad:</p>
          <p>• Hold device steady</p>
          <p>• Ensure good lighting</p>
          <p>• Position barcode within the frame</p>
          <p>• Supports: Code 128, EAN, UPC, Code 39, Codabar</p>
        </div>

        {/* Test button for debugging */}
        {isScanning && (
          <div className="mt-2 text-center">
            <button
              onClick={() => {
                addDebugInfo('Test barcode detection triggered');
                onScan('TEST123456');
              }}
              className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
            >
              Test Detection
            </button>
          </div>
        )}

        {/* Debug Panel */}
        {debugInfo.length > 0 && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 font-semibold">
              🔧 Debug Information ({debugInfo.length} entries)
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-y-auto border">
              {debugInfo.map((info, index) => (
                <div key={index} className="mb-1 text-gray-700">{info}</div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}