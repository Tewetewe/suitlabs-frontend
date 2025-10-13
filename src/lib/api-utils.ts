import { 
  APIResponse, 
  PaginatedResponse, 
  CreateResponse, 
  UpdateResponse, 
  DeleteResponse, 
  APIError as APIErrorType 
} from '@/types';

/**
 * API Response Utilities
 * Provides consistent handling and validation of API responses
 */

export class APIResponseHandler {
  /**
   * Validates and extracts data from a standard API response
   */
  static extractData<T>(response: APIResponse<T>): T {
    if (!response.success) {
      throw new APIError(response.error || { code: 'UNKNOWN_ERROR', message: 'Request failed' });
    }
    
    if (response.data === undefined) {
      throw new APIError({ code: 'NO_DATA', message: 'No data returned from API' });
    }
    
    return response.data;
  }

  /**
   * Validates and extracts data from a paginated response
   */
  static extractPaginatedData<T>(response: PaginatedResponse<T>): { data: T[]; pagination: PaginatedResponse<T>['pagination'] } {
    if (!response.success) {
      throw new APIError(response.error || { code: 'UNKNOWN_ERROR', message: 'Request failed' });
    }
    
    return {
      data: response.data,
      pagination: response.pagination
    };
  }

  /**
   * Validates and extracts data from a create response
   */
  static extractCreateData<T>(response: CreateResponse<T>): T {
    if (!response.success) {
      throw new APIError(response.error || { code: 'UNKNOWN_ERROR', message: 'Create request failed' });
    }
    
    if (response.data === undefined) {
      throw new APIError({ code: 'NO_DATA', message: 'No data returned from create request' });
    }
    
    return response.data;
  }

  /**
   * Validates and extracts data from an update response
   */
  static extractUpdateData<T>(response: UpdateResponse<T>): T {
    if (!response.success) {
      throw new APIError(response.error || { code: 'UNKNOWN_ERROR', message: 'Update request failed' });
    }
    
    if (response.data === undefined) {
      throw new APIError({ code: 'NO_DATA', message: 'No data returned from update request' });
    }
    
    return response.data;
  }

  /**
   * Validates a delete response
   */
  static validateDeleteResponse(response: DeleteResponse): void {
    if (!response.success) {
      throw new APIError(response.error || { code: 'UNKNOWN_ERROR', message: 'Delete request failed' });
    }
  }

  /**
   * Checks if a response is successful
   */
  static isSuccess<T>(response: APIResponse<T> | PaginatedResponse<T> | CreateResponse<T> | UpdateResponse<T> | DeleteResponse): boolean {
    return response.success === true;
  }

  /**
   * Extracts error information from a response
   */
  static extractError<T>(response: APIResponse<T> | PaginatedResponse<T> | CreateResponse<T> | UpdateResponse<T> | DeleteResponse): APIErrorType | null {
    return response.error || null;
  }

  /**
   * Extracts message from a response
   */
  static extractMessage<T>(response: APIResponse<T> | PaginatedResponse<T> | CreateResponse<T> | UpdateResponse<T> | DeleteResponse): string | null {
    return response.message || null;
  }
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly field?: string;

  constructor(error: APIErrorType) {
    super(error.message);
    this.name = 'APIError';
    this.code = error.code;
    this.details = error.details;
    this.field = error.field;
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.code.startsWith('VALIDATION_') || this.code === 'INVALID_INPUT';
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'INVALID_TOKEN' || this.code === 'TOKEN_EXPIRED';
  }

  /**
   * Check if this is a not found error
   */
  isNotFoundError(): boolean {
    return this.code === 'NOT_FOUND' || this.code === 'RESOURCE_NOT_FOUND';
  }

  /**
   * Check if this is a server error
   */
  isServerError(): boolean {
    return this.code.startsWith('SERVER_') || this.code === 'INTERNAL_ERROR';
  }
}

/**
 * Response interceptor for axios to handle API responses consistently
 */
export const responseInterceptor = {
  onFulfilled: (response: { config: { method?: string; url?: string }; data: unknown }) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response [${response.config.method?.toUpperCase()} ${response.config.url}]:`, response.data);
    }
    return response;
  },
  
  onRejected: (error: { response?: { data?: unknown; status?: number }; code?: string }) => {
    // Handle API errors consistently
    if (error.response?.data) {
      const apiError = error.response.data as Record<string, unknown>;
      
      if (apiError.error && typeof apiError.error === 'object') {
        throw new APIError(apiError.error as APIErrorType);
      }
      
      if (typeof apiError.message === 'string') {
        throw new APIError({ code: 'API_ERROR', message: apiError.message });
      }
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      throw new APIError({ 
        code: 'NETWORK_ERROR', 
        message: 'Network error. Please check your connection.' 
      });
    }
    
    // Handle HTTP status errors
    const status = error.response?.status;
    switch (status) {
      case 400:
        throw new APIError({ code: 'BAD_REQUEST', message: 'Invalid request' });
      case 401:
        throw new APIError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      case 403:
        throw new APIError({ code: 'FORBIDDEN', message: 'Access denied' });
      case 404:
        throw new APIError({ code: 'NOT_FOUND', message: 'Resource not found' });
      case 422:
        throw new APIError({ code: 'VALIDATION_ERROR', message: 'Validation failed' });
      case 500:
        throw new APIError({ code: 'SERVER_ERROR', message: 'Internal server error' });
      default:
        throw new APIError({ 
          code: 'UNKNOWN_ERROR', 
          message: `Request failed with status ${status}` 
        });
    }
  }
};

/**
 * Utility function to create query parameters from filters
 */
export function createQueryParams(filters: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, item.toString()));
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  return params;
}

/**
 * Utility function to format API errors for display
 */
export function formatAPIError(error: APIError): string {
  if (error.field) {
    return `${error.field}: ${error.message}`;
  }
  return error.message;
}

/**
 * Utility function to check if an error is retryable
 */
export function isRetryableError(error: APIError): boolean {
  const retryableCodes = [
    'NETWORK_ERROR',
    'SERVER_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_EXCEEDED'
  ];
  
  return retryableCodes.includes(error.code);
}
