'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Item } from '@/types';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: Item | null;
  loading?: boolean;
}

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  item, 
  loading = false 
}: DeleteConfirmModalProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Delete Item</h2>
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
                Are you sure you want to delete this item?
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">IMG</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">#{item.code}</p>
                    <div className="flex space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'available' ? 'bg-green-100 text-green-800' :
                        item.status === 'rented' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                        item.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                        item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.condition}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This action cannot be undone. The item will be permanently removed from your inventory.
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
            Delete Item
          </Button>
        </div>
      </div>
    </div>
  );
}
