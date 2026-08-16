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

export type GoogleSyncJobType = 'item_import' | 'booking_export';
export type GoogleSyncStatus = 'running' | 'completed' | 'failed';

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
  standard_price: number;
  one_day_price: number;
  four_hour_price: number;
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
  booking_date: string;
  appointment_date?: string;
  booking_guarantee: string;
  institution?: BookingInstitution | '';
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  remaining_amount: number;
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
  identity_card_url?: string; // URL to uploaded identity card image
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
  vendor?: string;
  notes?: string;
}

export interface UpdateExpenseRequest {
  expense_date?: string;
  category?: ExpenseCategory;
  description?: string;
  amount?: number;
  payment_method?: ExpensePaymentMethod | '';
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
  notes?: string;
}

export interface BalanceSheetReport {
  as_of_date: string;
  cash_drawer: number;
  bank: number;
  cash: number;
  accounts_receivable: number;
  inventory: number;
  fixed_assets: number;
  input_tax: number;
  total_assets: number;
  payables: number;
  loans: number;
  output_tax: number;
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
  by_method: CashByMethod;
}

export interface AccountingReport {
  start_date: string;
  end_date: string;
  opening?: OpeningBalance | null;
  cash_on_hand: number;
  cash_drawer: number;
  bank: number;
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
  status?: string;
  condition?: string;
  category_id?: string;
  tags?: string;
  barcode?: string;
  is_sellable?: boolean;
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
  one_day_price: number;
  four_hour_price: number;
  purchase_price?: number;
  payment_method?: 'cash' | 'transfer' | 'qris' | 'debit' | 'cc';
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
  booking_date: string; // ISO string
  appointment_date?: string; // ISO string
  booking_guarantee: string;
  institution: BookingInstitution;
  notes?: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'pending_approval';
  payment_status: 'pending' | 'partial' | 'completed';
  payment_method: BookingPaymentMethod;
  package_pricing_id?: string; // optional selected package id
  total_amount: number;
  paid_amount?: number;
  discount_amount?: number;
  remaining_amount?: number;
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
}

// Additional types for new features
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
  invoice_type: string;
  due_date: string;
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

export interface PaymentProof {
  id: string;
  booking_id: string;
  file_url: string;
  upload_date: string;
  verified: boolean;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CompanyInfo {
  name: string;
  subtitle?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

// Dashboard
export interface DashboardStats {
  totalItems: number;
  totalBookings: number;
  activeRentals: number;
  todayRevenue: number;
  lowStockItems: number;
  maintenanceItems: number;
}