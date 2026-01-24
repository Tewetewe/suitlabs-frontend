'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BarcodeLabel } from '@/components/ui/BarcodeLabel';
import { apiClient } from '@/lib/api';
import { Item, Rental, Booking } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { thermalPrinter } from '@/lib/thermal-printer';
import { getBprintProductLabelUrl } from '@/lib/bprint';

export default function ItemDetailPage() {
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id as string;
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagesExpanded, setImagesExpanded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [labelImageUrl, setLabelImageUrl] = useState<string | null>(null);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [printingLabel, setPrintingLabel] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string>('');

  const printLabelDirect = async () => {
    if (!item || !item.barcode) return;
    if (!thermalPrinter.isAvailable()) {
      alert('Use Print via Thermer in Safari. Chrome/Edge for Bluetooth.');
      return;
    }
    setPrintingLabel(true);
    setPrinterStatus('');
    try {
      if (!thermalPrinter.isConnected()) {
        setPrinterStatus('Connecting...');
        await thermalPrinter.connect();
      }
      setPrinterStatus('Printing...');
      await thermalPrinter.printProductLabel({ name: item.name, code: item.code, barcode: item.barcode, brand: item.brand, color: item.color, size: item.size });
      setPrinterStatus('Done');
      setTimeout(() => setPrinterStatus(''), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setPrinterStatus(`Error: ${msg}`);
      alert(`Print failed: ${msg}`);
    } finally {
      setPrintingLabel(false);
    }
  };

  const loadRentalsAndBookings = async () => {
    try {
      setLoadingRentals(true);
      const data = await apiClient.getItemRentals(id);
      setRentals(data.rentals);
      setBookings(data.bookings);
    } catch (e) {
      console.error('Error loading rentals and bookings:', e);
    } finally {
      setLoadingRentals(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Load item (category is preloaded by backend)
        const itemData = await apiClient.getItem(id);
        setItem(itemData);
        // Load rental and booking information
        await loadRentalsAndBookings();
      } catch (e) {
        console.error('Error loading item:', e);
        setError('Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  const generateBarcode = async () => {
    if (!item) return;
    
    try {
      setGeneratingBarcode(true);
      const updatedItem = await apiClient.generateItemBarcode(item.id);
      setItem(updatedItem);
      // Refresh the page to ensure UI is updated
      window.location.reload();
    } catch (err) {
      console.error('Error generating barcode:', err);
      setError('Failed to generate barcode');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const downloadLabel = () => {
    if (labelImageUrl) {
      const link = document.createElement('a');
      link.download = `${item?.code || 'item'}-barcode-label.png`;
      link.href = labelImageUrl;
      link.click();
    }
  };

  const toImageUrl = (url?: string): string | null => {
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    if (!base) return null;
    const normalizedBase = base.replace(/\/$/, '');
    const normalizedPath = url.replace(/^\//, '');
    return `${normalizedBase}/${normalizedPath}`;
  };

  const refreshItem = async () => {
    if (!id) return;
    try {
      const refreshedItem = await apiClient.getItem(id);
      setItem(refreshedItem);
    } catch (e) {
      console.error('Failed to refresh item:', e);
    }
  };

  const uploadThumbnail = async (file?: File | null) => {
    if (!file || !item) return;
    try {
      setUploadingThumb(true);
      const url = await apiClient.uploadItemImage(item.id, file);
      await apiClient.updateItem(item.id, { thumbnail_url: url });
      // Refresh item data to get the latest state
      await refreshItem();
    } catch (e) {
      console.error(e);
      setError('Failed to upload thumbnail');
    } finally {
      setUploadingThumb(false);
    }
  };

  const uploadGalleryImage = async (file?: File | null) => {
    if (!file || !item) return;
    try {
      setUploadingImage(true);
      const url = await apiClient.uploadItemImage(item.id, file);
      const nextImages = Array.isArray(item.images) ? [...item.images, url] : [url];
      await apiClient.updateItem(item.id, { images: nextImages });
      // Refresh item data to get the latest state
      await refreshItem();
    } catch (e) {
      console.error(e);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteGalleryImage = async (imageUrl: string) => {
    if (!item) return;
    try {
      setUploadingImage(true);
      await apiClient.deleteItemImage(item.id, imageUrl);
      // Refresh item data to get the latest state
      await refreshItem();
    } catch (e) {
      console.error(e);
      setError('Failed to delete image');
    } finally {
      setUploadingImage(false);
    }
  };

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setIsZoomed(false);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
    setIsZoomed(false);
  };

  const nextImage = () => {
    if (item?.images && selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % item.images.length);
    }
  };

  const prevImage = () => {
    if (item?.images && selectedImageIndex !== null) {
      setSelectedImageIndex(selectedImageIndex === 0 ? item.images.length - 1 : selectedImageIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedImageIndex === null) return;
    
    switch (e.key) {
      case 'Escape':
        closeImageModal();
        break;
      case 'ArrowLeft':
        prevImage();
        break;
      case 'ArrowRight':
        nextImage();
        break;
      case ' ':
        e.preventDefault();
        setIsZoomed(!isZoomed);
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Item Detail</h1>
          <Link href="/dashboard/items">
            <Button variant="ghost">Back to Items</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !item ? (
          <div className="text-gray-500">Item not found</div>
        ) : (
          <>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {toImageUrl(item.thumbnail_url) ? (
                      <Image src={toImageUrl(item.thumbnail_url)!} alt={item.name} width={800} height={800} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="mt-3">
                    <label className="text-sm text-gray-600">Update Thumbnail</label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadThumbnail(e.target.files?.[0] || null)}
                        disabled={uploadingThumb}
                        id="thumbnail-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className={`
                          inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200
                          ${uploadingThumb ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {uploadingThumb ? 'Uploading...' : 'Choose Thumbnail'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{item.name}</h2>
                    <p className="text-gray-500">Code: #{item.code}</p>
                    <div className="mt-4 space-y-3">
                      <div className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-gray-500">Barcode:</span>
                        <span className="font-mono">{item.barcode || 'No barcode assigned'}</span>
                        {!item.barcode && (
                          <Button
                            onClick={generateBarcode}
                            disabled={generatingBarcode}
                            className="ml-2 px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {generatingBarcode ? 'Generating...' : 'Generate Barcode'}
                          </Button>
                        )}
                      </div>
                      {item.barcode && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                          <BarcodeLabel
                            value={item.barcode}
                            itemName={item.name}
                            itemCode={item.code}
                            format="CODE128"
                            width={2}
                            height={60}
                            fontSize={10}
                            onImageGenerated={setLabelImageUrl}
                            className="max-w-full"
                          />
                          <div className="mt-3 text-center space-x-2">
                            <Button
                              onClick={generateBarcode}
                              disabled={generatingBarcode}
                              className="px-3 py-1 text-xs bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                            >
                              {generatingBarcode ? 'Generating...' : 'Generate New Barcode'}
                            </Button>
                            {labelImageUrl && (
                              <Button
                                onClick={downloadLabel}
                                className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                Download Label
                              </Button>
                            )}
                            <Button
                              onClick={printLabelDirect}
                              disabled={printingLabel}
                              className="px-3 py-1 text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {printingLabel ? 'Printing…' : 'Print'}
                            </Button>
                            <a
                              href={getBprintProductLabelUrl(item.id)}
                              className="inline-flex items-center px-3 py-1 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                              title="One tap: opens Thermer and prints. No need to press anything in Thermer. Enable Browser Print in the app."
                            >
                              Print via Thermer
                            </a>
                          </div>
                          {printerStatus ? <p className="text-[10px] text-gray-500 mt-1 text-center">{printerStatus}</p> : null}
                          <p className="text-[10px] text-gray-500 mt-1 text-center">
                            Print: Bluetooth (Chrome/Edge). Print via Thermer: one tap, no need to press anything in Thermer — enable Browser Print in the app.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="font-medium capitalize">{item.status}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Condition</div>
                      <div className="font-medium capitalize">{item.condition}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Brand / Color</div>
                      <div className="font-medium">{item.brand || '-'} {item.color ? `• ${item.color}` : ''}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Size</div>
                      <div className="font-medium">{item.size?.label || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Quantity</div>
                      <div className="font-medium">{item.quantity}</div>
                    </div>
                    {item.category && (
                      <div>
                        <div className="text-sm text-gray-500">Category</div>
                        <div className="font-medium text-blue-600">
                          📁 {item.category.name}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-500">Pricing</div>
                      <div className="flex flex-col text-gray-900">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-gray-500 w-16">3-day</span>
                          <span className="font-medium">{formatCurrency(item.standard_price)}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-gray-500 w-16">Day</span>
                          <span className="font-medium">{formatCurrency(item.one_day_price)}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-gray-500 w-16">4 hr</span>
                          <span className="font-medium">{formatCurrency(item.four_hour_price)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <div>
                      <div className="text-sm text-gray-500">Description</div>
                      <div>{item.description}</div>
                    </div>
                  )}

                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((t) => (
                          <span key={t} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Gallery */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setImagesExpanded(!imagesExpanded)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <span>Images</span>
                    <span className="text-gray-400">
                      {imagesExpanded ? '▼' : '▶'}
                    </span>
                    {Array.isArray(item.images) && item.images.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {item.images.length}
                      </span>
                    )}
                  </button>
                  {imagesExpanded && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadGalleryImage(e.target.files?.[0] || null)}
                        disabled={uploadingImage}
                        id="gallery-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="gallery-upload"
                        className={`
                          inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200
                          ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {uploadingImage ? 'Uploading...' : 'Add Image'}
                      </label>
                    </div>
                  )}
                </div>
                {imagesExpanded && (
                  <div className="mt-3">
                    {Array.isArray(item.images) && item.images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {item.images.map((img, index) => (
                          <div 
                            key={`${img}-${index}`} 
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden group relative cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
                            onClick={() => openImageModal(index)}
                          >
                            {toImageUrl(img) ? (
                              <Image 
                                src={toImageUrl(img)!} 
                                alt={`${item.name} ${index + 1}`} 
                                width={400} 
                                height={400} 
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110" 
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-gray-400">image</div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-2">
                              <span className="text-white text-sm font-medium">
                                {index + 1}
                              </span>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                              <div className="bg-white/90 backdrop-blur-sm rounded-full p-1">
                                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this image?')) {
                                    deleteGalleryImage(img);
                                  }
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors duration-200"
                                disabled={uploadingImage}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 py-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        No images uploaded yet
                      </div>
                    )}
                  </div>
                )}

                {/* Image Modal */}
                {selectedImageIndex !== null && item?.images && (
                  <div 
                    className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4"
                    onClick={closeImageModal}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                  >
                    <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
                      {/* Close Button */}
                      <button
                        onClick={closeImageModal}
                        className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full p-2 transition-colors duration-200"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Navigation Arrows */}
                      {item.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full p-3 transition-colors duration-200"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full p-3 transition-colors duration-200"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </>
                      )}

                      {/* Image */}
                      <div 
                        className={`relative max-w-full max-h-full transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'}`}
                        onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
                      >
                        {toImageUrl(item.images[selectedImageIndex]) && (
                          <Image
                            src={toImageUrl(item.images[selectedImageIndex])!}
                            alt={`${item.name} ${selectedImageIndex + 1}`}
                            width={1200}
                            height={800}
                            className="max-w-full max-h-full object-contain rounded-lg"
                            priority
                          />
                        )}
                      </div>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
                        {selectedImageIndex + 1} / {item.images.length}
                      </div>

                      {/* Zoom Hint */}
                      <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs">
                        Click to zoom • Space to toggle • Arrow keys to navigate
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rental and Booking Information */}
          {(rentals.length > 0 || bookings.length > 0) && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Rentals & Bookings</h2>
                
                {/* Active Rentals */}
                {rentals.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-700 mb-3">Active Rentals ({rentals.length})</h3>
                    <div className="space-y-3">
                      {rentals.map((rental) => (
                        <div key={rental.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-red-900">
                                Rental #{rental.id.slice(-8)}
                              </div>
                              <div className="text-sm text-red-700">
                                Customer: {rental.customer ? `${rental.customer.first_name} ${rental.customer.last_name}` : 'Unknown'}
                              </div>
                              <div className="text-sm text-red-700">
                                Dates: {formatDate(rental.rental_date)} - {formatDate(rental.return_date)}
                              </div>
                              <div className="text-sm text-red-700">
                                Status: <span className="font-medium">{rental.status}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-red-900">
                                {formatCurrency(rental.total_cost)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Bookings */}
                {bookings.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium text-gray-700 mb-3">Active Bookings ({bookings.length})</h3>
                    <div className="space-y-3">
                      {bookings.map((booking) => (
                        <div key={booking.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-yellow-900">
                                Booking #{booking.id.slice(-8)}
                              </div>
                              <div className="text-sm text-yellow-700">
                                Customer: {booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : 'Unknown'}
                              </div>
                              <div className="text-sm text-yellow-700">
                                Date: {formatDate(booking.booking_date)}
                                {booking.appointment_date && ` → ${formatDate(booking.appointment_date)}`}
                              </div>
                              <div className="text-sm text-yellow-700">
                                Status: <span className="font-medium">{booking.status}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-yellow-900">
                                {formatCurrency((booking.total_amount || 0) - (booking.discount_amount || 0))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {loadingRentals && (
                  <div className="text-center text-gray-500 py-4">
                    Loading rental and booking information...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
        )}
      </div>
    </DashboardLayout>
  );
}


