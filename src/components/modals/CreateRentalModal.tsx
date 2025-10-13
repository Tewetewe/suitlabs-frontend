'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import SimpleModal from '@/components/modals/SimpleModal';
import { apiClient } from '@/lib/api';
import { Booking, CreateRentalRequest } from '@/types';
import { Calendar, AlertCircle, FileText } from 'lucide-react';

interface CreateRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateRentalModal({ isOpen, onClose, onSuccess }: CreateRentalModalProps) {
  const [form, setForm] = useState<CreateRentalRequest>({
    user_id: '',
    suit_id: '',
    rental_date: '',
    return_date: '',
    security_deposit: 0,
    notes: ''
  });
  // Simplified: create rental from booking
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  

  useEffect(() => {
    if (isOpen) {
      // Prefetch a small list of recent confirmed bookings for selection
      loadBookings('');
    }
  }, [isOpen]);

  useEffect(() => {
    const loadOne = async (id: string) => {
      try {
        if (!id) { setSelectedBooking(null); return; }
        const b = await apiClient.getBooking(id);
        setSelectedBooking(b);
      } catch (e) {
        console.error('Failed to load booking details:', e);
        setSelectedBooking(null);
      }
    };
    loadOne(selectedBookingId);
  }, [selectedBookingId]);

  // no derived pricing in simplified flow

  const loadBookings = async (search?: string) => {
    try {
      const res = await apiClient.getBookings({ status: 'confirmed', page: 1, limit: 10, search: search || '' });
      const list = res?.data?.data?.bookings || [];
      setBookings(list);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setBookings([]);
    }
  };

  // Debounced search for bookings
  useEffect(() => {
    const t = setTimeout(() => {
      // Only search when at least 2 chars to keep list small
      if (bookingSearch.trim().length >= 2) {
        loadBookings(bookingSearch.trim());
      } else if (bookingSearch.trim().length === 0) {
        loadBookings('');
      }
    }, 300);
    return () => clearTimeout(t);
  }, [bookingSearch]);

  // no separate availability step in simplified flow

  // validation handled inline in submit

  const handleSubmit = async () => {
    if (!selectedBookingId) {
      setErrors({ submit: 'Booking is required' });
        return;
      }
    if (!form.rental_date || !form.return_date) {
      setErrors({ submit: 'Rental and Return dates are required' });
      return;
    }
    try {
      setLoading(true);
      const rental = await apiClient.createRentalFromBooking(selectedBookingId);
      // Normalize input dates to ISO (YYYY-MM-DD)
      const toISOStartOfDay = (d: string) => {
        if (!d) return '';
        // if format looks like DD/MM/YYYY, convert
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
          const [dd, mm, yyyy] = d.split('/');
          const isoDate = `${yyyy}-${mm}-${dd}`;
          return new Date(`${isoDate}T00:00:00Z`).toISOString();
        }
        // if already YYYY-MM-DD, keep
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00Z`).toISOString();
        // fallback: use Date parsing
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString();
        return d;
      };

      const isoStart = toISOStartOfDay(form.rental_date);
      const isoReturn = toISOStartOfDay(form.return_date);

      // If dates provided differ from auto dates, update
      if (rental && (rental.rental_date.split('T')[0] !== isoStart || rental.return_date.split('T')[0] !== isoReturn)) {
        await apiClient.changeRentalDates(rental.id, isoStart, isoReturn);
      }
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create rental from booking:', error);
      setErrors({ submit: 'Failed to create rental. Please verify the Booking and dates.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ user_id: '', suit_id: '', rental_date: '', return_date: '', security_deposit: 0, notes: '' });
    setErrors({});
    
    setSelectedBookingId('');
    setBookingSearch('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <SimpleModal isOpen={isOpen} onClose={handleClose} title="Create New Rental">
      <div className="space-y-6">
        {/* Booking Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Booking
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
          <Select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
            options={[
                  { value: '', label: 'Select booking' },
                  ...bookings.map(b => ({ value: b.id, label: `#${b.id.slice(-8)} • ${b.customer?.first_name || ''} ${b.customer?.last_name || ''} • ${new Date(b.booking_date).toLocaleDateString()}` }))
                ]}
              />
        </div>
        <div>
              <Input
                placeholder="Search bookings (type 2+ chars)..."
                value={bookingSearch}
                onChange={(e) => { setBookingSearch(e.target.value); }}
              />
            </div>
          </div>
        </div>

        {selectedBooking && Array.isArray(selectedBooking.items) && selectedBooking.items.length > 0 && (
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-sm font-medium text-gray-900 mb-2">Items in Booking</div>
            <div className="space-y-1 text-sm text-gray-700">
              {selectedBooking.items.map((it, idx) => (
                <div key={idx}>
                  {it.item?.name || 'Item'} × {it.quantity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rental Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Rental Date
            </label>
            <Input
              type="date"
              value={form.rental_date}
              onChange={(e) => setForm({ ...form, rental_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.rental_date && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.rental_date}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Return Date
            </label>
            <Input
              type="date"
              value={form.return_date}
              onChange={(e) => setForm({ ...form, return_date: e.target.value })}
              min={form.rental_date || new Date().toISOString().split('T')[0]}
            />
            {errors.return_date && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.return_date}
              </p>
            )}
          </div>
        </div>

        {/* Note: Other fields removed to simplify flow */}

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {errors.submit}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
