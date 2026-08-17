'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Customer, CreateCustomerRequest } from '@/types';
import SimpleModal from '@/components/modals/SimpleModal';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, customer: Partial<CreateCustomerRequest>) => Promise<void>;
  customer: Customer | null;
}

export default function EditCustomerModal({ isOpen, onClose, onUpdate, customer }: EditCustomerModalProps) {
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    instagram: '',
    tiktok: '',
    address: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when customer changes
  useEffect(() => {
    if (customer) {
      console.log('Customer data:', customer); // Debug log
      setFormData({
        email: customer.email || '',
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        instagram: customer.instagram || '',
        tiktok: customer.tiktok || '',
        address: customer.address || '',
        notes: customer.notes || ''
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    // Clear previous errors
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      
      // Prepare update data with only changed fields (matching backend UpdateCustomerRequest)
      const updateData: Partial<CreateCustomerRequest> = {};
      
      // Only include fields that have changed
      if (formData.first_name !== customer.first_name) {
        updateData.first_name = formData.first_name;
      }
      if (formData.last_name !== customer.last_name) {
        updateData.last_name = formData.last_name;
      }
      // Allow clearing email by sending empty string
      if ((formData.email || '') !== (customer.email || '')) {
        updateData.email = formData.email;
      }
      if (formData.phone !== customer.phone) {
        updateData.phone = formData.phone;
      }
      if ((formData.instagram || '') !== (customer.instagram || '')) {
        updateData.instagram = formData.instagram;
      }
      if ((formData.tiktok || '') !== (customer.tiktok || '')) {
        updateData.tiktok = formData.tiktok;
      }
      
      // Always include address and notes if they have values
      if (formData.address) {
        updateData.address = formData.address;
      }
      if (formData.notes) {
        updateData.notes = formData.notes;
      }
      
      await onUpdate(customer.id, updateData);
      onClose();
    } catch (error) {
      console.error('Failed to update customer:', error);
      setErrors({ general: 'Failed to update customer. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`Form field ${field} changed to:`, value); // Debug log
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <SimpleModal
      isOpen={isOpen}
      title="Edit customer"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="edit-customer-form" loading={loading}>Save</Button>
        </>
      }
    >
        <form id="edit-customer-form" onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errors.general}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="John"
              error={errors.first_name}
            />
            <Input
              label="Last Name *"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Doe"
              error={errors.last_name}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="john.doe@example.com"
            error={errors.email}
          />

          <Input
            label="Phone *"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="08xx-xxxx-xxxx"
            error={errors.phone}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Instagram"
              value={formData.instagram || ''}
              onChange={(e) => handleInputChange('instagram', e.target.value)}
              placeholder="@username"
            />
            <Input
              label="TikTok"
              value={formData.tiktok || ''}
              onChange={(e) => handleInputChange('tiktok', e.target.value)}
              placeholder="@username"
            />
          </div>

          <Input
            label="Address"
            value={formData.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Street, city"
          />

          <Textarea
            label="Notes"
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Anything staff should know…"
          />
        </form>
    </SimpleModal>
  );
}
