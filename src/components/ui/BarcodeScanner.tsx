'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import SimpleModal from '@/components/modals/SimpleModal';
import { cleanScannedCode, confirmedScan } from '@/lib/barcode';

interface QuaggaConfig {
  inputStream: {
    name: string;
    type: string;
    target: HTMLElement;
    constraints: {
      width: { ideal: number };
      height: { ideal: number };
      facingMode: { ideal: string };
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

type DetectedBarcode = { rawValue: string };

type BarcodeDetectorHandle = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorHandle;
    Quagga?: {
      init: (config: QuaggaConfig, callback: (err: Error | null) => void) => void;
      start: () => void;
      stop: () => void;
      onDetected: (callback: (result: { codeResult: { code: string } }) => void) => void;
      offDetected?: (callback: (result: { codeResult: { code: string } }) => void) => void;
    };
  }
}

function nativeDetector(): BarcodeDetectorHandle | null {
  if (typeof window === 'undefined' || !window.BarcodeDetector) return null;
  try {
    return new window.BarcodeDetector({ formats: ['code_128', 'ean_13'] });
  } catch {
    return null;
  }
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState('Hold steady — waiting for a lock…');
  const [retryNonce, setRetryNonce] = useState(0);
  const quaggaLoadedRef = useRef(false);

  const scannerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recentRef = useRef<string[]>([]);
  const acceptedRef = useRef(false);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorHandle | null>(null);
  const quaggaHandlerRef = useRef<((result: { codeResult: { code: string } }) => void) | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopEverything = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    if (window.Quagga) {
      try {
        if (quaggaHandlerRef.current && window.Quagga.offDetected) {
          window.Quagga.offDetected(quaggaHandlerRef.current);
        }
        window.Quagga.stop();
      } catch {
        // Camera may already be stopped.
      }
    }
    quaggaHandlerRef.current = null;
    detectorRef.current = null;
    setIsScanning(false);
  }, []);

  const acceptCode = useCallback(
    (raw: string) => {
      const cleaned = cleanScannedCode(raw);
      if (cleaned.length < 6 || acceptedRef.current) return;
      recentRef.current = [...recentRef.current.slice(-4), cleaned];
      const locked = confirmedScan(recentRef.current, 3);
      if (!locked) {
        setHint('Keep the barcode in the frame…');
        return;
      }
      acceptedRef.current = true;
      stopEverything();
      onScanRef.current(locked);
    },
    [stopEverything],
  );

  const startNative = useCallback(async () => {
    const detector = nativeDetector();
    const video = videoRef.current;
    if (!detector || !video) return false;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    streamRef.current = stream;
    detectorRef.current = detector;
    video.srcObject = stream;
    await video.play();

    const tick = async () => {
      if (acceptedRef.current || !detectorRef.current || !videoRef.current) return;
      try {
        if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const codes = await detectorRef.current.detect(videoRef.current);
          const value = codes.find((code) => code.rawValue)?.rawValue;
          if (value) acceptCode(value);
        }
      } catch {
        // A dropped frame is fine; the next rAF will try again.
      }
      if (!acceptedRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      }
    };
    rafRef.current = requestAnimationFrame(() => {
      void tick();
    });
    return true;
  }, [acceptCode]);

  const startQuagga = useCallback(() => {
    if (!window.Quagga || !scannerRef.current) {
      setError('Camera scanner failed to load.');
      return;
    }
    scannerRef.current.innerHTML = '';
    const config: QuaggaConfig = {
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerRef.current,
        constraints: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: 'environment' },
        },
      },
      locator: {
        patchSize: 'medium',
        halfSample: true,
      },
      numOfWorkers: 0,
      frequency: 8,
      decoder: {
        // Labels and receipts are printed as CODE128. Extra readers (EAN/UPC)
        // fire false positives on those bars and look up the wrong code.
        readers: ['code_128_reader'],
      },
      locate: true,
    };

    window.Quagga.init(config, (err: Error | null) => {
      if (err) {
        setError(`Failed to initialize camera: ${err.message}`);
        setIsScanning(false);
        return;
      }
      const handler = (result: { codeResult: { code: string } }) => {
        if (result?.codeResult?.code) acceptCode(result.codeResult.code);
      };
      quaggaHandlerRef.current = handler;
      window.Quagga.onDetected(handler);
      window.Quagga.start();
    });
  }, [acceptCode]);

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      return;
    }

    acceptedRef.current = false;
    recentRef.current = [];
    setError(null);
    setHint('Hold steady — waiting for a lock…');
    setIsScanning(true);

    let cancelled = false;
    const start = async () => {
      try {
        const native = await startNative();
        if (cancelled || acceptedRef.current) return;
        if (native) return;

        if (!quaggaLoadedRef.current) {
          setIsLoading(true);
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[data-quagga="1"]');
            if (existing && window.Quagga) {
              quaggaLoadedRef.current = true;
              resolve();
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
            script.async = true;
            script.dataset.quagga = '1';
            script.onload = () => {
              if (!window.Quagga) {
                reject(new Error('QuaggaJS loaded but is not available'));
                return;
              }
              quaggaLoadedRef.current = true;
              resolve();
            };
            script.onerror = () => reject(new Error('Failed to load QuaggaJS'));
            document.head.appendChild(script);
          });
          setIsLoading(false);
        }
        if (cancelled || acceptedRef.current) return;
        startQuagga();
      } catch (err) {
        if (cancelled) return;
        setIsLoading(false);
        let message = 'Camera access denied or not available';
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            message = 'Camera permission denied. Please allow camera access and try again.';
          } else if (err.name === 'NotFoundError') {
            message = 'No camera found. Please ensure a camera is connected.';
          } else if (err.name === 'NotReadableError') {
            message = 'Camera is already in use by another application.';
          } else {
            message = err.message;
          }
        }
        setError(message);
        setIsScanning(false);
      }
    };
    void start();

    return () => {
      cancelled = true;
      stopEverything();
    };
  }, [isOpen, retryNonce, startNative, startQuagga, stopEverything]);

  return (
    <SimpleModal
      isOpen={isOpen}
      title="Scan barcode"
      onClose={() => {
        stopEverything();
        onClose();
      }}
      size="md"
      footer={
        error ? (
          <Button
            onClick={() => {
              setError(null);
              setRetryNonce((n) => n + 1);
            }}
            fullWidth
          >
            <Camera className="h-4 w-4" />
            Retry
          </Button>
        ) : undefined
      }
    >
      <div className="relative">
        <video
          ref={videoRef}
          className="h-80 w-full rounded-xl bg-slate-900 object-cover"
          muted
          playsInline
          autoPlay
        />
        <div
          ref={scannerRef}
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl [&_canvas]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/90">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              <p className="text-sm text-slate-600">Starting camera…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-red-50 p-6 text-center">
            <CameraOff className="mb-3 h-10 w-10 text-red-400" />
            <p className="mb-4 text-sm text-red-700">{error}</p>
          </div>
        )}

        {isScanning && !error && !isLoading && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-36 w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-indigo-500/80" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white">
              {hint}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Hold the device steady, use good light, and fill the frame with the bars.
      </p>
    </SimpleModal>
  );
}
