'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
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

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex justify-between items-center">
            <div><span className="font-medium">Rental ID:</span> {rental.id}</div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                rental.status === 'active' ? 'bg-green-100 text-green-800' :
                rental.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                rental.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                rental.status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
              </span>
            </div>
          </div>
          <div><span className="font-medium">Customer:</span> {rental.customer ? `${rental.customer.first_name} ${rental.customer.last_name}` : rental.user_id.slice(-8)}</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="font-medium">Rental Date:</span> {formatDate(rental.rental_date)}
            </div>
            <div>
              <span className="font-medium">Return Date:</span> {formatDate(rental.return_date)}
            </div>
            {rental.actual_pickup_date && (
              <div>
                <span className="font-medium">Actual Pickup:</span> {formatDate(rental.actual_pickup_date)}
              </div>
            )}
            {rental.actual_return_date && (
              <div>
                <span className="font-medium">Actual Return:</span> {formatDate(rental.actual_return_date)}
              </div>
            )}
            <div>
              <span className="font-medium">Duration:</span> {Math.ceil((new Date(rental.return_date).getTime() - new Date(rental.rental_date).getTime()) / (1000 * 60 * 60 * 24))} days
            </div>
            {rental.status === 'active' && (
              <div>
                <span className="font-medium text-blue-700">Days Remaining:</span>
                <span className="ml-1 text-blue-600 font-semibold">
                  {Math.max(0, Math.ceil((new Date(rental.return_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                </span>
              </div>
            )}
            {rental.status === 'overdue' && (
              <div>
                <span className="font-medium text-red-700">Days Overdue:</span>
                <span className="ml-1 text-red-600 font-semibold">
                  {Math.max(0, Math.ceil((new Date().getTime() - new Date(rental.return_date).getTime()) / (1000 * 60 * 60 * 24)))} days
                </span>
              </div>
            )}
          </div>
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


