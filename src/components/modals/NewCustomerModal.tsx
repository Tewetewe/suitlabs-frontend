'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import SimpleModal from '@/components/modals/SimpleModal';
import { apiClient } from '@/lib/api';
import { CUSTOMER_LANGUAGE_OPTIONS } from '@/lib/select-options';
import { CreateCustomerRequest, Customer } from '@/types';
import { useToast } from '@/contexts/ToastContext';

const emptyForm: CreateCustomerRequest = {
  first_name: '',
  last_name: '',
  phone: '',
  instagram: '',
  tiktok: '',
  language: 'id',
};

export default function NewCustomerModal({
  isOpen,
  onClose,
  onCreated,
  nested = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
  nested?: boolean;
}) {
  const { success, error } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setForm(emptyForm);
    onClose();
  };

  const save = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      error('Customer incomplete', 'First name, last name, and phone are required.');
      return;
    }
    try {
      setSaving(true);
      const created = await apiClient.findOrCreateCustomer({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        instagram: form.instagram?.trim() || undefined,
        tiktok: form.tiktok?.trim() || undefined,
        language: form.language || 'id',
      });
      success('Customer ready', `${created.first_name} ${created.last_name}`);
      setForm(emptyForm);
      onCreated(created);
      onClose();
    } catch (e) {
      error('Could not save customer', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      title="New customer"
      onClose={close}
      size="sm"
      nested={nested}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="First name"
          required
          value={form.first_name}
          onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
        />
        <Input
          label="Last name"
          required
          value={form.last_name}
          onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
        />
        <Input
          label="Phone"
          type="tel"
          inputMode="tel"
          required
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
        />
        <Select
          searchable={false}
          label="Language"
          value={form.language || 'id'}
          onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value as 'id' | 'en' }))}
          options={CUSTOMER_LANGUAGE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        />
        <Input
          label="Instagram (optional)"
          value={form.instagram || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))}
          placeholder="@username"
        />
        <Input
          label="TikTok (optional)"
          value={form.tiktok || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, tiktok: e.target.value }))}
          placeholder="@username"
        />
      </div>
    </SimpleModal>
  );
}
