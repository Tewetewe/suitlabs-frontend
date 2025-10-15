import axios, { AxiosInstance } from 'axios';
import { 
  APIResponse,
  PaginatedResponse,
  CustomerPaginatedResponse,
  ItemPaginatedResponse,
  RentalPaginatedResponse,
  BookingPaginatedResponse,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
  User, 
  Item, 
  Customer, 
  Booking, 
  Rental, 
  Category,
  PackagePricing,
  Discount,
  PaginationMeta,
  LoginRequest,
  LoginResponse,
  CreateItemRequest,
  CreateBookingRequest,
  CreateCustomerRequest,
  ItemFilters,
  BookingFilters,
  CustomerFilters,
  InvoiceData,
  DiscountApplication,
  DiscountStats,
  DiscountSummary,
  MaintenanceItem
} from '@/types';

// Backend category structure (uses 'children' instead of 'subcategories')
interface BackendCategory {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: BackendCategory[];
}

class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          localStorage.removeItem('auth_token');
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Helper method to handle API responses consistently
  private handleResponse<T>(response: { data: APIResponse<T> | PaginatedResponse<T> | CreateResponse<T> | UpdateResponse<T> | DeleteResponse }): T {
    const { data } = response;
    
    if (!data.success) {
      throw new Error(data.error?.message || 'API request failed');
    }
    
    if ('data' in data && data.data !== undefined) {
      return data.data as T;
    }
    
    throw new Error('Invalid response format');
  }

  // Helper method to handle paginated responses
  private handlePaginatedResponse<T>(response: { data: PaginatedResponse<T> }): PaginatedResponse<T> {
    const { data } = response;
    
    if (!data.success) {
      throw new Error(data.error?.message || 'API request failed');
    }
    
    return data;
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<APIResponse<LoginResponse>>('/api/v1/auth/login', credentials);
    const data = response.data.data!;
    this.setToken(data.token);
    return data;
  }

  async register(userData: CreateCustomerRequest): Promise<User> {
    const response = await this.client.post<APIResponse<User>>('/api/v1/auth/register', userData);
    return response.data.data!;
  }

  async getProfile(): Promise<User> {
    const response = await this.client.get<APIResponse<User>>('/api/v1/auth/profile');
    return response.data.data!;
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await this.client.put<APIResponse<User>>('/api/v1/auth/profile', userData);
    return response.data.data!;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/api/v1/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    });
  }

  // Items
  async getItems(filters?: ItemFilters): Promise<ItemPaginatedResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await this.client.get<ItemPaginatedResponse>(`/api/v1/items?${params}`);
    return response.data;
  }

  async getItem(id: string): Promise<Item> {
    const response = await this.client.get<{ data: Item } | { data: { item: Item } }>(`/api/v1/items/${id}`);
    const payload = response.data;
    return 'item' in payload.data ? (payload.data as { item: Item }).item : (payload.data as Item);
  }

  async createItem(item: CreateItemRequest): Promise<Item> {
    const response = await this.client.post<CreateResponse<Item>>('/api/v1/items', item);
    return response.data.data;
  }

  async updateItem(id: string, item: Partial<CreateItemRequest>): Promise<Item> {
    console.log('API: Updating item with data:', item); // Debug log
    const response = await this.client.put<UpdateResponse<Item>>(`/api/v1/items/${id}`, item);
    console.log('API: Update response:', response.data); // Debug log
    // Handle both old and new API response formats
    const responseData = response.data as unknown as { data?: { data?: Item } } & { data?: Item } & Item;
    return responseData?.data?.data || responseData?.data || responseData;
  }

  async deleteItem(id: string): Promise<void> {
    await this.client.delete<DeleteResponse>(`/api/v1/items/${id}`);
  }

  async getAvailableItems(): Promise<Item[]> {
    const response = await this.client.get<APIResponse<Item[]>>('/api/v1/items/available');
    return response.data.data!;
  }

  // Items availability with combined filters (barcode, category, type, size, etc.) and optional date range
  async getAvailableItemsCombined(filters?: ItemFilters & { start_date?: string; end_date?: string; page?: number; limit?: number }): Promise<ItemPaginatedResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
      });
    }
    const response = await this.client.get<ItemPaginatedResponse>(`/api/v1/items/available${params.toString() ? `?${params}` : ''}`);
    return response.data;
  }

  // Convenience helper for only date range
  async getAvailableItemsByDate(startDate: string, endDate: string): Promise<ItemPaginatedResponse> {
    return this.getAvailableItemsCombined({ start_date: startDate, end_date: endDate });
  }

  async searchItems(query: string): Promise<Item[]> {
    const response = await this.client.get<APIResponse<Item[] | { items: Item[] }>>(`/api/v1/items/search?q=${query}`);
    const payload = response.data.data as unknown;
    if (Array.isArray(payload)) return payload as Item[];
    const obj = payload as { items?: Item[] };
    return obj.items || [];
  }


  async searchByBarcode(barcode: string): Promise<Item> {
    const response = await this.client.get<APIResponse<Item>>(`/api/v1/items/barcode?barcode=${barcode}`);
    return response.data.data!;
  }

  async getItemByCode(code: string): Promise<Item> {
    const encoded = encodeURIComponent(code);
    const response = await this.client.get<APIResponse<Item>>(`/api/v1/items/code/${encoded}`);
    return this.handleResponse<Item>(response);
  }

  async updateItemQuantity(id: string, quantity: number): Promise<Item> {
    const response = await this.client.put<APIResponse<Item>>(`/api/v1/items/${id}/quantity`, { quantity });
    return this.handleResponse<Item>(response);
  }

  async rentItem(id: string, customerId: string): Promise<Item> {
    const response = await this.client.put<APIResponse<Item>>(`/api/v1/items/${id}/rent`, { customer_id: customerId });
    return this.handleResponse<Item>(response);
  }

  async returnItem(id: string): Promise<Item> {
    const response = await this.client.put<APIResponse<Item>>(`/api/v1/items/${id}/return`);
    return this.handleResponse<Item>(response);
  }

  async sendToMaintenance(id: string, reason?: string): Promise<Item> {
    const response = await this.client.put<APIResponse<Item>>(`/api/v1/items/${id}/maintenance`, { reason });
    return this.handleResponse<Item>(response);
  }

  async returnFromMaintenance(id: string): Promise<Item> {
    const response = await this.client.put<APIResponse<Item>>(`/api/v1/items/${id}/maintenance/return`);
    return this.handleResponse<Item>(response);
  }

  async addItemDiscount(id: string, discountPercentage: number): Promise<Item> {
    const response = await this.client.post<APIResponse<Item>>(`/api/v1/items/${id}/discount`, { discount_percentage: discountPercentage });
    return this.handleResponse<Item>(response);
  }

  async removeItemDiscount(id: string): Promise<Item> {
    const response = await this.client.delete<APIResponse<Item>>(`/api/v1/items/${id}/discount`);
    return this.handleResponse<Item>(response);
  }

  async uploadItemImage(id: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await this.client.post<APIResponse<{ image_url: string }>>(`/api/v1/items/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data!.image_url;
  }

  async deleteItemImage(id: string, imageUrl: string): Promise<Item> {
    const response = await this.client.delete<APIResponse<{ item: Item }>>(`/api/v1/items/${id}/image`, {
      data: { image_url: imageUrl }
    });
    return response.data.data!.item;
  }

  async generateItemBarcode(id: string): Promise<Item> {
    const response = await this.client.post<APIResponse<Item>>(`/api/v1/items/${id}/generate-barcode`);
    return this.handleResponse<Item>(response);
  }

  async getItemsByType(type: string): Promise<Item[]> {
    const response = await this.client.get<APIResponse<Item[]>>(`/api/v1/items/type/${type}`);
    return response.data.data!;
  }

  async getItemsByBrand(brand: string): Promise<Item[]> {
    const response = await this.client.get<APIResponse<Item[]>>(`/api/v1/items/brand/${brand}`);
    return response.data.data!;
  }

  async getItemsByColor(color: string): Promise<Item[]> {
    const response = await this.client.get<APIResponse<Item[]>>(`/api/v1/items/color/${color}`);
    return response.data.data!;
  }

  async getItemsBySize(size: string): Promise<Item[]> {
    const response = await this.client.get<APIResponse<Item[]>>(`/api/v1/items/size/${size}`);
    return response.data.data!;
  }


  // Customers
  async getCustomers(filters?: CustomerFilters): Promise<CustomerPaginatedResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await this.client.get<CustomerPaginatedResponse>(`/api/v1/customers?${params}`);
    return response.data;
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await this.client.get<APIResponse<Customer>>(`/api/v1/customers/${id}`);
    return response.data.data!;
  }

  async createCustomer(customer: CreateCustomerRequest): Promise<Customer> {
    const response = await this.client.post<CreateResponse<Customer>>('/api/v1/customers', customer);
    return response.data.data;
  }

  async updateCustomer(id: string, customer: Partial<CreateCustomerRequest>): Promise<Customer> {
    const response = await this.client.put<UpdateResponse<Customer>>(`/api/v1/customers/${id}`, customer);
    return response.data.data;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.client.delete(`/api/v1/customers/${id}`);
  }

  async findOrCreateCustomer(customerData: CreateCustomerRequest): Promise<Customer> {
    const response = await this.client.post<APIResponse<Customer>>('/api/v1/customers/find-or-create', customerData);
    return response.data.data!;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const response = await this.client.get<APIResponse<Customer[] | { customers: Customer[] }>>(`/api/v1/customers/search?q=${query}`);
    const payload = response.data.data as unknown;
    if (Array.isArray(payload)) return payload as Customer[];
    const obj = payload as { customers?: Customer[] };
    return obj.customers || [];
  }

  async findCustomer(email?: string, phone?: string): Promise<Customer | null> {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (phone) params.append('phone', phone);
    const response = await this.client.get<APIResponse<Customer>>(`/api/v1/customers/find?${params}`);
    return response.data.data || null;
  }

  async getCustomerBookings(customerId: string): Promise<Booking[]> {
    const response = await this.client.get<APIResponse<Booking[]>>(`/api/v1/customers/${customerId}/bookings`);
    return response.data.data!;
  }

  async uploadCustomerDocument(customerId: string, file: File, documentType: string): Promise<void> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', documentType);
    await this.client.post(`/api/v1/customers/${customerId}/document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async activateCustomer(customerId: string): Promise<Customer> {
    const response = await this.client.put<APIResponse<Customer>>(`/api/v1/customers/${customerId}/activate`);
    return response.data.data!;
  }

  async deactivateCustomer(customerId: string): Promise<Customer> {
    const response = await this.client.put<APIResponse<Customer>>(`/api/v1/customers/${customerId}/deactivate`);
    return response.data.data!;
  }

  // Bookings
  async getBookings(filters?: BookingFilters & { page?: number; limit?: number }): Promise<BookingPaginatedResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await this.client.get<BookingPaginatedResponse>(`/api/v1/bookings?${params}`);
    return response.data;
  }

  async getBooking(id: string): Promise<Booking> {
    const response = await this.client.get<APIResponse<Booking>>(`/api/v1/bookings/${id}`);
    return response.data.data!;
  }

  async createBooking(booking: CreateBookingRequest): Promise<Booking> {
    const response = await this.client.post<CreateResponse<Booking>>('/api/v1/bookings', booking);
    return response.data.data;
  }

  async updateBooking(id: string, booking: Partial<CreateBookingRequest>): Promise<Booking> {
    const response = await this.client.put<UpdateResponse<Booking>>(`/api/v1/bookings/${id}`, booking);
    return response.data.data;
  }

  async confirmBooking(id: string): Promise<Booking> {
    const response = await this.client.put<APIResponse<Booking>>(`/api/v1/bookings/${id}/confirm`);
    return response.data.data!;
  }

  async activateBooking(id: string): Promise<Booking> {
    const response = await this.client.put<APIResponse<Booking>>(`/api/v1/bookings/${id}/activate`);
    return response.data.data!;
  }

  async completeBooking(id: string): Promise<Booking> {
    const response = await this.client.put<APIResponse<Booking>>(`/api/v1/bookings/${id}/complete`);
    return response.data.data!;
  }

  async cancelBooking(id: string): Promise<Booking> {
    const response = await this.client.put<APIResponse<Booking>>(`/api/v1/bookings/${id}/cancel`);
    return response.data.data!;
  }

  async deleteBooking(id: string): Promise<void> {
    await this.client.delete<DeleteResponse>(`/api/v1/bookings/${id}`);
  }
  async generateInvoice(bookingId: string, invoiceType: 'dp' | 'full'): Promise<InvoiceData> {
    const response = await this.client.get<APIResponse<InvoiceData>>(`/api/v1/bookings/${bookingId}/invoice?type=${invoiceType}`);
    return response.data.data!;
  }

  async generateInvoicePDF(bookingId: string, invoiceType: 'dp' | 'full'): Promise<Blob> {
    const response = await this.client.get(`/api/v1/bookings/${bookingId}/invoice/pdf?type=${invoiceType}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getPendingApprovals(): Promise<Booking[]> {
    const response = await this.client.get<BookingPaginatedResponse>('/api/v1/bookings/pending-approvals');
    return response.data.data?.data?.bookings || [];
  }

  async addPayment(bookingId: string, amount: number, paymentMethod: string): Promise<Booking> {
    const response = await this.client.put<APIResponse<Booking>>(`/api/v1/bookings/${bookingId}/payment`, {
      amount,
      payment_method: paymentMethod
    });
    return response.data.data!;
  }

  async uploadPaymentProof(bookingId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('payment_proof', file);
    await this.client.post(`/api/v1/bookings/${bookingId}/payment-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async submitForApproval(bookingId: string): Promise<Booking> {
    const response = await this.client.post<APIResponse<Booking>>(`/api/v1/bookings/${bookingId}/submit-approval`);
    return response.data.data!;
  }

  async approveChanges(bookingId: string): Promise<Booking> {
    const response = await this.client.put<APIResponse<Booking>>(`/api/v1/bookings/${bookingId}/approve`);
    return response.data.data!;
  }

  async rejectChanges(bookingId: string, reason: string): Promise<Booking> {
    const response = await this.client.put<APIResponse<Booking>>(`/api/v1/bookings/${bookingId}/reject`, { reason });
    return response.data.data!;
  }

  // Rentals
  async getRentals(params?: { page?: number; limit?: number; status?: string; user_id?: string }): Promise<RentalPaginatedResponse> {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) search.append(key, String(value));
      });
    }
    const response = await this.client.get<RentalPaginatedResponse>(`/api/v1/rentals${search.toString() ? `?${search}` : ''}`);
    return response.data;
  }

  async getRental(id: string): Promise<Rental> {
    const response = await this.client.get<APIResponse<Rental>>(`/api/v1/rentals/${id}`);
    return response.data.data!;
  }

  async createRental(rental: import('@/types').CreateRentalRequest): Promise<Rental> {
    const response = await this.client.post<APIResponse<Rental>>('/api/v1/rentals', rental);
    return response.data.data!;
  }

  async createRentalFromBooking(bookingId: string): Promise<Rental> {
    const response = await this.client.post<APIResponse<Rental>>(`/api/v1/rentals/from-booking/${bookingId}`);
    return response.data.data!;
  }

  async updateRental(rentalId: string, rental: { rental_date?: string; return_date?: string; security_deposit?: number; notes?: string }): Promise<Rental> {
    const response = await this.client.put<APIResponse<Rental>>(`/api/v1/rentals/${rentalId}`, rental);
    return response.data.data!;
  }

  async activateRental(rentalId: string): Promise<Rental> {
    const response = await this.client.put<APIResponse<Rental>>(`/api/v1/rentals/${rentalId}/activate`);
    return response.data.data!;
  }

  async completeRental(rentalId: string, actualReturnDate?: string, damageCharges?: number, damageNotes?: string): Promise<Rental> {
    const body: Record<string, unknown> = {};
    if (actualReturnDate) body.actual_return_date = actualReturnDate;
    if (typeof damageCharges === 'number') body.damage_charges = damageCharges;
    if (damageNotes) body.damage_notes = damageNotes;
    const response = await this.client.put<APIResponse<Rental>>(`/api/v1/rentals/${rentalId}/complete`, Object.keys(body).length ? body : undefined);
    return response.data.data!;
  }

  async cancelRental(rentalId: string): Promise<Rental> {
    const response = await this.client.put<APIResponse<Rental>>(`/api/v1/rentals/${rentalId}/cancel`);
    return response.data.data!;
  }

  async cancelRentalWithReason(rentalId: string, reason: string): Promise<Rental> {
    const response = await this.client.put<APIResponse<Rental>>(`/api/v1/rentals/${rentalId}/cancel-with-reason`, { reason });
    return response.data.data!;
  }

  async changeRentalDates(rentalId: string, rentalDate: string, returnDate: string): Promise<Rental> {
    const response = await this.client.put<APIResponse<Rental>>(`/api/v1/rentals/${rentalId}/change-dates`, {
      rental_date: rentalDate,
      return_date: returnDate
    });
    return response.data.data!;
  }

  async getUserRentals(userId: string, params?: { page?: number; limit?: number }): Promise<RentalPaginatedResponse> {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) search.append(key, String(value));
      });
    }
    const response = await this.client.get<RentalPaginatedResponse>(`/api/v1/rentals/user/${userId}${search.toString() ? `?${search}` : ''}`);
    return response.data;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await this.client.get<APIResponse<{categories: BackendCategory[]}>>('/api/v1/categories');
    const categories = response.data.data?.categories || [];
    
    // Transform the response to match frontend expectations
    return this.transformCategoryTree(categories);
  }

  async getCategoryTree(): Promise<Category[]> {
    const response = await this.client.get<APIResponse<{categories: BackendCategory[]}>>('/api/v1/categories/tree');
    const categories = response.data.data?.categories || [];
    
    // Transform the response to match frontend expectations
    return this.transformCategoryTree(categories);
  }

  // Helper method to transform category tree structure
  private transformCategoryTree(categories: BackendCategory[]): Category[] {
    return categories.map((category: BackendCategory) => ({
      ...category,
      subcategories: category.children ? this.transformCategoryTree(category.children) : []
    }));
  }

  async createCategory(category: { name: string; description?: string; parent_id?: string }): Promise<Category> {
    const response = await this.client.post<APIResponse<{category: Category}>>('/api/v1/categories', category);
    return response.data.data!.category;
  }

  async getRootCategories(): Promise<Category[]> {
    const response = await this.client.get<APIResponse<{categories: BackendCategory[]}>>('/api/v1/categories/roots');
    const categories = response.data.data?.categories || [];
    return this.transformCategoryTree(categories);
  }

  async getCategory(categoryId: string): Promise<Category> {
    const response = await this.client.get<APIResponse<{category: Category}>>(`/api/v1/categories/${categoryId}`);
    return response.data.data!.category;
  }

  async getCategoryPath(categoryId: string): Promise<Category[]> {
    const response = await this.client.get<APIResponse<{path: Category[]}>>(`/api/v1/categories/${categoryId}/path`);
    return response.data.data!.path;
  }

  async getSubCategories(categoryId: string): Promise<Category[]> {
    const response = await this.client.get<APIResponse<{categories: BackendCategory[]}>>(`/api/v1/categories/${categoryId}/subcategories`);
    const categories = response.data.data?.categories || [];
    return this.transformCategoryTree(categories);
  }

  async updateCategory(categoryId: string, category: { name?: string; description?: string; parent_id?: string }): Promise<Category> {
    const response = await this.client.put<APIResponse<{category: Category}>>(`/api/v1/categories/${categoryId}`, category);
    return response.data.data!.category;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.client.delete(`/api/v1/categories/${categoryId}`);
  }

  // Package Pricing
  async getPackagePricing(): Promise<PackagePricing[]> {
    type BackendPackagePricing = {
      id: string;
      package_name?: string;
      name?: string;
      duration_hours: number;
      duration_days?: number;
      price: number;
      description?: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    const response = await this.client.get<APIResponse<BackendPackagePricing[] | { pricings: BackendPackagePricing[] }>>('/api/v1/package-pricing');
    const payload = response.data.data as BackendPackagePricing[] | { pricings?: BackendPackagePricing[] } | undefined;
    const normalize = (p: BackendPackagePricing): PackagePricing => ({
      id: p.id,
      package_name: p.package_name ?? p.name!,
      duration_hours: p.duration_hours,
      duration_days: p.duration_days || 0,
      price: p.price,
      description: p.description,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });
    if (!payload) return [];
    if (Array.isArray(payload)) return payload.map(normalize);
    return (payload.pricings || []).map(normalize);
  }

  async createPackagePricing(pricing: { package_name: string; duration_hours: number; price: number; description?: string }): Promise<PackagePricing> {
    const body = {
      package_name: pricing.package_name,
      duration_hours: pricing.duration_hours,
      price: pricing.price,
      description: pricing.description,
    };
    type BackendPackagePricing = {
      id: string; package_name?: string; name?: string; duration_hours: number; duration_days?: number; price: number; description?: string; is_active: boolean; created_at: string; updated_at: string;
    };
    const response = await this.client.post<APIResponse<BackendPackagePricing>>('/api/v1/package-pricing', body);
    const p = response.data.data!;
    return {
      id: p.id,
      package_name: p.package_name ?? p.name!,
      duration_hours: p.duration_hours,
      duration_days: p.duration_days || 0,
      price: p.price,
      description: p.description,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  async getPackagePricingById(pricingId: string): Promise<PackagePricing> {
    type BackendPackagePricing = {
      id: string; package_name?: string; name?: string; duration_hours: number; duration_days?: number; price: number; description?: string; is_active: boolean; created_at: string; updated_at: string;
    };
    const response = await this.client.get<APIResponse<BackendPackagePricing>>(`/api/v1/package-pricing/${pricingId}`);
    const p = response.data.data!;
    return {
      id: p.id,
      package_name: p.package_name ?? p.name!,
      duration_hours: p.duration_hours,
      duration_days: p.duration_days || 0,
      price: p.price,
      description: p.description,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  async updatePackagePricing(pricingId: string, pricing: { package_name?: string; duration_hours?: number; price?: number; description?: string }): Promise<PackagePricing> {
    const body = {
      package_name: pricing.package_name,
      duration_hours: pricing.duration_hours,
      price: pricing.price,
      description: pricing.description,
    };
    type BackendPackagePricing = {
      id: string; package_name?: string; name?: string; duration_hours: number; duration_days?: number; price: number; description?: string; is_active: boolean; created_at: string; updated_at: string;
    };
    const response = await this.client.put<APIResponse<BackendPackagePricing>>(`/api/v1/package-pricing/${pricingId}`, body);
    const p = response.data.data!;
    return {
      id: p.id,
      package_name: p.package_name ?? p.name!,
      duration_hours: p.duration_hours,
      duration_days: p.duration_days || 0,
      price: p.price,
      description: p.description,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  async deletePackagePricing(pricingId: string): Promise<void> {
    await this.client.delete(`/api/v1/package-pricing/${pricingId}`);
  }

  // Discounts
  async getDiscounts(): Promise<Discount[]> {
    const response = await this.client.get<APIResponse<Discount[]>>('/api/v1/discounts/');
    return response.data.data!;
  }

  async createDiscount(discount: Omit<Discount, 'id' | 'created_at' | 'updated_at' | 'used_count'>): Promise<Discount> {
    const response = await this.client.post<APIResponse<Discount>>('/api/v1/discounts/', discount);
    return response.data.data!;
  }

  async getDiscount(discountId: string): Promise<Discount> {
    const response = await this.client.get<APIResponse<Discount>>(`/api/v1/discounts/${discountId}`);
    return response.data.data!;
  }

  async updateDiscount(discountId: string, discount: Partial<Discount>): Promise<Discount> {
    const response = await this.client.put<APIResponse<Discount>>(`/api/v1/discounts/${discountId}`, discount);
    return response.data.data!;
  }

  async deleteDiscount(discountId: string): Promise<void> {
    await this.client.delete(`/api/v1/discounts/${discountId}`);
  }

  async getDiscountByCode(code: string): Promise<Discount> {
    const response = await this.client.get<APIResponse<Discount>>(`/api/v1/discounts/code/${code}`);
    return response.data.data!;
  }

  async validateDiscountCode(code: string, bookingId: string): Promise<Discount> {
    const response = await this.client.post<APIResponse<Discount>>('/api/v1/discounts/validate-code', { code, booking_id: bookingId });
    return response.data.data!;
  }

  async getActiveDiscounts(): Promise<Discount[]> {
    const response = await this.client.get<APIResponse<Discount[]>>('/api/v1/discounts/active');
    return response.data.data!;
  }

  async applyDiscountToBooking(discountId: string, bookingId: string): Promise<void> {
    await this.client.post('/api/v1/discounts/apply', {
      discount_id: discountId,
      booking_id: bookingId,
    });
  }

  async getDiscountApplications(discountId: string): Promise<DiscountApplication[]> {
    const response = await this.client.get<APIResponse<DiscountApplication[]>>(`/api/v1/discounts/${discountId}/applications`);
    return response.data.data!;
  }

  async getDiscountStats(discountId: string): Promise<DiscountStats> {
    const response = await this.client.get<APIResponse<DiscountStats>>(`/api/v1/discounts/${discountId}/stats`);
    return response.data.data!;
  }


  async getEligibleDiscountsForBooking(bookingId: string): Promise<Discount[]> {
    const response = await this.client.get<APIResponse<Discount[]>>(`/api/v1/discounts/booking/${bookingId}/eligible`);
    return response.data.data!;
  }

  async getBookingDiscountApplications(bookingId: string): Promise<DiscountApplication[]> {
    const response = await this.client.get<APIResponse<DiscountApplication[]>>(`/api/v1/discounts/booking/${bookingId}/applications`);
    return response.data.data!;
  }

  async removeDiscountFromBooking(bookingId: string, discountId: string): Promise<void> {
    await this.client.delete(`/api/v1/discounts/booking/${bookingId}/discount/${discountId}`);
  }

  async getPopularDiscounts(limit?: number): Promise<Discount[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await this.client.get<APIResponse<Discount[]>>(`/api/v1/discounts/popular${params}`);
    return response.data.data!;
  }

  async getExpiringDiscounts(days?: number): Promise<Discount[]> {
    const params = days ? `?days=${days}` : '';
    const response = await this.client.get<APIResponse<Discount[]>>(`/api/v1/discounts/expiring${params}`);
    return response.data.data!;
  }

  async getDiscountSummary(discountId: string): Promise<DiscountSummary> {
    const response = await this.client.get<APIResponse<DiscountSummary>>(`/api/v1/discounts/${discountId}/summary`);
    return response.data.data!;
  }

  async applyDiscountToBookingItem(discountId: string, bookingItemId: string): Promise<void> {
    await this.client.post('/api/v1/discounts/booking-item/apply', {
      discount_id: discountId,
      booking_item_id: bookingItemId,
    });
  }

  async removeDiscountFromBookingItem(bookingItemId: string, discountId: string): Promise<void> {
    await this.client.delete(`/api/v1/discounts/booking-item/${bookingItemId}/discount/${discountId}`);
  }

  async getEligibleDiscountsForItem(bookingItemId: string): Promise<Discount[]> {
    const response = await this.client.get<APIResponse<Discount[]>>(`/api/v1/discounts/item/${bookingItemId}/eligible`);
    return response.data.data!;
  }

  // Users (Admin)
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{ users: User[]; pagination: PaginationMeta }> {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) search.append(key, String(value));
      });
    }
    const response = await this.client.get<{ success: boolean; data: { data: { users: User[] }; pagination: PaginationMeta } }>(`/api/v1/users${search.toString() ? `?${search}` : ''}`);
    const data = response.data.data;
    return { users: data.data.users, pagination: data.pagination };
  }

  async createUser(user: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    role: 'admin' | 'staff' | 'customer';
    address: {
      street?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  }): Promise<User> {
    const response = await this.client.post<CreateResponse<User>>('/api/v1/users', user);
    return response.data.data;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const response = await this.client.put<APIResponse<User>>(`/api/v1/users/${userId}/role`, { role });
    return response.data.data!;
  }

  async activateUser(userId: string): Promise<User> {
    try {
      const response = await this.client.put<APIResponse<User>>(`/api/v1/admin/users/${userId}/activate`);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to activate user (admin access required):', error);
      throw error; // Re-throw for user management operations
    }
  }

  async deactivateUser(userId: string): Promise<User> {
    try {
      const response = await this.client.put<APIResponse<User>>(`/api/v1/admin/users/${userId}/deactivate`);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to deactivate user (admin access required):', error);
      throw error; // Re-throw for user management operations
    }
  }


  async getSuitsNeedingMaintenance(): Promise<MaintenanceItem[]> {
    try {
      const response = await this.client.get<APIResponse<MaintenanceItem[]>>('/api/v1/admin/suits/maintenance');
      return response.data.data!;
    } catch (error) {
      console.warn('Failed to fetch suits needing maintenance (admin access required):', error);
      return []; // Return empty array if user doesn't have admin access
    }
  }

  // Health Check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<import('@/types').DashboardStats> {
    try {
      // Aggregate data from existing endpoints
      const [itemsResponse, bookingsResponse, rentalsResponse] = await Promise.allSettled([
        this.client.get<ItemPaginatedResponse>('/api/v1/items?limit=1'),
        this.client.get<BookingPaginatedResponse>('/api/v1/bookings?limit=1'),
        this.client.get<RentalPaginatedResponse>('/api/v1/rentals')
      ]);

      // Calculate stats from responses
      const totalItems = itemsResponse.status === 'fulfilled' 
        ? itemsResponse.value.data.data?.pagination?.total || 0 
        : 0;

      const totalBookings = bookingsResponse.status === 'fulfilled' 
        ? bookingsResponse.value.data?.data?.pagination?.total || 0 
        : 0;

      const activeRentals = rentalsResponse.status === 'fulfilled' 
        ? (rentalsResponse.value.data?.data?.data?.rentals || []).filter((rental: Rental) => rental.status === 'active').length || 0 
        : 0;

      // Calculate today's revenue from bookings
      let todayRevenue = 0;
      if (bookingsResponse.status === 'fulfilled') {
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = bookingsResponse.value.data?.data?.data?.bookings?.filter((booking: Booking) => 
          booking.booking_date && booking.booking_date.startsWith(today) && booking.status === 'completed'
        ) || [];
        todayRevenue = todayBookings.reduce((sum: number, booking: Booking) => {
          const finalAmount = (booking.total_amount || 0) - (booking.discount_amount || 0);
          return sum + finalAmount;
        }, 0);
      }

      // Get low stock items (quantity <= 5)
      let lowStockItems = 0;
      if (itemsResponse.status === 'fulfilled') {
        const allItemsResponse = await this.client.get<ItemPaginatedResponse>('/api/v1/items?limit=1000');
        if (allItemsResponse.data?.success) {
          const items = allItemsResponse.data.data?.data?.items || [];
          lowStockItems = items.filter(item => item.quantity <= 5).length;
        }
      }

      // Get maintenance items
      let maintenanceItems = 0;
      if (itemsResponse.status === 'fulfilled') {
        const allItemsResponse = await this.client.get<ItemPaginatedResponse>('/api/v1/items?limit=1000');
        if (allItemsResponse.data?.success) {
          const items = allItemsResponse.data.data?.data?.items || [];
          maintenanceItems = items.filter(item => item.status === 'maintenance').length;
        }
      }

      return {
        totalItems,
        totalBookings,
        activeRentals,
        todayRevenue,
        lowStockItems,
        maintenanceItems,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Return zero values on error
      return {
        totalItems: 0,
        totalBookings: 0,
        activeRentals: 0,
        todayRevenue: 0,
        lowStockItems: 0,
        maintenanceItems: 0,
      };
    }
  }
}

export const apiClient = new APIClient();
export default apiClient;