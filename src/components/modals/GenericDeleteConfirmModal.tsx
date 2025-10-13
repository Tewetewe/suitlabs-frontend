'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, X } from 'lucide-react';

interface GenericDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemDetails?: string;
  loading?: boolean;
}

export default function GenericDeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  itemName,
  itemDetails,
  loading = false 
}: GenericDeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Are you sure you want to delete this {title.toLowerCase()}?
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">INFO</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{itemName}</h4>
                    {itemDetails && (
                      <p className="text-sm text-gray-500">{itemDetails}</p>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This action cannot be undone. The {title.toLowerCase()} will be permanently removed from the system.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="danger"
            onClick={onConfirm}
            loading={loading}
          >
            Delete {title}
          </Button>
        </div>
      </div>
    </div>
  );
}
