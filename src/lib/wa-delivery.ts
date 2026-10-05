// The WhatsApp status of a message that Wablas sent. The backend writes it from
// the Wablas tracking webhook and from its delivery check.

export type WADeliveryVariant = 'success' | 'danger' | 'warning' | 'default' | 'info';

export interface WADeliveryLabel {
  label: string;
  variant: WADeliveryVariant;
  /** True when WhatsApp will not deliver the message. Staff must resend it. */
  failed: boolean;
  /** True when the message still waits in the Wablas queue. */
  queued: boolean;
}

const FAILED = new Set(['cancel', 'canceled', 'cancelled', 'reject', 'rejected', 'failed']);

/** Returns null when no status has arrived yet. */
export function waDeliveryLabel(status?: string | null): WADeliveryLabel | null {
  const value = (status ?? '').trim().toLowerCase();
  if (!value) return null;
  if (FAILED.has(value)) return { label: 'Not delivered', variant: 'danger', failed: true, queued: false };
  switch (value) {
    case 'new':
    case 'pending':
      return { label: 'In Wablas queue', variant: 'warning', failed: false, queued: true };
    case 'sent':
      return { label: 'Sent to WhatsApp', variant: 'info', failed: false, queued: false };
    case 'delivered':
    case 'received':
      return { label: 'Delivered', variant: 'success', failed: false, queued: false };
    case 'read':
      return { label: 'Read', variant: 'success', failed: false, queued: false };
    default:
      return { label: value, variant: 'default', failed: false, queued: false };
  }
}
