'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import SimpleModal from '@/components/modals/SimpleModal';
import { formatCurrency } from '@/lib/currency';
import { Rental } from '@/types';
import { 
  Calendar, 
  User, 
  Shirt, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  FileText
} from 'lucide-react';

interface RentalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  onEdit?: () => void;
  onActivate?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function RentalDetailsModal({ 
  isOpen, 
  onClose, 
  rental, 
  onEdit, 
  onActivate, 
  onComplete, 
  onCancel 
}: RentalDetailsModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!rental) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalAmount = rental.total_cost + rental.late_fee + rental.damage_charges;
  const refundableDeposit = rental.security_deposit - rental.damage_charges;

  return (
    <>
    <SimpleModal isOpen={isOpen} onClose={onClose} title={`Rental #${rental.id.slice(-8)}`}>
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(rental.status)}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(rental.status)}`}>
              {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
        </div>

        {/* Compact Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Items</div>
              <div className="font-medium">{rental.items?.length || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">User</div>
              <div className="font-medium">{rental.user_id.slice(-8)}</div>
            </div>
            <div>
              <div className="text-gray-500">Start</div>
              <div className="font-medium">{new Date(rental.rental_date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Return</div>
              <div className="font-medium">{new Date(rental.return_date).toLocaleDateString()}</div>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide details' : 'Show details'}
            </Button>
          </div>
        </div>

        {/* Details Grid */}
        {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid">
        {/* Customer Information */}
        <div className="no-break print-section">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Customer Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Name</div>
                <div className="text-sm text-gray-900">
                  {rental.user?.first_name} {rental.user?.last_name}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{rental.user?.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Phone</div>
                <div className="text-sm text-gray-900">{rental.user?.phone}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">User ID</div>
                <div className="text-sm text-gray-900 font-mono">{rental.user_id.slice(-8)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Information */}
        <div className="no-break print-section">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <Shirt className="h-5 w-5 mr-2" />
            Items Information ({rental.items?.length || 0})
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            {rental.items && rental.items.length > 0 ? (
              <div className="space-y-3">
                {rental.items.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Item Name</div>
                        <div className="text-sm text-gray-900">{item.item?.name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Brand</div>
                        <div className="text-sm text-gray-900">{item.item?.brand || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Color</div>
                        <div className="text-sm text-gray-900">{item.item?.color || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Size</div>
                        <div className="text-sm text-gray-900">{item.item?.size?.label || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Quantity</div>
                        <div className="text-sm text-gray-900">{item.quantity}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Unit Price</div>
                        <div className="text-sm text-gray-900">{formatCurrency(item.unit_price)}</div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-sm font-medium text-gray-500">Total Price</div>
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.total_price)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No items found</div>
            )}
          </div>
        </div>

        {/* Rental Dates */}
        <div className="no-break print-section">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Rental Dates
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Rental Date</div>
                <div className="text-sm text-gray-900">{formatDate(rental.rental_date)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Planned Return</div>
                <div className="text-sm text-gray-900">{formatDate(rental.return_date)}</div>
              </div>
              {rental.actual_return_date && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Actual Return</div>
                  <div className="text-sm text-gray-900">{formatDate(rental.actual_return_date)}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-500">Duration</div>
                <div className="text-sm text-gray-900">
                  {Math.ceil((new Date(rental.return_date).getTime() - new Date(rental.rental_date).getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="no-break print-section">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Financial Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Base Rental Cost</span>
              <span className="text-sm font-medium">{formatCurrency(rental.total_cost)}</span>
            </div>
            {rental.late_fee > 0 && (
              <div className="flex justify-between text-red-600">
                <span className="text-sm">Late Fee</span>
                <span className="text-sm font-medium">+{formatCurrency(rental.late_fee)}</span>
              </div>
            )}
            {rental.damage_charges > 0 && (
              <div className="flex justify-between text-red-600">
                <span className="text-sm">Damage Charges</span>
                <span className="text-sm font-medium">+{formatCurrency(rental.damage_charges)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">Total Amount</span>
                <span className="text-sm font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Security Deposit</span>
              <span className="text-sm font-medium">{formatCurrency(rental.security_deposit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Refundable Deposit</span>
              <span className={`text-sm font-medium ${refundableDeposit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(refundableDeposit)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {rental.notes && (
          <div className="md:col-span-2 no-break print-section">
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Notes
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">{rental.notes}</p>
            </div>
          </div>
        )}
        {/* Timestamps */}
        <div className="no-break print-section">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Timestamps</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Created</div>
                <div className="text-sm text-gray-900">{formatDateTime(rental.created_at)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Last Updated</div>
                <div className="text-sm text-gray-900">{formatDateTime(rental.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          
          {rental.status === 'pending' && onActivate && (
            <Button variant="secondary" onClick={onActivate}>
              Activate Rental
            </Button>
          )}
          
          {rental.status === 'active' && onComplete && (
            <Button onClick={onComplete}>
              Complete Rental
            </Button>
          )}
          
          {(rental.status === 'pending' || rental.status === 'active') && onCancel && (
            <Button variant="danger" onClick={onCancel}>
              Cancel Rental
            </Button>
          )}
          
          {onEdit && (
            <Button variant="ghost" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </SimpleModal>
    {/* Print styles to force landscape two-column layout and compact spacing */}
    <style jsx global>{`
      @media print {
        @page { size: A4 landscape; margin: 8mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
        .print-section { padding: 8px !important; }
        .no-break { break-inside: avoid; page-break-inside: avoid; }
        /* Slightly reduce typography for print */
        .text-lg { font-size: 14px !important; }
        .text-sm { font-size: 12px !important; }
        .rounded-lg { border-radius: 6px !important; }
      }
    `}</style>
  </>
  );
}
