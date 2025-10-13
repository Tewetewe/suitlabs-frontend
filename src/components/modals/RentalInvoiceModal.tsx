'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { Rental } from '@/types';

interface RentalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export function RentalInvoiceModal({ isOpen, onClose, rental }: RentalInvoiceModalProps) {
  if (!isOpen || !rental) return null;

  const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);
  const refundableDeposit = Math.max((rental.security_deposit || 0) - (rental.damage_charges || 0), 0);

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Rental Invoice</h3>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={printInvoice}>Print</Button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <div><span className="font-medium">Rental ID:</span> {rental.id}</div>
          <div><span className="font-medium">Customer:</span> {rental.user_id.slice(-8)}</div>
          <div><span className="font-medium">Rental Date:</span> {new Date(rental.rental_date).toLocaleDateString()}</div>
          <div><span className="font-medium">Return Date:</span> {new Date(rental.return_date).toLocaleDateString()}</div>
          {rental.actual_return_date && (
            <div><span className="font-medium">Actual Return:</span> {new Date(rental.actual_return_date).toLocaleDateString()}</div>
          )}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Charges</h4>
          <div className="bg-gray-50 rounded-md p-4 text-sm">
            <div className="flex justify-between py-1">
              <span>Rental Cost</span>
              <span>{formatCurrency(rental.total_cost || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Late Fee</span>
              <span>{formatCurrency(rental.late_fee || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Damage Charges</span>
              <span>{formatCurrency(rental.damage_charges || 0)}</span>
            </div>
            <div className="border-t my-2" />
            <div className="flex justify-between py-1 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Deposit</h4>
          <div className="bg-gray-50 rounded-md p-4 text-sm">
            <div className="flex justify-between py-1">
              <span>Security Deposit</span>
              <span>{formatCurrency(rental.security_deposit || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Refundable</span>
              <span>{formatCurrency(refundableDeposit)}</span>
            </div>
          </div>
        </div>

        {rental.notes && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
            <div className="text-sm text-gray-700 whitespace-pre-line">{rental.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RentalInvoiceModal;


