'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { Discount } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { CheckCircle, XCircle, Tag } from 'lucide-react';

interface DiscountCodeValidatorProps {
  bookingId?: string;
  bookingAmount?: number;
  onDiscountApplied?: (discount: Discount) => void;
  onDiscountRemoved?: () => void;
  appliedDiscount?: Discount | null;
}

export function DiscountCodeValidator({ 
  bookingId, 
  bookingAmount = 0, 
  onDiscountApplied, 
  onDiscountRemoved,
  appliedDiscount 
}: DiscountCodeValidatorProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatedDiscount, setValidatedDiscount] = useState<Discount | null>(null);
  const [error, setError] = useState('');

  const handleValidateCode = async () => {
    if (!code.trim()) {
      setError('Please enter a discount code');
      return;
    }

    setLoading(true);
    setError('');
    setValidatedDiscount(null);

    try {
      if (bookingId) {
        // Validate with booking context
        const discount = await apiClient.validateDiscountCode(code, bookingId);
        setValidatedDiscount(discount);
      } else {
        // Just get discount by code
        const discount = await apiClient.getDiscountByCode(code);
        setValidatedDiscount(discount);
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Invalid discount code');
      setValidatedDiscount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!validatedDiscount || !bookingId) return;

    setLoading(true);
    try {
      await apiClient.applyDiscountToBooking(validatedDiscount.id, bookingId);
      onDiscountApplied?.(validatedDiscount);
      setCode('');
      setValidatedDiscount(null);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to apply discount');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = async () => {
    if (!appliedDiscount || !bookingId) return;

    setLoading(true);
    try {
      await apiClient.removeDiscountFromBooking(bookingId, appliedDiscount.id);
      onDiscountRemoved?.();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to remove discount');
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscountAmount = (discount: Discount) => {
    if (discount.discount_type === 'percentage') {
      return (bookingAmount * discount.discount_value) / 100;
    }
    return Math.min(discount.discount_value, bookingAmount);
  };

  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          Discount Code
        </h3>

        {appliedDiscount ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="font-medium text-green-800">{appliedDiscount.name}</p>
                  <p className="text-sm text-green-600">
                    {appliedDiscount.discount_type === 'percentage' 
                      ? `${appliedDiscount.discount_value}% off`
                      : `${formatCurrency(appliedDiscount.discount_value)} off`
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveDiscount}
                loading={loading}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-sm text-slate-600">
              <p>Savings: {formatCurrency(calculateDiscountAmount(appliedDiscount))}</p>
              {appliedDiscount.description && (
                <p className="mt-1">{appliedDiscount.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter discount code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleValidateCode()}
                className="flex-1"
              />
              <Button
                onClick={handleValidateCode}
                loading={loading}
                disabled={!code.trim()}
              >
                Validate
              </Button>
            </div>

            {error && (
              <div className="flex items-center rounded-xl border border-red-200 bg-red-50 p-3">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {validatedDiscount && (
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium text-indigo-800">{validatedDiscount.name}</h4>
                  <div className="flex items-center text-indigo-600">
                      <span className="font-semibold">
                        {validatedDiscount.discount_type === 'percentage' 
                          ? `${validatedDiscount.discount_value}%`
                          : formatCurrency(validatedDiscount.discount_value)
                        }
                      </span>
                    </div>
                  </div>
                  
                  {validatedDiscount.description && (
                    <p className="mb-2 text-sm text-indigo-700">{validatedDiscount.description}</p>
                  )}
                  
                  <div className="text-sm text-indigo-600">
                    <p>You&#39;ll save: {formatCurrency(calculateDiscountAmount(validatedDiscount))}</p>
                    {validatedDiscount.min_amount && (
                      <p>Minimum order: {formatCurrency(validatedDiscount.min_amount)}</p>
                    )}
                    {validatedDiscount.max_discount_amount && (
                      <p>Maximum discount: {formatCurrency(validatedDiscount.max_discount_amount)}</p>
                    )}
                  </div>
                </div>

                {bookingId && (
                  <Button
                    onClick={handleApplyDiscount}
                    loading={loading}
                    className="w-full"
                  >
                    Apply Discount
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
