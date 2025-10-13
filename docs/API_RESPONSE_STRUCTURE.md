# API Response Structure Documentation

This document outlines the standardized API response structure implemented in the SuitLabs frontend application.

## Overview

The API response structure has been standardized to provide consistent error handling, pagination, and data formatting across all endpoints. This improves maintainability, debugging, and user experience.

## Response Types

### 1. Standard API Response

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: APIError;
  meta?: ResponseMeta;
}
```

**Usage**: Single resource endpoints (GET by ID, POST, PUT, DELETE)

**Example**:
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Sample Item",
    "status": "active"
  },
  "message": "Item retrieved successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

### 2. Paginated Response

```typescript
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
  error?: APIError;
  meta?: ResponseMeta;
}
```

**Usage**: List endpoints with pagination (GET collections)

**Example**:
```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  },
  "message": "Items retrieved successfully"
}
```

### 3. Create Response

```typescript
interface CreateResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: APIError;
  meta?: ResponseMeta;
}
```

**Usage**: POST endpoints for creating new resources

**Example**:
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "New Item",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Item created successfully"
}
```

### 4. Update Response

```typescript
interface UpdateResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: APIError;
  meta?: ResponseMeta;
}
```

**Usage**: PUT/PATCH endpoints for updating resources

**Example**:
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Updated Item",
    "updated_at": "2024-01-15T10:35:00Z"
  },
  "message": "Item updated successfully"
}
```

### 5. Delete Response

```typescript
interface DeleteResponse {
  success: boolean;
  message: string;
  error?: APIError;
  meta?: ResponseMeta;
}
```

**Usage**: DELETE endpoints

**Example**:
```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

### 6. Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: APIError;
  message?: string;
  meta?: ResponseMeta;
}
```

**Usage**: All endpoints when errors occur

**Example**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "field": "email",
    "details": {
      "expected": "valid email format"
    }
  },
  "message": "Request validation failed"
}
```

## Supporting Types

### APIError

```typescript
interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}
```

**Common Error Codes**:
- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `SERVER_ERROR`: Internal server error
- `NETWORK_ERROR`: Network connectivity issue

### ResponseMeta

```typescript
interface ResponseMeta {
  timestamp: string;
  request_id?: string;
  version?: string;
}
```

### PaginationMeta

```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}
```

## Usage in API Client

### Before (Inconsistent)

```typescript
// Different response structures across endpoints
const customers = await apiClient.getCustomers(); // { customers: [], total: number }
const items = await apiClient.getItems(); // { items: [], total: number }
const customer = await apiClient.createCustomer(data); // { customer: Customer, message: string }
```

### After (Standardized)

```typescript
// Consistent response structures
const customers = await apiClient.getCustomers(); // PaginatedResponse<Customer>
const items = await apiClient.getItems(); // PaginatedResponse<Item>
const customer = await apiClient.createCustomer(data); // Customer (extracted from CreateResponse)
```

## Error Handling

### Using APIResponseHandler

```typescript
import { APIResponseHandler, APIError } from '@/lib/api-utils';

try {
  const response = await apiClient.getItems();
  const { data, pagination } = APIResponseHandler.extractPaginatedData(response);
  // Use data and pagination
} catch (error) {
  if (error instanceof APIError) {
    if (error.isValidationError()) {
      // Handle validation errors
    } else if (error.isAuthError()) {
      // Handle authentication errors
    }
  }
}
```

### Custom Error Class

```typescript
const error = new APIError({
  code: 'VALIDATION_ERROR',
  message: 'Invalid email format',
  field: 'email'
});

console.log(error.isValidationError()); // true
console.log(error.isAuthError()); // false
```

## Benefits

1. **Consistency**: All API responses follow the same structure
2. **Type Safety**: Full TypeScript support with proper typing
3. **Error Handling**: Standardized error codes and messages
4. **Pagination**: Built-in pagination support for list endpoints
5. **Debugging**: Request IDs and timestamps for better debugging
6. **Maintainability**: Easier to maintain and extend

## Migration Guide

### For Existing Code

1. Update imports to include new response types
2. Replace manual response handling with `APIResponseHandler` utilities
3. Update pagination logic to use `pagination` object instead of `total`
4. Handle errors using the new `APIError` class

### Example Migration

```typescript
// Before
const response = await apiClient.getCustomers();
const customers = response.customers;
const total = response.total;

// After
const response = await apiClient.getCustomers();
const { data: customers, pagination } = APIResponseHandler.extractPaginatedData(response);
const total = pagination.total;
```

## Best Practices

1. Always use the appropriate response type for each endpoint
2. Handle errors consistently using `APIError` class
3. Use `APIResponseHandler` utilities for data extraction
4. Include proper error messages and codes in backend responses
5. Use pagination for all list endpoints
6. Include metadata (timestamps, request IDs) for debugging

## Future Enhancements

- Rate limiting information in response metadata
- Caching headers in response metadata
- Request/response logging utilities
- Retry logic for retryable errors
- Response compression indicators
