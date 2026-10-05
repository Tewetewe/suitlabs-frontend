'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import AutoCompleteSelect, { AutoPageResult } from '@/components/ui/AutoCompleteSelect';
import SimpleModal from '@/components/modals/SimpleModal';
import { apiClient } from '@/lib/api';
import { Booking, CreateRentalRequest } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { FileText } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import axios from 'axios';

interface CreateRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAGE_SIZE = 20;

function bookingLabel(b: Booking): string {
  const name = [b.customer?.first_name, b.customer?.last_name].filter(Boolean).join(' ').trim()
    || b.full_name
    || '';
  const ref = b.invoice_number || `#${b.id.slice(-8)}`;
  const date = b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '';
  return [ref, name, date, b.status].filter(Boolean).join(' • ');
}

function toISODate(d: string): string {
  if (!d) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function CreateRentalModal({ isOpen, onClose, onSuccess }: CreateRentalModalProps) {
  const { user } = useAuth();
  const { warning } = useToast();
  const [form, setForm] = useState<CreateRentalRequest>({
    user_id: '',
    suit_id: '',
    rental_date: '',
    return_date: '',
    security_deposit: 0,
    notes: ''
  });
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchBookingPage = useCallback(async (query: string, page: number): Promise<AutoPageResult> => {
    try {
      const res = await apiClient.getBookings({
        for_rental: true,
        page,
        limit: PAGE_SIZE,
        search: query || undefined,
      });
      const list = res?.data?.data?.bookings || [];
      const pagination = res?.data?.pagination;
      return {
        options: list.map((b) => ({ value: b.id, label: bookingLabel(b) })),
        hasMore: Boolean(pagination?.has_next),
      };
    } catch {
      warning('Unable to load bookings', 'Backend may be offline. Please try again.');
      return { options: [], hasMore: false };
    }
  }, [warning]);

  useEffect(() => {
    const loadOne = async (id: string) => {
      try {
        if (!id) {
          setSelectedBooking(null);
          return;
        }
        const b = await apiClient.getBooking(id);
        setSelectedBooking(b);
        const start = toISODate(b.appointment_date || b.booking_date);
        if (start) {
          const startDate = new Date(`${start}T00:00:00`);
          const ret = new Date(startDate);
          ret.setDate(ret.getDate() + 1);
          const retISO = `${ret.getFullYear()}-${String(ret.getMonth() + 1).padStart(2, '0')}-${String(ret.getDate()).padStart(2, '0')}`;
          setForm((prev) => ({
            ...prev,
            rental_date: prev.rental_date || start,
            return_date: prev.return_date || retISO,
          }));
        }
      } catch (e) {
        console.error('Failed to load booking details:', e);
        setSelectedBooking(null);
      }
    };
    loadOne(selectedBookingId);
  }, [selectedBookingId]);

  const handleSubmit = async () => {
    if (!selectedBookingId) {
      setErrors({ submit: 'Booking is required' });
      return;
    }
    if (!form.rental_date || !form.return_date) {
      setErrors({ submit: 'Rental and Return dates are required' });
      return;
    }
    if (!user?.id) {
      setErrors({ submit: 'User not authenticated. Please login again.' });
      return;
    }

    try {
      setLoading(true);
      const rental = await apiClient.createRentalFromBooking(selectedBookingId);
      const toISOStartOfDay = (d: string) => {
        const iso = toISODate(d);
        if (!iso) return d;
        return new Date(`${iso}T00:00:00Z`).toISOString();
      };

      const isoStart = toISOStartOfDay(form.rental_date);
      const isoReturn = toISOStartOfDay(form.return_date);

      if (rental && (rental.rental_date.split('T')[0] !== isoStart.split('T')[0] || rental.return_date.split('T')[0] !== isoReturn.split('T')[0])) {
        await apiClient.changeRentalDates(rental.id, isoStart, isoReturn);
      }
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create rental from booking:', error);
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.response?.data?.message
        : null;
      setErrors({ submit: typeof message === 'string' ? message : 'Failed to create rental. Please verify the Booking and dates.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ user_id: '', suit_id: '', rental_date: '', return_date: '', security_deposit: 0, notes: '' });
    setErrors({});
    setSelectedBookingId('');
    setSelectedBooking(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <SimpleModal isOpen={isOpen} onClose={handleClose} title="Create New Rental" overflowVisible>
      <div className="space-y-6">
        <div>
          <label className="mb-2 flex items-center text-sm font-medium text-slate-700">
            <FileText className="mr-2 h-4 w-4" />
            Booking
          </label>
          <AutoCompleteSelect
            value={selectedBookingId}
            onChange={setSelectedBookingId}
            fetchPage={fetchBookingPage}
            minQueryLength={0}
            placeholder="Search name, invoice, or phone…"
            emptyMessage="No bookings match that search."
            error={errors.submit && !selectedBookingId ? errors.submit : undefined}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            New bookings already create a pending rental. Use this only for older bookings that do not have one yet.
          </p>
        </div>

        {selectedBooking && Array.isArray(selectedBooking.items) && selectedBooking.items.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">Items in Booking</div>
            <div className="space-y-1 text-sm text-slate-700">
              {selectedBooking.items.map((it, idx) => (
                <div key={it.id || idx}>
                  {it.item?.name || 'Item'} × {it.quantity}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Rental date"
            type="date"
            value={form.rental_date}
            onChange={(e) => setForm({ ...form, rental_date: e.target.value })}
            error={errors.rental_date}
          />
          <Input
            label="Return date"
            type="date"
            value={form.return_date}
            onChange={(e) => setForm({ ...form, return_date: e.target.value })}
            min={form.rental_date || undefined}
            error={errors.return_date}
          />
        </div>

        {errors.submit && selectedBookingId && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-black/5 pt-4">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Rental'}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}
