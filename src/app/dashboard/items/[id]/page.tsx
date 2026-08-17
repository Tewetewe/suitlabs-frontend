'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BarcodeLabel } from '@/components/ui/BarcodeLabel';
import { SafeImage } from '@/components/ui/SafeImage';
import { PageShell } from '@/components/ui/PageShell';
import { Badge } from '@/components/ui/DataDisplay';
import { DetailRow, DetailRows, MoneyRow } from '@/components/modals/detail-layout';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Item, Rental, Booking, CreateItemRequest } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { printProductLabel } from '@/lib/print-router';
import { BranchBadge } from '@/components/branch/BranchBadge';
import { TransferItemModal } from '@/components/modals/TransferItemModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import EditItemModal from '@/components/modals/EditItemModal';
import { useToast } from '@/contexts/ToastContext';
import { ArrowRightLeft, ChevronLeft, ChevronRight, Edit, X, ZoomIn } from 'lucide-react';
import clsx from 'clsx';

function itemStatusVariant(status: string): 'success' | 'primary' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'available':
      return 'success';
    case 'rented':
      return 'primary';
    case 'maintenance':
      return 'warning';
    case 'retired':
    case 'damaged':
    case 'lost':
      return 'danger';
    default:
      return 'default';
  }
}

function conditionVariant(condition: string): 'success' | 'warning' | 'danger' | 'default' {
  switch (condition) {
    case 'excellent':
      return 'success';
    case 'fair':
      return 'warning';
    case 'poor':
      return 'danger';
    default:
      return 'default';
  }
}

