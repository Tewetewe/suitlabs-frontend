export const BRANCH_STORAGE_KEY = 'suitlabs_branch_id';
export const BRANCH_WRITE_STORAGE_KEY = 'suitlabs_write_branch_id';
export const ALL_BRANCHES_ID = '__all__';

/**
 * The shop a browser opens on before anyone picks one: Jimbaran, the first
 * shop, then the first in the list. Once someone picks a shop, the browser
 * keeps that one (persistBranchScope), across reloads and logins.
 */
export const DEFAULT_BRANCH_CODE = 'jimbaran';

export function defaultBranch<T extends { code?: string }>(rows: T[]): T | undefined {
  return rows.find((branch) => (branch.code || '').trim().toLowerCase() === DEFAULT_BRANCH_CODE) ?? rows[0];
}

export function readStoredBranchId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BRANCH_STORAGE_KEY);
}

export function readStoredWriteBranchId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BRANCH_WRITE_STORAGE_KEY);
}

export function persistBranchScope(branchId: string | null, writeBranchId?: string | null) {
  if (typeof window === 'undefined') return;
  if (branchId) {
    localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
  } else {
    localStorage.removeItem(BRANCH_STORAGE_KEY);
  }
  if (writeBranchId !== undefined) {
    if (writeBranchId) {
      localStorage.setItem(BRANCH_WRITE_STORAGE_KEY, writeBranchId);
    } else {
      localStorage.removeItem(BRANCH_WRITE_STORAGE_KEY);
    }
  }
}

export function headerBranchId(method?: string): string | undefined {
  const stored = readStoredBranchId();
  const write = readStoredWriteBranchId();
  const isGet = !method || method.toLowerCase() === 'get';
  if (!stored || stored === ALL_BRANCHES_ID) {
    if (!isGet && write && write !== ALL_BRANCHES_ID) {
      return write;
    }
    return undefined;
  }
  return stored;
}

/**
 * The shop block printed on every receipt and invoice. The subtitle and the
 * address fall back to the Jimbaran shop, because a receipt with a blank
 * address is worse than a receipt with the wrong one. The phone stays empty
 * when the branch has none, so no receipt prints a number nobody answers.
 * These mirror entity.Branch.ReceiptInfo on the backend — change both together.
 */
export const RECEIPT_BRAND_NAME = 'SUITLABS BALI';
export const RECEIPT_FALLBACK_SUBTITLE = 'Sewa Jas Jimbaran';
export const RECEIPT_FALLBACK_ADDRESS =
  'Jl. Bukit Sari No.2, Jimbaran, Kec. Kuta Sel., Kabupaten Badung, Bali 80361';
export const RECEIPT_FALLBACK_HOURS = 'MON-FRI: 12.00-20.00 | SAT-SUN: 12.00-18.00';

export function receiptSubtitle(subtitle?: string | null): string {
  return subtitle?.trim() || RECEIPT_FALLBACK_SUBTITLE;
}

export function receiptAddress(address?: string | null): string {
  return address?.trim() || RECEIPT_FALLBACK_ADDRESS;
}

export function receiptPhone(phone?: string | null): string {
  const raw = phone?.trim() || '';
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('62')) return `+${digits}`;
  if (raw.startsWith('+') && digits) return `+${digits}`;
  return raw;
}

/** Split compact shop hours into lines that fit a 58 mm receipt. */
export function receiptHours(hours?: string | null): string[] {
  const value = hours == null ? RECEIPT_FALLBACK_HOURS : hours.trim();
  if (!value) return [];
  return value.split(/[|\r\n]+/).map((line) => line.trim()).filter(Boolean);
}

export function customerOriginName(customer?: { branch?: { name?: string } | null } | null): string {
  return customer?.branch?.name?.trim() || '';
}

export function customerOptionLabel(customer: {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  branch?: { name?: string } | null;
}): string {
  const contact = customer.phone || customer.email || '';
  const shop = customerOriginName(customer);
  return `${customer.first_name} ${customer.last_name}${contact ? ` • ${contact}` : ''}${shop ? ` · ${shop}` : ''}`;
}

export function branchAccent(code?: string): 'indigo' | 'emerald' | 'slate' {
  const normalized = (code || '').toLowerCase();
  if (normalized.includes('jimbaran')) return 'indigo';
  if (normalized.includes('nusa')) return 'emerald';
  return 'slate';
}
