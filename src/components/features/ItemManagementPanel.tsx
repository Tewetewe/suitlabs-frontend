'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import { apiClient } from '@/lib/api';
import { Item } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { 
  Search, 
  QrCode, 
  Upload, 
  Wrench, 
  CheckCircle, 
  AlertTriangle,
  Package,
  TrendingUp,
  BarChart3,
  Camera
} from 'lucide-react';

interface ItemManagementPanelProps {
  item: Item;
  onUpdate: (item: Item) => void;
}

export function ItemManagementPanel({ item, onUpdate }: ItemManagementPanelProps) {
  const [loading, setLoading] = useState(false);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [newQuantity, setNewQuantity] = useState(item.quantity.toString());
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleBarcodeSearch = async () => {
    if (!barcodeSearch.trim()) return;
    
    setLoading(true);
    try {
      const foundItem = await apiClient.searchByBarcode(barcodeSearch);
      onUpdate(foundItem);
    } catch (error) {
      console.error('Barcode search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    setBarcodeSearch(barcode);
    setIsScannerOpen(false);
    
    // Automatically search for the scanned barcode
    setLoading(true);
    try {
      const foundItem = await apiClient.searchByBarcode(barcode);
      onUpdate(foundItem);
    } catch (error) {
      console.error('Barcode search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityUpdate = async () => {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 0) return;
    
    setLoading(true);
    try {
      const updatedItem = await apiClient.updateItemQuantity(item.id, quantity);
      onUpdate(updatedItem);
    } catch (error) {
      console.error('Quantity update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToMaintenance = async () => {
    if (!maintenanceReason.trim()) return;
    
    setLoading(true);
    try {
      const updatedItem = await apiClient.sendToMaintenance(item.id, maintenanceReason);
      onUpdate(updatedItem);
      setMaintenanceReason('');
    } catch (error) {
      console.error('Send to maintenance failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnFromMaintenance = async () => {
    setLoading(true);
    try {
      const updatedItem = await apiClient.returnFromMaintenance(item.id);
      onUpdate(updatedItem);
    } catch (error) {
      console.error('Return from maintenance failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiscount = async () => {
    const discount = parseFloat(discountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) return;
    
    setLoading(true);
    try {
      const updatedItem = await apiClient.addItemDiscount(item.id, discount);
      onUpdate(updatedItem);
      setDiscountPercentage('');
    } catch (error) {
      console.error('Add discount failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setLoading(true);
    try {
      const updatedItem = await apiClient.removeItemDiscount(item.id);
      onUpdate(updatedItem);
    } catch (error) {
      console.error('Remove discount failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const imageUrl = await apiClient.uploadItemImage(item.id, file);
      // Update the item with the new image URL
      const updatedItem = { ...item, thumbnail_url: imageUrl };
      onUpdate(updatedItem);
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barcode Search */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            Barcode Search
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter barcode..."
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
              />
              <Button onClick={handleBarcodeSearch} loading={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsScannerOpen(true)}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan with Camera
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quantity Management */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Quantity Management
          </h3>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="New quantity"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="flex-1"
              min="0"
            />
            <Button onClick={handleQuantityUpdate} loading={loading}>
              Update
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Current quantity: {item.quantity}
          </p>
        </CardContent>
      </Card>

      {/* Maintenance Management */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            Maintenance Management
          </h3>
          
          {item.status === 'maintenance' ? (
            <div className="space-y-4">
              <div className="flex items-center text-yellow-600">
                <AlertTriangle className="h-4 w-4 mr-2" />
                This item is currently in maintenance
              </div>
              <Button onClick={handleReturnFromMaintenance} loading={loading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Return from Maintenance
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Maintenance reason..."
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
              />
              <Button 
                onClick={handleSendToMaintenance} 
                loading={loading}
                disabled={!maintenanceReason.trim()}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Send to Maintenance
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Management */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Discount Management
          </h3>
          
          {false ? (
            <div className="space-y-4">
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Current discount: 0%
              </div>
              <Button onClick={handleRemoveDiscount} loading={loading} variant="ghost">
                Remove Discount
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                type="number"
                placeholder="Discount percentage (0-100)"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                min="0"
                max="100"
              />
              <Button 
                onClick={handleAddDiscount} 
                loading={loading}
                disabled={!discountPercentage.trim()}
              >
                Add Discount
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Upload */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Image Upload
          </h3>
          
          <div className="space-y-4">
            {item.thumbnail_url && (
              <div className="relative">
                <Image 
                  src={item.thumbnail_url} 
                  alt={item.name}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
            
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Item Status */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Item Status
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`font-semibold ${
                item.status === 'available' ? 'text-green-600' :
                item.status === 'rented' ? 'text-blue-600' :
                item.status === 'maintenance' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Condition</p>
              <p className="font-semibold">
                {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price/Day</p>
              <p className="font-semibold">{formatCurrency(item.one_day_price)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price/4hr</p>
              <p className="font-semibold">{formatCurrency(item.four_hour_price)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onScan={handleBarcodeScan}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}