function typeLabel(type: string) {
  if (type === 'shirts') return 'Shirt';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function ItemDetailPage() {
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id as string;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { success, error: toastError } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [labelImageUrl, setLabelImageUrl] = useState<string | null>(null);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [pairedTrousers, setPairedTrousers] = useState<Item | null>(null);
  const viewerImages = Array.from(
    new Set(
      [item?.thumbnail_url, ...(item?.images || [])].filter(
        (url): url is string => Boolean(url && url.trim()),
      ),
    ),
  );

  const loadRentalsAndBookings = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const itemData = await apiClient.getItem(id);
        setItem(itemData);
        if (itemData.trousers_code && itemData.type !== 'trousers') {
          try {
            setPairedTrousers(await apiClient.getItemByCode(itemData.trousers_code));
          } catch {
            setPairedTrousers(null);
          }
        } else {
          setPairedTrousers(null);
        }
        await loadRentalsAndBookings();
      } catch (e) {
        console.error('Error loading item:', e);
        setError('Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, loadRentalsAndBookings]);

  const generateBarcode = async () => {
    if (!item) return;
    
    try {
      setGeneratingBarcode(true);
      const updatedItem = await apiClient.generateItemBarcode(item.id);
      setItem(updatedItem);
      await loadRentalsAndBookings();
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

  const refreshItem = useCallback(async () => {
    if (!id) return;
    try {
      const refreshedItem = await apiClient.getItem(id);
      setItem(refreshedItem);
      if (refreshedItem.trousers_code && refreshedItem.type !== 'trousers') {
        try {
          setPairedTrousers(await apiClient.getItemByCode(refreshedItem.trousers_code));
        } catch {
          setPairedTrousers(null);
        }
      } else {
        setPairedTrousers(null);
      }
    } catch (e) {
      console.error('Failed to refresh item:', e);
    }
  }, [id]);

  const handleUpdateItem = async (itemId: string, itemData: Partial<CreateItemRequest>) => {
    try {
      await apiClient.updateItem(itemId, itemData);
      success('Item Updated Successfully!', `${item?.name || 'Item'} has been updated.`);
      await refreshItem();
    } catch (e) {
      console.error('Failed to update item:', e);
      toastError('Failed to Update Item', 'Please try again.');
      throw e;
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

  const confirmDeleteGalleryImage = async () => {
    if (!deletingImage) return;
    await deleteGalleryImage(deletingImage);
    setDeletingImage(null);
  };

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setIsZoomed(false);
  };

  const openImageModalFor = (url: string) => {
    const index = viewerImages.indexOf(url);
    openImageModal(index >= 0 ? index : 0);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
    setIsZoomed(false);
  };

  const nextImage = () => {
    if (viewerImages.length === 0 || selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex + 1) % viewerImages.length);
    setIsZoomed(false);
  };

  const prevImage = () => {
    if (viewerImages.length === 0 || selectedImageIndex === null) return;
    setSelectedImageIndex(selectedImageIndex === 0 ? viewerImages.length - 1 : selectedImageIndex - 1);
    setIsZoomed(false);
  };

  useEffect(() => {
    if (selectedImageIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeImageModal();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === ' ') {
        e.preventDefault();
        setIsZoomed((zoomed) => !zoomed);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImageIndex, viewerImages.length]);

  return (
    <>
      <PageShell
        title={item?.name || 'Item'}
        subtitle={item ? `#${item.code}` : undefined}
        toolbar={
          <Link href="/dashboard/items">
            <Button variant="ghost">Back</Button>
          </Link>
        }
        action={
          item ? (
            <>
              <Button variant="secondary" onClick={() => setTransferOpen(true)} disabled={item.status !== 'available'}>
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </>
          ) : undefined
        }
      >
        {loading ? (
          <div className="text-slate-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !item ? (
          <div className="text-slate-500">Item not found</div>
        ) : (
          <>
          <Card>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
                <div>
                  <button
                    type="button"
                    disabled={!item.thumbnail_url}
                    onClick={() => item.thumbnail_url && openImageModalFor(item.thumbnail_url)}
                    className={clsx(
                      'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100',
                      item.thumbnail_url ? 'cursor-zoom-in group' : 'cursor-default',
                    )}
                  >
                    <SafeImage
                      src={item.thumbnail_url}
                      alt={item.name}
                      width={800}
                      height={800}
                      className="h-full w-full object-cover"
                      fallback={<div className="h-full w-full grid place-items-center text-slate-400">No image</div>}
                    />
                    {item.thumbnail_url && (
                      <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800">
                          <ZoomIn className="h-3.5 w-3.5" />
                          Click to zoom
                        </span>
                      </span>
                    )}
                  </button>
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
                      className={clsx(
                        'inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-indigo-700',
                        uploadingThumb && 'pointer-events-none opacity-50',
                      )}
                    >
                      {uploadingThumb ? 'Uploading…' : item.thumbnail_url ? 'Change photo' : 'Add photo'}
                    </label>
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={itemStatusVariant(item.status)} dot className="capitalize">{item.status}</Badge>
                    <Badge variant={conditionVariant(item.condition)} className="capitalize">{item.condition}</Badge>
                    <BranchBadge branch={item.branch} always />
                  </div>

                  <DetailRows>
                    <DetailRow label="Type" value={typeLabel(item.type)} />
                    <DetailRow label="Brand" value={item.brand} />
                    <DetailRow label="Color" value={item.color} />
                    <DetailRow label="Size" value={item.size?.label} />
                    <DetailRow label="Detail size" value={item.detail_size} />
                    <DetailRow label="Category" value={item.category?.name} />
                    <DetailRow label="Owner" value={item.owner} />
                    <DetailRow label="Quantity" value={item.quantity} />
                  </DetailRows>

                  {item.trousers_code && item.type !== 'trousers' && (
                    <div>
                      <div className="text-sm text-slate-500">Default trousers</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {pairedTrousers ? (
                          <Link href={`/dashboard/items/${pairedTrousers.id}`} className="text-sm font-medium text-indigo-700 hover:underline">
                            {pairedTrousers.name} ({pairedTrousers.code})
                          </Link>
                        ) : (
                          <span className="font-mono text-sm font-medium text-slate-900">{item.trousers_code}</span>
                        )}
                        <Link href="/dashboard/items?type=trousers" className="text-sm text-slate-500 hover:text-slate-800">
                          Find other trousers
                        </Link>
                      </div>
                    </div>
                  )}

                  {item.description && (
                    <p className="text-sm leading-relaxed text-slate-700">{item.description}</p>
                  )}

                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((t) => (
                        <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent>
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Pricing</h2>
                <div className="space-y-2">
                  <MoneyRow label="3-day" value={formatCurrency(item.standard_price)} />
                  <MoneyRow label="1 day" value={formatCurrency(item.one_day_price)} />
                  <MoneyRow label="4 hours" value={formatCurrency(item.four_hour_price)} />
                  {isAdmin && typeof item.purchase_price === 'number' && (
                    <MoneyRow label="Buying price" value={formatCurrency(item.purchase_price)} />
                  )}
                  <MoneyRow label="Selling price" value={formatCurrency(item.selling_price || 0)} />
                  <MoneyRow label="Sellable" value={item.is_sellable ? 'Yes' : 'No'} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Label</h2>
                {item.barcode ? (
                  <div>
                    <p className="mb-3 font-mono text-sm text-slate-600">{item.barcode}</p>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      {labelImageUrl && (
                        <Button size="sm" variant="secondary" onClick={downloadLabel}>
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await printProductLabel(
                              {
                                id: item.id,
                                name: item.name,
                                code: item.code,
                                barcode: item.barcode || item.code,
                                brand: item.brand,
                                color: item.color,
                                size: item.size,
                              },
                              labelImageUrl || undefined,
                            );
                          } catch (err) {
                            toastError('Could not print label', err instanceof Error ? err.message : 'Please try again.');
                          }
                        }}
                      >
                        Print
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-slate-500">No barcode yet.</p>
                    <Button className="mt-3" size="sm" onClick={generateBarcode} loading={generatingBarcode}>
                      Generate barcode
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Photos</h2>
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
                    className={clsx(
                      'inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-indigo-700',
                      uploadingImage && 'pointer-events-none opacity-50',
                    )}
                  >
                    {uploadingImage ? 'Uploading…' : 'Add photo'}
                  </label>
                </div>
              </div>
              {Array.isArray(item.images) && item.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {item.images.map((img, index) => (
                    <div
                      key={`${img}-${index}`}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100"
                      onClick={() => openImageModalFor(img)}
                    >
                      <SafeImage
                        src={img}
                        alt={`${item.name} ${index + 1}`}
                        width={400}
                        height={400}
                        className="h-full w-full object-cover"
                        fallback={<div className="grid h-full w-full place-items-center text-slate-400">image</div>}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingImage(img);
                        }}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-700 opacity-0 transition-opacity group-hover:opacity-100"
                        disabled={uploadingImage}
                        aria-label="Delete photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">No extra photos yet.</p>
              )}
            </CardContent>
          </Card>

                {selectedImageIndex !== null && viewerImages[selectedImageIndex] && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={closeImageModal}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Item image"
                  >
                    <div className="relative flex h-full w-full max-w-6xl items-center justify-center">
                      <button
                        type="button"
                        onClick={closeImageModal}
                        className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
                        aria-label="Close"
                      >
                        <X className="h-6 w-6" />
                      </button>

                      {viewerImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm hover:bg-white/25"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm hover:bg-white/25"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                        </>
                      )}

                      <div
                        className={clsx(
                          'max-h-full max-w-full overflow-auto rounded-lg',
                          isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in',
                        )}
                        onClick={(e) => { e.stopPropagation(); setIsZoomed((zoomed) => !zoomed); }}
                      >
                        <SafeImage
                          src={viewerImages[selectedImageIndex]}
                          alt={`${item.name} ${selectedImageIndex + 1}`}
                          width={1600}
                          height={1600}
                          className={clsx(
                            'rounded-lg object-contain transition-transform duration-200',
                            isZoomed ? 'max-w-none w-[min(200vw,1600px)]' : 'max-h-[85vh] max-w-full',
                          )}
                        />
                      </div>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm">
                        {selectedImageIndex + 1} / {viewerImages.length}
                      </div>
                      <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
                        Click image to zoom · Esc to close
                      </div>
                    </div>
                  </div>
                )}

          {(rentals.length > 0 || bookings.length > 0) && (
            <Card>
              <CardContent>
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Current bookings and rentals</h2>
                <ul className="divide-y divide-black/5">
                  {rentals.map((rental) => {
                    const name = rental.customer
                      ? `${rental.customer.first_name} ${rental.customer.last_name}`.trim()
                      : 'Customer';
                    return (
                      <li key={rental.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{name}</span>
                            <Badge variant={rental.status === 'overdue' ? 'danger' : 'primary'} dot className="capitalize">{rental.status}</Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {formatDateShort(rental.rental_date)} → {formatDateShort(rental.return_date)}
                          </p>
                        </div>
                        <div className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                          {formatCurrency(rental.total_cost)}
                        </div>
                      </li>
                    );
                  })}
                  {bookings.map((booking) => {
                    const name = booking.customer
                      ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
                      : 'Customer';
                    return (
                      <li key={booking.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{name}</span>
                            <Badge variant="warning" className="capitalize">{booking.status.replace('_', ' ')}</Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {formatDateShort(booking.booking_date)}
                            {booking.appointment_date ? ` → ${formatDateShort(booking.appointment_date)}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                          {formatCurrency((booking.total_amount || 0) - (booking.discount_amount || 0))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {loadingRentals && (
                  <p className="pt-3 text-sm text-slate-500">Loading…</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
        )}
      </PageShell>
      <EditItemModal
        isOpen={editing}
        onClose={() => setEditing(false)}
        onUpdate={handleUpdateItem}
        item={item}
      />
      <TransferItemModal
        isOpen={transferOpen}
        item={item}
        onClose={() => setTransferOpen(false)}
        onTransferred={setItem}
      />
      <ConfirmModal
        isOpen={!!deletingImage}
        title="Delete image"
        description="Remove this photo from the item gallery?"
        confirmLabel="Delete"
        variant="danger"
        loading={uploadingImage}
        onClose={() => setDeletingImage(null)}
        onConfirm={confirmDeleteGalleryImage}
      />
    </>
  );
}

