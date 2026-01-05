// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: APIError;
  meta?: ResponseMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
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
  error?: APIError;
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
  error?: APIError;
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
  error?: APIError;
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
  error?: APIError;
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
  error?: APIError;
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
  error?: APIError;
  meta?: ResponseMeta;
}

export interface UpdateResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: APIError;
  meta?: ResponseMeta;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  error?: APIError;
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
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'staff' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  type: 'suit' | 'accessory' | 'shoes' | 'tie' | 'belt' | 'trousers' | 'shirts' | 'vest';
  brand?: string;
  color?: string;
  size: { label: string };
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  quantity: number;
  standard_price: number;
  one_day_price: number;
  four_hour_price: number;
  purchase_price?: number;
  category_id?: string;
  category?: Category;
  thumbnail_url?: string;
  images?: string[];
  tags?: string[];
  barcode?: string;
  created_at: string;
  updated_at: string;
}

// Customer Types
export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Booking Types
export interface Booking {
  id: string;
  customer_id: string;
  customer?: Customer;
  booking_date: string;
  appointment_date?: string;
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'pending_approval';
  payment_status: 'pending' | 'partial' | 'completed';
  payment_method?: 'dp_cash' | 'full_cash' | 'dp_transfer' | 'full_transfer' | string;
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
  target_type?: 'category' | 'item_type' | 'customer_tier' | 'specific_items' | 'all';
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
}

export interface BookingFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  start_date?: string;
  end_date?: string;
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
  type: 'suit' | 'accessory' | 'shoes' | 'tie' | 'belt' | 'trousers' | 'shirts' | 'vest';
  brand?: string;
  color?: string;
  size: { label: string };
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  quantity: number;
  standard_price: number;
  one_day_price: number;
  four_hour_price: number;
  purchase_price?: number;
  category_id?: string;
  thumbnail_url?: string;
  images?: string[];
  tags?: string[];
}

export interface CreateBookingRequest {
  customer_id: string;
  booking_date: string; // ISO string
  appointment_date?: string; // ISO string
  notes?: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'pending_approval';
  payment_status: 'pending' | 'partial' | 'completed';
  payment_method: 'dp_cash' | 'full_cash' | 'dp_transfer' | 'full_transfer' | string;
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
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
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