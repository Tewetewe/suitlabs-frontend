'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Customer, CreateCustomerRequest } from '@/types';
import { X } from 'lucide-react';

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
    address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    },
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
        address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: ''
        },
        notes: ''
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
    if (!formData.email.trim()) newErrors.email = 'Email is required';
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
      if (formData.email !== customer.email) {
        updateData.email = formData.email;
      }
      if (formData.phone !== customer.phone) {
        updateData.phone = formData.phone;
      }
      
      // Always include address and notes if they have values
      if (formData.address && (formData.address.street || formData.address.city || formData.address.state || formData.address.postal_code || formData.address.country)) {
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

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Customer</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
                error={errors.first_name}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Doe"
                error={errors.last_name}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john.doe@example.com"
              error={errors.email}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              error={errors.phone}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <Input
              value={formData.address?.street || ''}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <Input
                value={formData.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <Input
                value={formData.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                placeholder="State"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <Input
                value={formData.address?.postal_code || ''}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                placeholder="12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <Input
                value={formData.address?.country || ''}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about the customer..."
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 sm:h-10 text-base sm:text-sm order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 sm:h-10 text-base sm:text-sm order-1 sm:order-2"
            >
              {loading ? 'Updating...' : 'Update Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
