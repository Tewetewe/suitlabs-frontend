'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import SimpleModal from '@/components/modals/SimpleModal';
import { apiClient } from '@/lib/api';
import { Rental } from '@/types';

interface EditRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  onSuccess: () => void;
}

export function EditRentalModal({ isOpen, onClose, onSuccess, rental }: EditRentalModalProps) {
  const [form, setForm] = useState({
    rental_date: '',
    return_date: '',
    security_deposit: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rental && isOpen) {
      setForm({
        rental_date: rental.rental_date.split('T')[0], // Convert ISO to date input format
        return_date: rental.return_date.split('T')[0],
        security_deposit: rental.security_deposit,
        notes: rental.notes || ''
      });
    }
  }, [rental, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.rental_date) newErrors.rental_date = 'Rental date is required';
    if (!form.return_date) newErrors.return_date = 'Return date is required';
    
    if (form.rental_date && form.return_date) {
      const startDate = new Date(form.rental_date);
      const endDate = new Date(form.return_date);
      if (endDate <= startDate) {
        newErrors.return_date = 'Return date must be after rental date';
      }
    }

    if (form.security_deposit < 0) {
      newErrors.security_deposit = 'Security deposit cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!rental || !validateForm()) return;

    try {
      setLoading(true);
      // Note: The backend UpdateRentalRequest expects time.Time, but we're sending strings
      // The backend should handle the conversion
      await apiClient.updateRental(rental.id, {
        rental_date: form.rental_date,
        return_date: form.return_date,
        security_deposit: form.security_deposit,
        notes: form.notes
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update rental:', error);
      setErrors({ submit: 'Failed to update rental. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      rental_date: '',
      return_date: '',
      security_deposit: 0,
      notes: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!rental) return null;

  return (
    <SimpleModal isOpen={isOpen} onClose={handleClose} title={`Edit Rental #${rental.id.slice(-8)}`}>
      <div className="space-y-6">
        {/* Status Warning */}
        {rental.status !== 'pending' && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Only pending rentals can be edited. Current status: {rental.status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Rental date"
            type="date"
            value={form.rental_date}
            onChange={(e) => setForm({ ...form, rental_date: e.target.value })}
            disabled={rental.status !== 'pending'}
            error={errors.rental_date}
          />
          <Input
            label="Return date"
            type="date"
            value={form.return_date}
            onChange={(e) => setForm({ ...form, return_date: e.target.value })}
            min={form.rental_date}
            disabled={rental.status !== 'pending'}
            error={errors.return_date}
          />
        </div>

        <CurrencyInput
          label="Security deposit"
          value={form.security_deposit}
          onChange={(n) => setForm({ ...form, security_deposit: n })}
          placeholder="0"
          disabled={rental.status !== 'pending'}
          error={errors.security_deposit}
        />

        <Textarea
          label="Notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Additional notes..."
        />

        {/* Submit Error */}
        {errors.submit && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errors.submit}</div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || rental.status !== 'pending'}
          >
            {loading ? 'Updating...' : 'Update Rental'}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}
