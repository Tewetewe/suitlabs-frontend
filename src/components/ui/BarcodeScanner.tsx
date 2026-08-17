'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import SimpleModal from '@/components/modals/SimpleModal';

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

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
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

  return (
    <SimpleModal
      isOpen={isOpen}
      title="Scan barcode"
      onClose={onClose}
      size="md"
      footer={
        !isLoading ? (
          <Button
            onClick={error ? retryLoading : startScanning}
            disabled={!isQuaggaLoaded || isScanning}
            fullWidth
          >
            <Camera className="h-4 w-4" />
            {isLoading ? 'Loading library...' : !isQuaggaLoaded ? 'Loading...' : isScanning ? 'Scanning...' : error ? 'Retry' : 'Start scanning'}
          </Button>
        ) : undefined
      }
    >
      <div className="relative">
        <div
          ref={scannerRef}
          className="h-80 w-full overflow-hidden rounded-xl bg-slate-100"
          style={{ minHeight: '320px' }}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/90">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              <p className="text-sm text-slate-600">Loading scanner...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-red-50 p-6 text-center">
            <CameraOff className="mb-3 h-10 w-10 text-red-400" />
            <p className="mb-4 text-sm text-red-700">{error}</p>
            <Button onClick={retryLoading}>
              <Camera className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {!error && isQuaggaLoaded && !isScanning && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-50/90 text-center">
            <div>
              <Camera className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm text-slate-600">Ready to scan</p>
              <p className="mt-1 text-xs text-slate-500">Tap Start scanning below</p>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-white/30" />
            <div className="absolute left-1/2 top-1/2 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-indigo-500">
              <div className="absolute inset-0 animate-pulse rounded-xl border-2 border-indigo-300" />
            </div>
            <div className="absolute left-1/2 top-1/2 -mt-16 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
                Scanning...
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Hold the device steady, use good light, and keep the code in the frame.
      </p>

      {isScanning && (
        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              addDebugInfo('Test barcode detection triggered');
              onScan('TEST123456');
            }}
          >
            Test detection
          </Button>
        </div>
      )}

      {debugInfo.length > 0 && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">
            Debug ({debugInfo.length})
          </summary>
          <div className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-slate-50 p-3 font-mono text-xs">
            {debugInfo.map((info, index) => (
              <div key={index} className="mb-1 text-slate-700">{info}</div>
            ))}
          </div>
        </details>
      )}
    </SimpleModal>
  );
}