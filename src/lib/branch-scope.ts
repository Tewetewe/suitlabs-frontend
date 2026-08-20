export const BRANCH_STORAGE_KEY = 'suitlabs_branch_id';
export const BRANCH_WRITE_STORAGE_KEY = 'suitlabs_write_branch_id';
export const ALL_BRANCHES_ID = '__all__';

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
  'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362';

export function receiptSubtitle(subtitle?: string | null): string {
  return subtitle?.trim() || RECEIPT_FALLBACK_SUBTITLE;
}

export function receiptAddress(address?: string | null): string {
  return address?.trim() || RECEIPT_FALLBACK_ADDRESS;
}

export function receiptPhone(phone?: string | null): string {
  return phone?.trim() || '';
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
