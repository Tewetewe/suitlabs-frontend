'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FilePick } from '@/components/ui/Input';
import SimpleModal from './SimpleModal';
import CameraModal from './CameraModal';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { Rental } from '@/types';

interface PickupRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rental: Rental | null;
}

function dataUrlToFile(dataUrl: string, name: string) {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

export function PickupRentalModal({ isOpen, onClose, onSuccess, rental }: PickupRentalModalProps) {
  const [identityCardFile, setIdentityCardFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const previewUrl = useMemo(
    () => (identityCardFile ? URL.createObjectURL(identityCardFile) : null),
    [identityCardFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ identityCard: 'Upload a JPEG, PNG, or WebP image' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ identityCard: 'File must be under 5MB' });
      return;
    }
    setIdentityCardFile(file);
    setErrors({});
  };

  const handleCapture = (imageData: string) => {
    handleFile(dataUrlToFile(imageData, `id-card-${Date.now()}.jpg`));
    setCameraOpen(false);
  };

  const handleSubmit = async () => {
    if (!rental) return;
    setErrors({});
    setUploading(true);
    try {
      let identityCardUrl: string | undefined;
      if (identityCardFile) {
        identityCardUrl = await apiClient.uploadIdentityCard(identityCardFile);
      }
      await apiClient.activateRental(rental.id, rental.created_by, identityCardUrl);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to pickup rental:', error);
      setErrors({ submit: 'Could not complete pickup. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIdentityCardFile(null);
    setCameraOpen(false);
    setErrors({});
    onClose();
  };

  return (
    <>
      <SimpleModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Pickup rental"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={handleClose} disabled={uploading}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading || !identityCardFile}
              loading={uploading}
              data-testid="confirm-pickup"
            >
              Confirm pickup
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {rental && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">
                {rental.customer ? `${rental.customer.first_name} ${rental.customer.last_name}` : 'Customer'}
              </p>
              <p className="mt-1 text-sm text-slate-500">{formatCurrency(rental.total_cost)}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">Identity card</div>
            {previewUrl && (
              <div className="overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Identity card preview" className="max-h-48 w-full object-contain" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCameraOpen(true)}
                disabled={uploading}
              >
                <Camera className="h-4 w-4" />
                Take photo
              </Button>
              <FilePick
                id="identity-card-upload"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFile}
                buttonLabel={identityCardFile ? 'Replace file' : 'Attach file'}
                fullWidth
              />
            </div>
            {errors.identityCard ? (
              <p className="text-xs text-red-600">{errors.identityCard}</p>
            ) : (
              <p className="text-xs text-slate-500">Clear photo of KTP or passport, under 5MB.</p>
            )}
          </div>

          {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}
        </div>
      </SimpleModal>

      <CameraModal
        isOpen={cameraOpen}
        title="Photograph ID card"
        facingMode="environment"
        onCapture={handleCapture}
        onClose={() => setCameraOpen(false)}
      />
    </>
  );
}
