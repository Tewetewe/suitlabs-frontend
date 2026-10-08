// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  // Backend sends error as a plain string
  error?: string;
  meta?: ResponseMeta;
}

// Kept for backward compatibility with api-utils.ts (not used at runtime)
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

export interface ItemSyncRowError {
  row: number;
  sheet?: string;
  code?: string;
  error: string;
}

export interface ItemSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ItemSyncRowError[];
}

export type GoogleSyncJobType = 'item_import' | 'booking_export' | 'legacy_booking_import';
export type GoogleSyncStatus = 'running' | 'completed' | 'failed';

export type WAReminderType = 'pickup' | 'return';
export type WAReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type WAReminderTrigger = 'auto' | 'manual';

export interface WAReminder {
  id: string;
  rental_id: string;
  customer_id: string;
  branch_id: string;
  reminder_type: WAReminderType;
  reminder_date: string;
  phone: string;
  language: string;
  message: string;
  status: WAReminderStatus;
  trigger: WAReminderTrigger;
  wablas_id?: string;
  error_summary?: string;
  /** Newest WhatsApp status from Wablas, or "manual" when sent by hand. */
  delivery_status?: string;
  delivery_note?: string;
  delivery_updated_at?: string;
  triggered_by?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

/** One booking line the legacy import writes (backend usecase.LegacyImportLine). */
export interface LegacyImportLine {
  code: string;
  name: string;
  type: string;
  price: number;
  /**
   * codes = from the Item Codes column, choice = picked on the page,
   * auto = from the names, pair = the Suit's paired Trousers.
   */
  from: 'codes' | 'choice' | 'auto' | 'pair';
}

/** A product that matched no Item, or several. One choice covers every row with this key. */
export interface LegacyItemNeed {
  key: string;
  kind: 'suit' | 'trousers' | 'item';
  product: string;
  size: string;
  candidates?: LegacyImportLine[];
  rows?: number[];
}

/** One legacy sheet row and what the import does with it (backend usecase.LegacyImportRow). */
export interface LegacyImportRow {
  row: number;
  state: 'ready' | 'blocked' | 'imported';
  booking_id?: string;
  customer_name: string;
  phone: string;
  customer_exists: boolean;
  event_date?: string;
  pickup_date?: string;
  return_date?: string;
  ordered_date?: string;
  sheet_status: string;
  booking_status?: string;
  rental_status?: string;
  product: string;
  size: string;
  suit_detail: string;
  lines: LegacyImportLine[];
  total: number;
  paid: number;
  remaining: number;
  payment_method?: string;
  /** Problems stop the row. */
  problems?: string[];
  /** Warnings let the row through, for a check by hand. */
  warnings?: string[];
  need?: LegacyItemNeed;
}

export interface LegacyImportPreview {
  month: string;
  tab: string;
  branch_id: string;
  branch_name: string;
  spreadsheet_id: string;
  rows: LegacyImportRow[];
  ready: number;
  blocked: number;
  imported: number;
  other_months: number;
  /** Each product that waits for an Item choice, once. */
  needs: LegacyItemNeed[];
}

/** What the legacy Preview and Sync read. */
export interface LegacyImportRequest {
  branch_id?: string;
  tab?: string;
  month: string;
  /** Picker key → chosen Item code. */
  choices?: Record<string, string>;
}

export interface LegacyImportResult {
  preview: LegacyImportPreview;
  created: number;
  failed: number;
  errors?: string[];
  run?: GoogleSyncRun;
}

/** One of today's reminders, ready to copy and send by hand (backend usecase.ReminderDraft). */
export interface WAReminderDraft {
  rental_id: string;
  branch_id: string;
  invoice_number?: string;
  type: WAReminderType;
  customer_name: string;
  /** International digits. Empty or raw when skip_reason is set. */
  phone: string;
  language: string;
  message: string;
  /** Why no reminder goes to this Customer, for example an opt-out. */
  skip_reason?: string;
  /** True when a reminder already went out today, by Wablas or by hand. */
  sent_today: boolean;
}

/** A Late Fee or replacement fee that Admin waived (backend entity/fee_waiver.go). */
export interface FeeWaiver {
  id: string;
  kind: 'late_fee' | 'replacement';
  rental_id: string;
  item_id?: string;
  branch_id?: string;
  /** The full fee before the waiver. */
  fee_amount: number;
  /** The part the Customer did not pay. */
  waived_amount: number;
  reason: string;
  waived_by: string;
  created_at: string;
  item?: { id: string; name: string; code?: string };
}

/** The Late Fee that Complete would charge at a given time. */
export interface LateFeePreview {
  late_fee: number;
  late_days: number;
}

/** Matches entity.FeeWaiverReasonMinLength on the backend. */
export const FEE_WAIVER_REASON_MIN = 10;

/** The feature that sent a WhatsApp message (backend entity/wa_message_log.go). */
export type WAMessageKind =
  | 'reminder_pickup'
  | 'reminder_return'
  | 'receipt_booking'
  | 'receipt_rental'
  | 'receipt_sale'
  | 'deposit_agreement'
  | 'other';

/** The kind groups that the message list filters on. */
export type WAMessageKindFilter = 'reminder' | 'receipt' | 'deposit_agreement' | 'other';

/** One WhatsApp message the system gave to Wablas. */
export interface WAMessageLog {
  id: string;
  kind: WAMessageKind;
  ref_id?: string;
  branch_id?: string;
  recipient_name?: string;
  phone: string;
  message: string;
  image_url?: string;
  /** sent = Wablas queued it; failed = Wablas queued nothing. */
  status: 'sent' | 'failed';
  wablas_id?: string;
  error_summary?: string;
  /** Newest WhatsApp status from Wablas. Empty until the first status arrives. */
  delivery_status?: string;
  delivery_note?: string;
  delivery_updated_at?: string;
  sent_by?: string;
  created_at: string;
}

// Pots (align with backend entity/pot.go): where the shop's money sits.
// 'bank' is Bank (unassigned): the balance from before the BCA/BNI split.
export type Pot = 'cash' | 'bca' | 'bni' | 'bank';

export interface BankPots {
  bca: number;
  bni: number;
  unassigned: number;
}

export interface PotBalances {
  as_of: string;
  cash: number;
  bca: number;
  bni: number;
  unassigned: number;
}

export interface PotTransfer {
  id: string;
  transfer_date: string;
  from_pot: Pot;
  to_pot: Pot;
  amount: number;
  note: string;
  branch_id: string;
  created_by: string;
  voided_at?: string;
  voided_by?: string;
  created_at: string;
}

// Daily Close (align with backend entity/daily_close.go and
// usecase/daily_close_usecase.go). A record of the end-of-day cash count of one
// shop; it locks nothing and posts no Journal Entry.
export type StartCashFrom = 'last_close' | 'books' | 'admin';

export interface DailyClose {
  id: string;
  branch_id: string;
  close_date: string;
  from_date: string;
  start_cash: number;
  start_cash_from: StartCashFrom | '';
  cash_in: number;
  cash_out: number;
  expected_cash: number;
  counted_cash: number;
  difference: number;
  bca_in: number;
  bca_out: number;
  bni_in: number;
  bni_out: number;
  unassigned_in: number;
  unassigned_out: number;
  edc_bca_fees: number;
  edc_bni_fees: number;
  edc_bca_expected: number;
  edc_bca_slip?: number | null;
  edc_bni_expected: number;
  edc_bni_slip?: number | null;
  checked_lines: string[];
  tips_cash: number;
  tips_bca: number;
  tips_bni: number;
  note: string;
  closed_by: string;
  closed_by_name?: string;
  closed_at: string;
}

// Tips of one shop for one month, shared with Staff at the end of the month.
export interface TipShare {
  id: string;
  branch_id: string;
  month: string;
  amount: number;
  note: string;
  shared_by: string;
  shared_by_name?: string;
  shared_at: string;
}

export interface TipMonth {
  month: string; // YYYY-MM
  total: number;
  share?: TipShare;
  can_share: boolean;
  changed_since_share: boolean;
}

export interface DailyClosePot {
  pot: Pot;
  in: number;
  out: number;
  net: number;
  balance: number;
  /** QRIS, debit, and card money into a bank Pot; checked by the EDC slip. */
  edc_in: number;
  /** Transaction Fees paid on top of the EDC payments; the slip shows them. */
  edc_fees: number;
  /** EDC payments that two or more fee rules could price. */
  fees_uncertain: number;
  /** Other bank lines, ticked on the mutasi. */
  to_check: number;
  checked: number;
}

export type DailyCloseLineGroup = 'cash' | 'edc' | 'transfer';

export interface DailyCloseLine {
  key: string;
  group: DailyCloseLineGroup;
  checked: boolean;
  fee?: number;
  fee_uncertain?: boolean;
  entry_id: string;
  occurred_on: string;
  source: string;
  source_id?: string;
  memo: string;
  account: string;
  method?: string;
  pot: Pot;
  in: number;
  out: number;
  created_by_name?: string;
  created_at: string;
}

export interface DailyCloseRental {
  rental_id: string;
  invoice_number?: string;
  customer_name: string;
  status: string;
  date: string;
}

export interface DailyCloseSummary {
  branch_id: string;
  date: string;
  from_date: string;
  is_today: boolean;
  last_close?: DailyClose;
  start_cash: number;
  start_cash_from: StartCashFrom;
  expected_cash: number;
  tip_months: TipMonth[];
  pots: DailyClosePot[];
  sources: { source: string; in: number; out: number }[];
  methods: { method: string; in: number; out: number }[];
  lines: DailyCloseLine[];
  open_returns: DailyCloseRental[];
  open_pickups: DailyCloseRental[];
  close?: DailyClose;
  changed_since_close: boolean;
  can_close: boolean;
}

// Transaction Fee Rules (align with backend entity/transaction_fee.go)
export type FeeMethod = 'qris' | 'debit' | 'cc';

export interface TransactionFeeRule {
  id: string;
  method: FeeMethod;
  /** bca, bni, or '' for a rule that is the same on every terminal (QRIS). */
  terminal: string;
  label: string;
  /** Basis points: 30 = 0.3%, 200 = 2%. */
  rate_bps: number;
  /** The fee applies only to a payment above this amount. */
  min_amount: number;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type TransactionFeeRuleInput = Omit<TransactionFeeRule, 'id' | 'created_at' | 'updated_at'>;

// H-1 Pickup checklist (align with backend usecase/pickup_prep_usecase.go)
export type PickupPrepStatus = 'not_started' | 'in_progress' | 'ready' | 'problem';
export type PickupPrepProblem = '' | 'damaged' | 'not_found';

export interface PickupPrepItem {
  item_id: string;
  code: string;
  barcode?: string;
  name: string;
  type: string;
  size: string;
  color: string;
  quantity: number;
  is_addon: boolean;
  item_status: string;
  found: boolean;
  clean: boolean;
  undamaged: boolean;
  size_ok: boolean;
  problem: PickupPrepProblem;
  problem_note: string;
  sent_to_maintenance: boolean;
  checked_by?: string;
  checked_at?: string;
  passed: boolean;
}

export interface PickupPrep {
  rental_id: string;
  booking_id?: string;
  invoice_number?: string;
  branch_id: string;
  branch_name?: string;
  customer_name: string;
  customer_phone?: string;
  pickup_date: string;
  return_date: string;
  notes?: string;
  status: PickupPrepStatus;
  items_passed: number;
  items_total: number;
  items: PickupPrepItem[];
  has_addons: boolean;
  addons_ready: boolean;
  deposit_required: boolean;
  agreement_sent_at?: string;
  /** WhatsApp status of the newest agreement message. */
  agreement_delivery_status?: string;
  agreement_delivery_note?: string;
  agreement_accepted_at?: string;
  remaining_amount: number;
  warning?: string;
}

export interface PickupPrepDay {
  date: string;
  total: number;
  ready: number;
  problem: number;
  rentals: PickupPrep[];
}

export interface PickupPrepItemCheck {
  found: boolean;
  clean: boolean;
  undamaged: boolean;
  size_ok: boolean;
  problem: PickupPrepProblem;
  problem_note: string;
}

// Daily Return Check (align with backend usecase/return_check_usecase.go)
export type ReturnCheckStatus = 'not_started' | 'in_progress' | 'checked' | 'problem' | 'returned';
export type ReturnCheckProblem = '' | 'damaged' | 'missing';

export interface ReminderInfo {
  status: WAReminderStatus;
  trigger: WAReminderTrigger;
  reminder_date: string;
  sent_at?: string;
  error?: string;
}

export interface ReturnCheckItem {
  item_id: string;
  code: string;
  barcode?: string;
  name: string;
  type: string;
  size: string;
  color: string;
  quantity: number;
  is_addon: boolean;
  received: boolean;
  undamaged: boolean;
  stain_free: boolean;
  problem: ReturnCheckProblem;
  problem_note: string;
  checked_by?: string;
  checked_at?: string;
  passed: boolean;
  /** True when Admin waived the replacement fee, so no lost-item Sale is needed. */
  replacement_waived?: boolean;
}

export interface ReturnCheck {
  rental_id: string;
  booking_id?: string;
  invoice_number?: string;
  branch_id: string;
  branch_name?: string;
  customer_name: string;
  customer_phone?: string;
  rental_status: Rental['status'];
  pickup_date: string;
  return_date: string;
  actual_return_date?: string;
  /** The 20:00 deadline on the Return Date. */
  due_by: string;
  days_overdue: number;
  /** For an open Rental, the Late Fee if it completes now. */
  late_fee: number;
  notes?: string;
  status: ReturnCheckStatus;
  items_passed: number;
  items_total: number;
  items: ReturnCheckItem[];
  security_deposit: number;
  deposit_held: boolean;
  reminder?: ReminderInfo;
  reminded_today: boolean;
}

export interface PickupReminder {
  rental_id: string;
  invoice_number?: string;
  branch_id: string;
  branch_name?: string;
  customer_name: string;
  customer_phone?: string;
  pickup_date: string;
  items_total: number;
  remaining_amount: number;
  reminder?: ReminderInfo;
  reminded_today: boolean;
}

export interface ReturnCheckDay {
  date: string;
  is_today: boolean;
  total: number;
  returned: number;
  checked: number;
  problem: number;
  overdue: number;
  to_remind: number;
  rentals: ReturnCheck[];
  pickups: PickupReminder[];
}

export interface ReturnCheckItemInput {
  received: boolean;
  undamaged: boolean;
  stain_free: boolean;
  problem: ReturnCheckProblem;
  problem_note: string;
}

export interface WAReminderStatusInfo {
  configured: boolean;
  timezone: string;
  send_delay_sec: number;
  batch_size: number;
  max_per_run: number;
  // "wablas device speed" when no app-side delay is set, otherwise "app".
  paced_by: string;
  company_name: string;
}

export interface WAReminderRunResult {
  reminder_date: string;
  trigger: WAReminderTrigger;
  pickup_sent: number;
  return_sent: number;
  skipped: number;
  failed: number;
  results?: WAReminder[];
}

export interface GoogleSyncRun {
  id: string;
  job_type: GoogleSyncJobType;
  period_key: string;
  branch_id?: string;
  spreadsheet_id?: string;
  sheet_name?: string;
  status: GoogleSyncStatus;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  row_count: number;
  error_summary?: string;
  triggered_by?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleSheetsBranchStatus {
  branch_id: string;
  branch_name: string;
  configured: boolean;
  spreadsheet_id?: string;
  spreadsheet_url?: string;
}

export interface GoogleSheetsStatus {
  configured: boolean;
  requires_branch?: boolean;
  branch_id?: string;
  branch_name?: string;
  spreadsheet_id?: string;
  spreadsheet_url?: string;
  items_range: string;
  suit_range: string;
  accessory_range: string;
  booking_tab_pattern: string;
  timezone: string;
  branches?: GoogleSheetsBranchStatus[];
}

export interface ResponseMeta {
  timestamp: string;
  request_id?: string;
  version?: string;
}

// Pagination Response
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
  error?: string;
  meta?: ResponseMeta;
}

// Specific pagination response for customers
export interface CustomerPaginatedResponse {
  success: boolean;
  data: {
    data: {
      customers: Customer[];
    };
    pagination: PaginationMeta;
  };
  message?: string;
  error?: string;
  meta?: ResponseMeta;
}

// Specific pagination response for items
export interface ItemPaginatedResponse {
  success: boolean;
  data: {
    data: {
      items: Item[];
    };
    pagination: PaginationMeta;
  };
  message?: string;
  error?: string;
  meta?: ResponseMeta;
}

// Specific pagination response for rentals
export interface RentalPaginatedResponse {
  success: boolean;
  data: {
    data: {
      rentals: Rental[];
    };
    pagination: PaginationMeta;
  };
  message?: string;
  error?: string;
  meta?: ResponseMeta;
}

// Specific pagination response for bookings
export interface BookingPaginatedResponse {
  success: boolean;
  data: {
    data: {
      bookings: Booking[];
    };
    pagination: PaginationMeta;
  };
  message?: string;
  error?: string;
  meta?: ResponseMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Standard Response Types
export interface CreateResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
  meta?: ResponseMeta;
}

export interface UpdateResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
  meta?: ResponseMeta;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  error?: string;
  meta?: ResponseMeta;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: APIError;
  message?: string;
  meta?: ResponseMeta;
}

// Authentication Types
export interface Branch {
  id: string;
  name: string;
  code: string;
  receipt_subtitle: string;
  address: string;
  phone: string;
  opening_hours?: string;
  email: string;
  website: string;
  latitude: number;
  longitude: number;
  geofence_km: number;
  spreadsheet_id?: string;
  spreadsheet_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'staff' | 'user';
  is_active: boolean;
  branches?: Branch[];
  created_at: string;
  updated_at: string;
}

export type FinancialGroupBy = 'month' | 'year';

export interface FinancialReportRow {
  period: string; // ISO string from backend
  bookings_count: number;
  total_amount: number;
  discounts: number;
  final_amount: number;
  paid_amount: number;
  remaining: number;
}

export type RentalAnalyticsSource = 'rentals' | 'bookings';

export interface RentalAnalyticsSummary {
  rental_count: number;
  booking_count: number;
  items_out: number;
  items_booked: number;
  unique_items: number;
  revenue: number;
  prev_rental_count: number;
  prev_items_out: number;
  catalogue_items: number;
  idle_count: number;
}

export interface RentalAnalyticsPeriod {
  period: string;
  rentals: number;
  items_out: number;
  bookings: number;
  items_booked: number;
  revenue: number;
}

export interface RentalAnalyticsBucket {
  key: string;
  label: string;
  items_out: number;
  rentals: number;
  revenue: number;
  share: number;
}

export interface RentalAnalyticsItemRow {
  id: string;
  code: string;
  name: string;
  type: string;
  size_label: string;
  color: string;
  brand: string;
  items_out: number;
  revenue: number;
  status?: string;
}

export interface RentalInsight {
  kind: string;
  title: string;
  detail: string;
}

export interface RentalItemAnalytics {
  start_date: string;
  end_date: string;
  source: RentalAnalyticsSource;
  summary: RentalAnalyticsSummary;
  monthly: RentalAnalyticsPeriod[];
  by_type: RentalAnalyticsBucket[];
  by_size: RentalAnalyticsBucket[];
  by_color: RentalAnalyticsBucket[];
  by_branch: RentalAnalyticsBucket[];
  top_items: RentalAnalyticsItemRow[];
  idle_items: RentalAnalyticsItemRow[];
  insights?: RentalInsight[];
}

export interface OwnerBookingPeriod {
  period: string;
  bookings: number;
  cancelled: number;
  final: number;
  paid: number;
  remaining: number;
}

export interface OwnerBookingAnalytics {
  count: number;
  cancelled: number;
  final_amount: number;
  paid_amount: number;
  remaining_amount: number;
  prev_count: number;
  prev_final: number;
  upcoming: number;
  monthly: OwnerBookingPeriod[];
  by_institution: RentalAnalyticsBucket[];
  by_package: RentalAnalyticsBucket[];
  by_payment: RentalAnalyticsBucket[];
  by_status: RentalAnalyticsBucket[];
}

export interface OwnerSaleAnalytics {
  count: number;
  revenue: number;
  prev_count: number;
  prev_revenue: number;
  monthly: RentalAnalyticsPeriod[];
  by_line_type: RentalAnalyticsBucket[];
  by_source: RentalAnalyticsBucket[];
  top_items: RentalAnalyticsItemRow[];
}

export interface OwnerAnalytics {
  start_date: string;
  end_date: string;
  stock: RentalItemAnalytics;
  bookings: OwnerBookingAnalytics;
  sales: OwnerSaleAnalytics;
  insights: RentalInsight[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// Item Types
export interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  trousers_code?: string;
  detail_size?: string;
  owner?: string;
  type: 'suit' | 'jacket' | 'accessory' | 'shoes' | 'tie' | 'belt' | 'trousers' | 'shirt' | 'shirts' | 'vest' | 'retail';
  brand?: string;
  color?: string;
  size: { label: string };
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'available' | 'rented' | 'maintenance' | 'retired' | 'damaged' | 'lost';
  quantity: number;
  available_qty?: number;
  rented_qty?: number;
  maintenance_qty?: number;
  standard_price: number;
  four_hour_price: number;
  set_four_hour_price?: number;
  set_standard_price?: number;
  purchase_price?: number;
  selling_price?: number;
  is_sellable?: boolean;
  category_id?: string;
  category?: Category;
  thumbnail_url?: string;
  images?: string[];
  tags?: string[];
  barcode?: string;
  branch_id?: string;
  branch?: Branch;
  created_at: string;
  updated_at: string;
}

// Customer Types
export interface Customer {
  id: string;
  email?: string;
  first_name: string;
  last_name: string;
  phone: string;
  instagram?: string;
  tiktok?: string;
  address?: string;
  notes?: string;
  language?: 'id' | 'en';
  // True when the customer asked to stop receiving WhatsApp messages.
  wa_opt_out?: boolean;
  is_active: boolean;
  branch_id?: string;
  branch?: Branch;
  created_at: string;
  updated_at: string;
}

export type BookingPaymentMethod =
  | 'dp_cash'
  | 'full_cash'
  | 'dp_transfer'
  | 'full_transfer'
  | 'dp_qris'
  | 'full_qris'
  | 'dp_debit'
  | 'full_debit'
  | 'dp_cc'
  | 'full_cc';

export type SalePaymentMethod = 'cash' | 'transfer' | 'qris' | 'debit' | 'cc';

export type BookingInstitution =
  | 'wedding'
  | 'wedding_guest'
  | 'corporate'
  | 'university'
  | 'sma_smk'
  | 'smp'
  | 'sd'
  | 'tk';

// Booking Types
export interface Booking {
  id: string;
  customer_id: string;
  customer?: Customer;
  /** The Pickup date. */
  booking_date: string;
  /** The Return date. */
  appointment_date?: string;
  /** The day the Customer wears the Items. */
  event_date?: string;
  /** '3d' or '4h'; empty on a Booking from before. */
  rental_length?: '3d' | '4h' | '';
  booking_guarantee: string;
  /** True when Staff or Admin decided this Customer pays no Security Deposit at Pickup. */
  security_deposit_waived?: boolean;
  institution?: BookingInstitution | '';
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  remaining_amount: number;
  /** Transaction Fees (QRIS and card) the customer paid on top; not shop revenue. */
  transaction_fee?: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'pending_approval';
  payment_status: 'pending' | 'partial' | 'completed';
  payment_method?: BookingPaymentMethod;
  package_pricing_id?: string;
  package_pricing?: PackagePricing;
  rental_id?: string; // Link to rental
  rental?: Rental; // Link to rental details
  notes?: string;
  created_by: string; // User who created the booking
  updated_by?: string; // User who last updated the booking
  creator?: User; // User who created this booking
  updater?: User; // User who last updated this booking
  created_at: string;
  updated_at: string;
  items?: BookingItem[];
  invoice_number?: string;
  payment_proof_url?: string;
  full_name?: string;
  phone_number?: string;
  branch_id?: string;
  branch?: Branch;
}

export interface BookingItem {
  id: string;
  booking_id: string;
  item_id: string;
  item?: Item;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  final_price: number;
  is_addon?: boolean;
}

// Rental Types (align with backend entity/rental.go)
export interface Rental {
  id: string;
  user_id: string;
  booking_id?: string; // Link to source booking
  customer?: Customer; // Customer who rented (user_id actually stores customer ID)
  items?: RentalItem[]; // Rental items
  booking?: Booking; // Link to booking details
  rental_date: string; // ISO
  return_date: string; // ISO
  actual_pickup_date?: string; // ISO
  actual_return_date?: string; // ISO
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'overdue';
  total_cost: number;
  security_deposit: number;
  late_fee: number;
  damage_charges: number;
  /** Transaction Fees (QRIS and card) the customer paid on top; not shop revenue. */
  transaction_fee?: number;
  identity_card_url?: string; // URL to uploaded identity card image
  deposit_payment_method?: 'cash' | 'transfer' | null;
  /** Where the deposit went (cash, bca, bni); the refund leaves from it by default. */
  deposit_pot?: string;
  deposit_refund_pot?: string;
  deposit_bank_name?: string;
  deposit_account_name?: string;
  deposit_account_number?: string;
  deposit_collected_at?: string;
  deposit_proof_url?: string;
  deposit_refunded_at?: string;
  /** True when the seven-day job released it, so nobody checked the item. */
  deposit_auto_released?: boolean;
  deposit_refund_method?: 'cash' | 'transfer' | null;
  deposit_refund_proof_url?: string;
  agreement_token?: string;
  agreement_sent_at?: string;
  /** WhatsApp status of the newest agreement message. */
  agreement_delivery_status?: string;
  agreement_delivery_note?: string;
  agreement_accepted_at?: string;
  notes?: string;
  created_by: string; // User who created the rental
  updated_by?: string; // User who last updated the rental
  creator?: User; // User who created this rental
  updater?: User; // User who last updated this rental
  branch_id?: string;
  branch?: Branch;
  created_at: string;
  updated_at: string;
}

export interface RentalItem {
  id: string;
  rental_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item?: Item; // Item details
  created_at: string;
  updated_at: string;
}

export interface DepositAgreementItemView {
  item_id: string;
  name: string;
  code?: string;
  quantity: number;
  replacement_fee: number;
}

export interface DepositAgreementView {
  token: string;
  language: string;
  customer_name: string;
  company_name: string;
  branch_name?: string;
  branch_address?: string;
  branch_phone?: string;
  rental_date: string;
  return_date: string;
  booking_amount: number;
  deposit_amount: number;
  deposit_percent: number;
  items: DepositAgreementItemView[];
  accepted: boolean;
  accepted_at?: string;
  replacement_clause: string;
  release_clause: string;
  deposit_clause: string;
}

export type SaleSource = 'standalone' | 'booking_addon' | 'rental_return';
export type SaleStatus = 'completed' | 'cancelled';
export type SaleLineType = 'retail' | 'replacement' | 'clearance';

export interface SaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  line_total: number;
  line_type: SaleLineType;
  replacement_for_item_id?: string;
  notes?: string;
  item?: Item;
  replacement_for_item?: Item;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_id?: string;
  booking_id?: string;
  rental_id?: string;
  source: SaleSource;
  status: SaleStatus;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  /** Transaction Fees (QRIS and card) the customer paid on top; not shop revenue. */
  transaction_fee?: number;
  payment_method?: SalePaymentMethod;
  notes?: string;
  customer?: Customer;
  items?: SaleItem[];
  created_by: string;
  branch_id?: string;
  branch?: Branch;
  created_at: string;
  updated_at: string;
}

export interface CreateSaleItemRequest {
  item_id: string;
  quantity: number;
  unit_price?: number;
  line_type?: SaleLineType;
  replacement_for_item_id?: string;
  notes?: string;
}

export interface CreateSaleRequest {
  customer_id?: string;
  booking_id?: string;
  rental_id?: string;
  source?: SaleSource;
  discount_amount?: number;
  paid_amount?: number;
  payment_method?: SalePaymentMethod;
  /** EDC terminal and card for a card payment; may be empty when one rule covers the method. */
  fee_rule_id?: string;
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  notes?: string;
  items: CreateSaleItemRequest[];
}

export interface SalePaginatedResponse {
  success: boolean;
  data: {
    data: {
      sales: Sale[];
    };
    pagination: PaginationMeta;
  };
  message?: string;
  error?: string;
  meta?: ResponseMeta;
}

export interface SaleFilters {
  search?: string;
  source?: SaleSource | '';
  status?: SaleStatus | '';
  customer_id?: string;
  booking_id?: string;
  rental_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salary'
  | 'supplies'
  | 'laundry'
  | 'marketing'
  | 'maintenance'
  | 'transport'
  | 'tax'
  | 'other';

export type ExpenseStatus = 'recorded' | 'voided';
export type ExpensePaymentMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other';

export interface Expense {
  id: string;
  expense_number: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method?: ExpensePaymentMethod | '';
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  vendor?: string;
  notes?: string;
  status: ExpenseStatus;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  creator?: User;
  updater?: User;
  branch_id?: string;
  branch?: Branch;
}

export interface CreateExpenseRequest {
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method?: ExpensePaymentMethod | '';
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  vendor?: string;
  notes?: string;
}

export interface UpdateExpenseRequest {
  expense_date?: string;
  category?: ExpenseCategory;
  description?: string;
  amount?: number;
  payment_method?: ExpensePaymentMethod | '';
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  vendor?: string;
  notes?: string;
}

export interface ExpensePaginatedResponse {
  success: boolean;
  data: {
    data: {
      expenses: Expense[];
    };
    pagination: PaginationMeta;
  };
  message?: string;
  error?: string;
}

export interface ExpenseFilters {
  search?: string;
  category?: ExpenseCategory | '';
  status?: ExpenseStatus | '';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseCategoryTotal {
  category: ExpenseCategory | string;
  amount: number;
  count: number;
}

export interface ExpensePeriodTotal {
  period: string;
  amount: number;
  count: number;
}

export interface ExpenseSummary {
  start_date: string;
  end_date: string;
  total_amount: number;
  count: number;
  by_category: ExpenseCategoryTotal[];
  by_month: ExpensePeriodTotal[];
}

export interface ProfitAndLossRow {
  period: string;
  booking_revenue: number;
  sale_revenue: number;
  total_revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  bookings_count: number;
  sales_count: number;
  expense_count: number;
}

export interface ProfitAndLossReport {
  group_by: FinancialGroupBy;
  start_date: string;
  end_date: string;
  totals: ProfitAndLossRow;
  rows: ProfitAndLossRow[];
  by_branch?: BranchProfitAndLoss[];
}

export interface BranchProfitAndLoss {
  branch_id: string;
  branch_name: string;
  totals: ProfitAndLossRow;
  rows?: ProfitAndLossRow[];
}

export interface RecurringExpense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method?: ExpensePaymentMethod | '';
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  vendor?: string;
  notes?: string;
  frequency: 'monthly';
  day_of_month: number;
  start_date: string;
  end_date?: string;
  next_run_date: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface CreateRecurringExpenseRequest {
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method?: ExpensePaymentMethod | '';
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  vendor?: string;
  notes?: string;
  day_of_month: number;
  start_date: string;
  end_date?: string;
}

export interface InventoryAssetTypeRow {
  type: string;
  item_count: number;
  quantity: number;
  value: number;
}

export interface InventoryAssetItem {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  quantity: number;
  purchase_price: number;
  value: number;
}

export interface InventoryAssetReport {
  total_value: number;
  item_count: number;
  total_quantity: number;
  by_type: InventoryAssetTypeRow[];
  items: InventoryAssetItem[];
}

export type FixedAssetCategory = 'furniture' | 'fixture' | 'equipment' | 'electronics' | 'other';
export type FixedAssetStatus = 'in_use' | 'disposed';

export interface FixedAsset {
  id: string;
  name: string;
  category: FixedAssetCategory;
  quantity: number;
  purchase_price: number;
  purchase_date?: string;
  vendor?: string;
  notes?: string;
  status: FixedAssetStatus;
  value: number;
  created_by: string;
  branch_id?: string;
  branch?: Branch;
  created_at: string;
}

export interface CreateFixedAssetRequest {
  name: string;
  category: FixedAssetCategory;
  quantity: number;
  purchase_price: number;
  purchase_date?: string;
  vendor?: string;
  notes?: string;
  payment_method?: 'cash' | 'transfer' | 'qris' | 'debit' | 'cc';
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  on_credit?: boolean;
}

export interface FixedAssetCategoryRow {
  category: string;
  item_count: number;
  quantity: number;
  value: number;
}

export interface FixedAssetReport {
  total_value: number;
  item_count: number;
  total_quantity: number;
  by_category: FixedAssetCategoryRow[];
  items: FixedAsset[];
}

export interface AssetReport {
  total_value: number;
  inventory: InventoryAssetReport;
  fixed: FixedAssetReport;
}

export interface OpeningBalance {
  id: string;
  as_of_date: string;
  cash_amount: number;
  bank_amount: number;
  inventory_value: number;
  fixed_asset_value: number;
  receivable_value: number;
  equity_amount: number;
  notes?: string;
}

export interface ClosedMonth {
  id: string;
  year: number;
  month: number;
  closed_by: string;
  closed_at: string;
}

export interface Payable {
  id: string;
  payable_date: string;
  due_date?: string | null;
  description: string;
  vendor?: string;
  amount: number;
  paid_amount: number;
  status: 'open' | 'paid' | 'voided';
  notes?: string;
}

export interface Loan {
  id: string;
  loan_date: string;
  lender: string;
  principal: number;
  outstanding: number;
  notes?: string;
}

export interface Dividend {
  id: string;
  dividend_date: string;
  fiscal_year: number;
  amount: number;
  shareholder?: string;
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  notes?: string;
}

export interface BalanceSheetReport {
  as_of_date: string;
  cash_drawer: number;
  bank: number;
  bank_pots?: BankPots;
  cash: number;
  accounts_receivable: number;
  inventory: number;
  fixed_assets: number;
  input_tax: number;
  total_assets: number;
  payables: number;
  loans: number;
  output_tax: number;
  customer_deposits: number;
  total_liabilities: number;
  opening_equity: number;
  retained_earnings: number;
  dividends: number;
  total_equity: number;
  difference: number;
}

export interface CashByMethod {
  cash: number;
  transfer: number;
  qris: number;
  debit: number;
  cc: number;
}

export interface CashFlowReport {
  start_date: string;
  end_date: string;
  beginning_cash: number;
  beginning_cash_drawer: number;
  beginning_bank: number;
  beginning_bank_pots?: BankPots;
  booking_collections: number;
  sale_collections: number;
  rental_charges: number;
  total_collections: number;
  expenses: number;
  operating_cash_flow: number;
  purchases: number;
  loan_proceeds: number;
  loan_repayments: number;
  payable_payments: number;
  dividends: number;
  net_change: number;
  ending_cash: number;
  ending_cash_drawer: number;
  ending_bank: number;
  ending_bank_pots?: BankPots;
  /** Money moved between Pots in the period; changes no total. */
  pot_transfers?: number;
  by_method: CashByMethod;
}

export interface AccountingReport {
  start_date: string;
  end_date: string;
  opening?: OpeningBalance | null;
  cash_on_hand: number;
  cash_drawer: number;
  bank: number;
  bank_pots?: BankPots;
  profit_and_loss: ProfitAndLossReport;
  balance_sheet: BalanceSheetReport;
  cash_flow: CashFlowReport;
  year_dividends: number;
  period_dividends: number;
}

export interface ChangeRentalDatesRequest {
  rental_date: string;
  return_date: string;
  reason?: string;
}

export interface CancelRentalRequest {
  reason: string;
}

export interface SuitSummary {
  id: string;
  brand?: string;
  color?: string;
  size?: { label: string };
  status?: 'available' | 'rented' | 'maintenance' | 'retired';
}

export interface CreateRentalRequest {
  user_id: string;
  suit_id: string;
  rental_date: string; // ISO
  return_date: string; // ISO
  security_deposit: number;
  notes?: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  trousers_code?: string;
  detail_size?: string;
  owner?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: Category[];
}

// Package Pricing Types
export interface PackagePricing {
  id: string;
  package_name: string;
  duration_hours: number;
  duration_days: number;
  price: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Discount Types
export interface Discount {
  id: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'amount';
  discount_value: number;
  min_amount?: number;
  max_discount_amount?: number;
  applicable_to: 'booking' | 'item' | 'both';
  target_type?: 'category' | 'item_type' | 'customer_tier' | 'specific_items' | 'specific_customers' | 'all';
  target_value?: string[];
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
  usage_count?: number;
  is_active: boolean;
  requires_code: boolean;
  code?: string;
  priority?: number;
  created_at: string;
  updated_at: string;
}


// Filter Types
export interface ItemFacets {
  types: string[];
  brands: string[];
  colors: string[];
  sizes: string[];
  statuses: string[];
  conditions: string[];
}

export interface ItemFilters {
  search?: string;
  type?: string;
  brand?: string;
  color?: string;
  /** Size label, matched exactly (backend ?size=). */
  size?: string;
  status?: string;
  condition?: string;
  category_id?: string;
  tags?: string;
  barcode?: string;
  is_sellable?: boolean;
  branch_id?: string;
  all_branches?: boolean;
  page?: number;
  limit?: number;
}

export interface BookingFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  start_date?: string;
  end_date?: string;
  for_rental?: boolean;
}

export interface CustomerFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

// Form Types
export interface CreateItemRequest {
  code: string;
  name: string;
  description?: string;
  trousers_code?: string;
  detail_size?: string;
  owner?: string;
  type: 'suit' | 'jacket' | 'accessory' | 'shoes' | 'tie' | 'belt' | 'trousers' | 'shirt' | 'shirts' | 'vest' | 'retail';
  brand?: string;
  color?: string;
  size: { label: string };
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  quantity: number;
  standard_price: number;
  four_hour_price: number;
  set_four_hour_price?: number;
  set_standard_price?: number;
  purchase_price?: number;
  payment_method?: 'cash' | 'transfer' | 'qris' | 'debit' | 'cc';
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  on_credit?: boolean;
  selling_price?: number;
  is_sellable?: boolean;
  category_id?: string;
  thumbnail_url?: string;
  images?: string[];
  tags?: string[];
}

export interface CreateBookingRequest {
  customer_id: string;
  booking_date: string; // ISO string, the Pickup date
  appointment_date?: string; // ISO string, the Return date
  /** The day the Customer wears the Items. Fills empty Pickup and Return dates. */
  event_date?: string;
  rental_length?: '3d' | '4h';
  booking_guarantee: string;
  /** True when Staff or Admin decided this Customer pays no Security Deposit at Pickup. */
  security_deposit_waived?: boolean;
  institution: BookingInstitution;
  notes?: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'pending_approval';
  payment_status: 'pending' | 'partial' | 'completed';
  payment_method: BookingPaymentMethod;
  /** EDC terminal and card for a card payment; may be empty when one rule covers the method. */
  fee_rule_id?: string;
  /** bca or bni: the bank account a non-cash payment went to or left from. */
  pot?: string;
  package_pricing_id?: string; // optional selected package id
  total_amount: number;
  paid_amount?: number;
  discount_amount?: number;
  remaining_amount?: number;
  payment_proof_url?: string;
  /** A discount to apply before the payment is taken. */
  discount_id?: string;
  items: Array<{
    item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_amount?: number;
    is_addon?: boolean;
  }>;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface CreateCustomerRequest {
  email?: string;
  first_name: string;
  last_name: string;
  phone: string;
  instagram?: string;
  tiktok?: string;
  address?: string;
  notes?: string;
  language?: 'id' | 'en';
  wa_opt_out?: boolean;
}

// Additional types for new features
/** The record a receipt belongs to. */
export type ReceiptKind = 'booking' | 'rental' | 'sale';

/** One receipt image sent to a customer on WhatsApp. */
export interface WAReceipt {
  id: string;
  kind: ReceiptKind;
  owner_id: string;
  phone: string;
  image_url: string;
  caption: string;
  status: 'sent' | 'failed';
  wablas_id?: string;
  error_summary?: string;
  /** Newest WhatsApp status from Wablas. Empty until the first status arrives. */
  delivery_status?: string;
  delivery_note?: string;
  delivery_updated_at?: string;
  sent_by: string;
  created_at: string;
}

export interface InvoiceData {
  invoice_number: string;
  booking_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  booking_date: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  due_amount: number;
  paid_amount?: number;
  /** Transaction Fees (QRIS and card) the customer paid on top; not shop revenue. */
  transaction_fee?: number;
  invoice_type: string;
  /** The Pickup date while money is owed; absent once paid in full. */
  due_date?: string;
  items: InvoiceItem[];
  company: CompanyInfo;
  generated_at: string;
  payment_status: string;
}

export interface DiscountApplication {
  id: string;
  discount_id: string;
  booking_id?: string;
  booking_item_id?: string;
  applied_amount: number;
  applied_at: string;
  created_at: string;
  updated_at: string;
}

export interface DiscountStats {
  total_applications: number;
  total_amount_saved: number;
  average_discount_amount: number;
  most_used_period: string;
}

export interface DiscountSummary {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  usage_count: number;
  usage_limit: number;
  total_saved: number;
  is_active: boolean;
  expires_at?: string;
}

export interface MaintenanceItem {
  id: string;
  item_id: string;
  reason: string;
  scheduled_date: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

export type PaymentProofKind = 'booking_payment' | 'deposit' | 'deposit_refund';

export interface PaymentProof {
  id: string;
  kind: PaymentProofKind;
  owner_id: string; // Booking id for booking_payment, Rental id for the deposit kinds
  branch_id?: string;
  file_url: string;
  amount?: number;
  method?: string;
  note?: string;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
}

export interface InvoiceItem {
  description: string;
  item_code?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CompanyInfo {
  name: string;
  subtitle?: string;
  address: string;
  phone: string;
  hours?: string;
  email: string;
  website: string;
}

// Dashboard
export interface DashboardStats {
  totalItems: number;
  totalBookings: number;
  activeRentals: number;
  todayRevenue: number;
  todayDepositReleases: number;
  lowStockItems: number;
  maintenanceItems: number;
}
