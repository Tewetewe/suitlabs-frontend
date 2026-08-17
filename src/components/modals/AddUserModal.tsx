'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiClient } from '@/lib/api';
import { User, Address, Branch } from '@/types';
import SimpleModal from '@/components/modals/SimpleModal';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (user: User) => void;
  branches?: Branch[];
}

interface CreateUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'staff' | 'customer';
  address: Address;
  branch_ids: string[];
}

export function AddUserModal({ isOpen, onClose, onUserAdded, branches = [] }: AddUserModalProps) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
    branch_ids: [],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
    
    // Clear error when user starts typing
    if (errors[`address.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`address.${field}`]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Address validation
    if (!formData.address.street?.trim()) {
      newErrors['address.street'] = 'Street address is required';
    }
    if (!formData.address.city?.trim()) {
      newErrors['address.city'] = 'City is required';
    }
    if (!formData.address.state?.trim()) {
      newErrors['address.state'] = 'State is required';
    }
    if (!formData.address.postal_code?.trim()) {
      newErrors['address.postal_code'] = 'Postal code is required';
    }
    if (!formData.address.country?.trim()) {
      newErrors['address.country'] = 'Country is required';
    }

    if (formData.role === 'staff' && formData.branch_ids.length !== 1) {
      newErrors.branch_ids = 'Staff must be assigned to one shop';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const newUser = await apiClient.createUser(formData);
      onUserAdded(newUser);
      onClose();
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        role: 'customer',
        address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
        },
        branch_ids: [],
      });
      setErrors({});
    } catch (error: unknown) {
      console.error('Failed to create user:', error);
      
      // Handle API errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: { field?: string; message?: string } } } };
        if (axiosError.response?.data?.error?.field) {
          setErrors({
            [axiosError.response.data.error.field]: axiosError.response.data.error.message || 'Invalid input',
          });
        } else {
          setErrors({
            general: axiosError.response?.data?.error?.message || 'Failed to create user. Please try again.',
          });
        }
      } else {
        setErrors({
          general: 'Failed to create user. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setErrors({});
    }
  };

  if (!isOpen) return null;

  return (
    <SimpleModal
      isOpen={isOpen}
      title="Add user"
      onClose={handleClose}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="add-user-form" loading={loading}>Create user</Button>
        </>
      }
    >
      <form id="add-user-form" onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errors.general}</div>
        )}

        <FieldGroup title="Personal">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="First name"
              error={errors.first_name}
            />
            <Input
              label="Last name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Last name"
              error={errors.last_name}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@example.com"
              error={errors.email}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="08xx-xxxx-xxxx"
              error={errors.phone}
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Account">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Min 8 characters"
              error={errors.password}
            />
            <Select
              searchable={false}
              label="Role"
              value={formData.role}
              onChange={(e) => {
                const role = e.target.value;
                handleInputChange('role', role);
                if (role === 'staff' && formData.branch_ids.length > 1) {
                  setFormData((prev) => ({ ...prev, role: 'staff', branch_ids: prev.branch_ids.slice(0, 1) }));
                }
              }}
              options={[
                { value: 'customer', label: 'Customer' },
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Administrator' },
              ]}
            />
          </div>
        </FieldGroup>

        {(formData.role === 'admin' || formData.role === 'staff') && branches.length > 0 && (
          <FieldGroup title={formData.role === 'staff' ? 'Shop' : 'Shops'}>
            {formData.role === 'staff' && errors.branch_ids && (
              <p className="text-sm text-red-600">{errors.branch_ids}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => {
                const checked = formData.branch_ids.includes(branch.id);
                return (
                  <label key={branch.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-slate-700 glass-panel">
                    <input
                      type={formData.role === 'staff' ? 'radio' : 'checkbox'}
                      name={formData.role === 'staff' ? 'staff-shop' : undefined}
                      checked={checked}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          branch_ids: formData.role === 'staff'
                            ? [branch.id]
                            : e.target.checked
                              ? [...prev.branch_ids, branch.id]
                              : prev.branch_ids.filter((id) => id !== branch.id),
                        }));
                      }}
                    />
                    {branch.name}
                  </label>
                );
              })}
            </div>
          </FieldGroup>
        )}

        <FieldGroup title="Address">
          <Input
            label="Street"
            value={formData.address.street || ''}
            onChange={(e) => handleAddressChange('street', e.target.value)}
            placeholder="Street address"
            error={errors['address.street']}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="City"
              value={formData.address.city || ''}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              placeholder="City"
              error={errors['address.city']}
            />
            <Input
              label="State"
              value={formData.address.state || ''}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              placeholder="State"
              error={errors['address.state']}
            />
            <Input
              label="Postal code"
              value={formData.address.postal_code || ''}
              onChange={(e) => handleAddressChange('postal_code', e.target.value)}
              placeholder="Postal code"
              error={errors['address.postal_code']}
            />
            <Input
              label="Country"
              value={formData.address.country || ''}
              onChange={(e) => handleAddressChange('country', e.target.value)}
              placeholder="Country"
              error={errors['address.country']}
            />
          </div>
        </FieldGroup>
      </form>
    </SimpleModal>
  );
}
