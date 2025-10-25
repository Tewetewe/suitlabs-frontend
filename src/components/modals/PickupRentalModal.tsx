'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import SimpleModal from './SimpleModal';
import { apiClient } from '@/lib/api';
import { Rental } from '@/types';

interface PickupRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rental: Rental | null;
}

export function PickupRentalModal({ isOpen, onClose, onSuccess, rental }: PickupRentalModalProps) {
  const [identityCardFile, setIdentityCardFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ identityCard: 'Please upload a valid image file (JPEG, PNG, or WebP)' });
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ identityCard: 'File size must be less than 5MB' });
        return;
      }
      
      setIdentityCardFile(file);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!rental) return;

    setErrors({});
    setUploading(true);

    try {
      let identityCardUrl: string | undefined;

      // Upload identity card if provided
      if (identityCardFile) {
        identityCardUrl = await apiClient.uploadIdentityCard(identityCardFile);
      }

      // Activate rental with identity card URL
      await apiClient.activateRental(rental.id, rental.created_by, identityCardUrl);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to pickup rental:', error);
      setErrors({ submit: 'Failed to pickup rental. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIdentityCardFile(null);
    setErrors({});
    onClose();
  };

  return (
    <SimpleModal isOpen={isOpen} onClose={handleClose} title="Pickup Rental">
      <div className="space-y-4">
        {rental && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Rental Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Rental ID: #{rental.id.slice(-8)}</div>
              <div>Customer: {rental.customer ? `${rental.customer.first_name} ${rental.customer.last_name}` : 'Unknown'}</div>
              <div>Total Cost: ${rental.total_cost.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Identity Card (Required)
          </label>
          <div className="mt-1">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {identityCardFile && (
              <div className="mt-2 text-sm text-green-600">
                Selected: {identityCardFile.name}
              </div>
            )}
            {errors.identityCard && (
              <div className="mt-1 text-sm text-red-600">{errors.identityCard}</div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Please upload a clear photo of the customer&apos;s identity card for verification.
          </p>
        </div>

        {errors.submit && (
          <div className="text-sm text-red-600">{errors.submit}</div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !identityCardFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? 'Processing...' : 'Confirm Pickup'}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}
