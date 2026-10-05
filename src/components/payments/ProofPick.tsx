'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Camera, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FilePick } from '@/components/ui/Input';
import CameraModal from '@/components/modals/CameraModal';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';
const MAX_BYTES = 5 * 1024 * 1024;

function dataUrlToFile(dataUrl: string, name: string) {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

interface ProofPickProps {
  id: string;
  label?: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

// ProofPick takes one optional receipt for a payment, a Security Deposit, or a
// deposit refund. Staff need it when the payment is fully online and no EDC
// slip exists, or when a courier moves the Pickup or the Return.
export function ProofPick({
  id,
  label = 'Payment proof (optional)',
  hint = 'Transfer or QRIS receipt. Image or PDF, under 5MB.',
  file,
  onChange,
  disabled = false,
}: ProofPickProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState('');

  const isPdf = file?.type === 'application/pdf';
  const previewUrl = useMemo(
    () => (file && !isPdf ? URL.createObjectURL(file) : null),
    [file, isPdf],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const accept = (picked: File | null) => {
    if (!picked) {
      setError('');
      onChange(null);
      return;
    }
    if (!ACCEPTED.split(',').includes(picked.type)) {
      setError('Upload a JPEG, PNG, WebP, GIF, or PDF file');
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError('File must be under 5MB');
      return;
    }
    setError('');
    onChange(picked);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <div className="flex flex-wrap gap-2">
        <FilePick
          id={id}
          accept={ACCEPTED}
          disabled={disabled}
          onChange={accept}
          buttonLabel={file ? 'Replace proof' : 'Choose file'}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => setCameraOpen(true)}
        >
          <Camera className="h-4 w-4" /> Camera
        </Button>
        {file && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => accept(null)}
            data-testid={`${id}-clear`}
          >
            <X className="h-4 w-4" /> Remove
          </Button>
        )}
      </div>
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Payment proof preview" className="max-h-40 rounded-xl object-contain" />
      )}
      {file && isPdf && (
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <FileText className="h-4 w-4" /> {file.name}
        </p>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {!error && <p className="text-xs text-slate-500">{hint}</p>}

      <CameraModal
        isOpen={cameraOpen}
        title="Photograph the receipt"
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => {
          accept(dataUrlToFile(dataUrl, `payment-proof-${id}.jpg`));
          setCameraOpen(false);
        }}
      />
    </div>
  );
}

export default ProofPick;
