# KasirKu - API Documentation

## 🔌 API Overview

KasirKu uses a RESTful API architecture built on Next.js API Routes with Supabase (PostgreSQL) as the backend database. All API endpoints follow REST conventions and return JSON responses.

### Base URL
```
http://localhost:3000/api (development)
https://your-domain.com/api (production)
```

### Authentication
Most endpoints require authentication via JWT tokens or session cookies. Authentication is handled through the custom auth system.

### Response Format
```json
{
  "data": [...],
  "error": null,
  "message": "Success"
}
```

### Error Response Format
```json
{
  "data": null,
  "error": "Error message",
  "message": "Operation failed"
}
```

## 🔐 Authentication API

### POST /api/auth/login
Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "admin",
    "cafe_id": 1
  },
  "token": "jwt-token-here"
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

---

### POST /api/auth/google
Authenticate or create user via Google OAuth.

**Request:**
```json
{
  "id_token": "google-oauth-token",
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "admin"
  },
  "token": "jwt-token-here"
}
```

---

### POST /api/auth/signup
Register new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "admin"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "admin",
    "is_approved": false
  }
}
```

---

### POST /api/auth/logout
Logout user and invalidate session.

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 📋 Menu API

### GET /api/rest/menu
Get all menu items for a cafe.

**Query Parameters:**
- `cafe_id` (required): Cafe ID
- `updated_after` (optional): ISO date string for sync

**Request:**
```
GET /api/rest/menu?cafe_id=1&updated_after=2024-01-01T00:00:00Z
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "menu-123",
      "cafe_id": 1,
      "name": "Nasi Goreng",
      "category": "Makanan",
      "category_id": "cat-123",
      "price": 25000,
      "hpp_price": 15000,
      "stock_quantity": 50,
      "min_stock": 5,
      "track_stock": true,
      "has_variants": false,
      "available": true,
      "image_url": "https://example.com/image.jpg",
      "created_at": "2024-01-01T00:00:00+07:00",
      "updated_at": "2024-01-01T00:00:00+07:00",
      "version": 1
    }
  ],
  "meta": {
    "total": 1,
    "offset": 0,
    "limit": 50
  }
}
```

---

### POST /api/rest/menu
Create new menu item.

**Request:**
```json
{
  "cafe_id": 1,
  "name": "Nasi Goreng",
  "category": "Makanan",
  "category_id": "cat-123",
  "price": 25000,
  "hpp_price": 15000,
  "stock_quantity": 50,
  "min_stock": 5,
  "track_stock": true,
  "image_url": "https://example.com/image.jpg"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "menu-123",
    "name": "Nasi Goreng",
    "price": 25000,
    ...
  }
}
```

---

### PUT /api/rest/menu/[id]
Update existing menu item.

**Request:**
```json
{
  "name": "Nasi Goreng Spesial",
  "price": 30000,
  "stock_quantity": 45
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "menu-123",
    "name": "Nasi Goreng Spesial",
    "price": 30000,
    ...
  }
}
```

---

### DELETE /api/rest/menu/[id]
Delete menu item (soft delete).

**Response (200 OK):**
```json
{
  "message": "Menu item deleted successfully"
}
```

---

## 🛒 Transactions API

### GET /api/rest/transactions
Get transactions for a cafe.

**Query Parameters:**
- `cafe_id` (required): Cafe ID
- `limit` (optional): Number of results (default: 10)
- `offset` (optional): Pagination offset (default: 0)
- `created_at_gte` (optional): Filter by date (greater than or equal)
- `created_at_lt` (optional): Filter by date (less than)

**Request:**
```
GET /api/rest/transactions?cafe_id=1&limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "tx-123",
      "transaction_number": "TXN-2024-001",
      "cafe_id": 1,
      "subtotal": 50000,
      "tax_amount": 5000,
      "service_charge": 2500,
      "total_amount": 57500,
      "payment_method": "Tunai",
      "payment_amount": 60000,
      "change_amount": 2500,
      "order_note": "Extra pedas",
      "created_at": "2024-01-01T12:00:00+07:00",
      "updated_at": "2024-01-01T12:00:00+07:00",
      "created_by": "user-123",
      "cashier_name": "John Doe",
      "items": [
        {
          "id": "item-123",
          "menu_id": "menu-123",
          "menu_name": "Nasi Goreng",
          "price": 25000,
          "quantity": 2,
          "discount": 0,
          "note": null
        }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "offset": 0,
    "limit": 10
  }
}
```

---

### POST /api/rest/transactions
Create new transaction.

**Request:**
```json
{
  "cafe_id": 1,
  "transaction_number": "TXN-2024-002",
  "subtotal": 50000,
  "tax_amount": 5000,
  "service_charge": 2500,
  "total_amount": 57500,
  "payment_method": "Tunai",
  "payment_amount": 60000,
  "change_amount": 2500,
  "order_note": "Extra pedas",
  "created_by": "user-123",
  "items": [
    {
      "menu_id": "menu-123",
      "menu_name": "Nasi Goreng",
      "price": 25000,
      "quantity": 2,
      "discount": 0
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "tx-456",
    "transaction_number": "TXN-2024-002",
    "total_amount": 57500,
    ...
  }
}
```

---

### GET /api/rest/transactions/[id]
Get specific transaction details.

**Response (200 OK):**
```json
{
  "data": {
    "id": "tx-123",
    "transaction_number": "TXN-2024-001",
    ...
  }
}
```

---

## 📦 Product Variants API

### GET /api/rest/product_variants
Get product variants for a menu item.

**Query Parameters:**
- `menu_id` (optional): Filter by menu item
- `cafe_id` (optional): Filter by cafe

**Request:**
```
GET /api/rest/product_variants?menu_id=menu-123
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "variant-123",
      "menu_id": "menu-123",
      "sku": "NASI-S",
      "barcode": "8991234567890",
      "variant_name": "Small",
      "price": 20000,
      "hpp_price": 12000,
      "stock_quantity": 20,
      "min_stock": 5,
      "track_stock": true,
      "is_active": true
    }
  ]
}
```

---

### POST /api/rest/product_variants
Create new product variant.

**Request:**
```json
{
  "menu_id": "menu-123",
  "sku": "NASI-M",
  "barcode": "8991234567891",
  "variant_name": "Medium",
  "price": 25000,
  "hpp_price": 15000,
  "stock_quantity": 30,
  "min_stock": 5,
  "track_stock": true
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "variant-456",
    "variant_name": "Medium",
    ...
  }
}
```

---

### PUT /api/rest/product_variants/[id]
Update product variant.

**Request:**
```json
{
  "price": 26000,
  "stock_quantity": 25
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "variant-456",
    "price": 26000,
    ...
  }
}
```

---

## 🏪 Categories API

### GET /api/categories
Get categories for a cafe.

**Query Parameters:**
- `cafeId` (required): Cafe ID

**Request:**
```
GET /api/categories?cafeId=1
```

**Response (200 OK):**
```json
{
  "categories": [
    {
      "id": "cat-123",
      "cafe_id": 1,
      "name": "Makanan",
      "icon": "utensils",
      "color": "#FF6B6B",
      "sort_order": 1,
      "is_active": true
    },
    {
      "id": "cat-456",
      "cafe_id": 1,
      "name": "Minuman",
      "icon": "coffee",
      "color": "#4ECDC4",
      "sort_order": 2,
      "is_active": true
    }
  ]
}
```

---

### POST /api/categories
Create new category.

**Request:**
```json
{
  "cafe_id": 1,
  "name": "Snack",
  "icon": "cookie",
  "color": "#95E1D3",
  "sort_order": 3
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "cat-789",
    "name": "Snack",
    ...
  }
}
```

---

## 💰 Cafe Settings API

### GET /api/cafe_settings
Get cafe settings.

**Query Parameters:**
- `cafe_id` (optional): Cafe ID

**Request:**
```
GET /api/cafe_settings?cafe_id=1
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "cafe_id": 1,
    "name": "Warung Makan Sederhana",
    "address": "Jl. Contoh No. 123",
    "phone": "08123456789",
    "logo_url": "https://example.com/logo.png",
    "tax_percent": 10.0,
    "service_percent": 5.0,
    "currency": "IDR",
    "enable_push_notifications": true
  }
]
```

---

### PUT /api/cafe_settings/[id]
Update cafe settings.

**Request:**
```json
{
  "name": "Warung Makan Baru",
  "tax_percent": 11.0,
  "service_percent": 0.0
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": 1,
    "name": "Warung Makan Baru",
    ...
  }
}
```

---

## 📦 Stock API

### POST /api/stock/mutations
Create stock mutation (restock, adjustment, opname).

**Request:**
```json
{
  "menu_id": "menu-123",
  "cafe_id": 1,
  "type": "in",
  "quantity": 50,
  "hpp_price": 15000,
  "reference_type": "purchase",
  "reference_id": "purchase-123",
  "notes": "Restock bulanan",
  "created_by": "user-123",
  "variant_id": null
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "mutation-123",
    "menu_id": "menu-123",
    "quantity": 50,
    "type": "in",
    ...
  },
  "updated_stock": 100
}
```

---

### GET /api/stock/mutations
Get stock mutations history.

**Query Parameters:**
- `menu_id` (optional): Filter by menu item
- `cafe_id` (optional): Filter by cafe
- `type` (optional): Filter by mutation type
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Request:**
```
GET /api/stock/mutations?menu_id=menu-123&type=in&limit=20
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "mutation-123",
      "menu_id": "menu-123",
      "cafe_id": 1,
      "type": "in",
      "quantity": 50,
      "hpp_price": 15000,
      "reference_type": "purchase",
      "reference_id": "purchase-123",
      "notes": "Restock bulanan",
      "created_by": "user-123",
      "created_by_name": "John Doe",
      "created_at": "2024-01-01T10:00:00+07:00"
    }
  ]
}
```

---

## 👥 Users API

### GET /api/rest/users
Get users for a cafe.

**Query Parameters:**
- `cafe_id` (optional): Filter by cafe

**Request:**
```
GET /api/rest/users?cafe_id=1
```

**Response (200 OK):**
```json
[
  {
    "id": "user-123",
    "email": "admin@example.com",
    "full_name": "John Doe",
    "role": "admin",
    "cafe_id": 1,
    "is_approved": true,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00+07:00"
  },
  {
    "id": "user-456",
    "email": "cashier@example.com",
    "full_name": "Jane Smith",
    "role": "cashier",
    "cafe_id": 1,
    "is_approved": true,
    "is_active": true,
    "created_at": "2024-01-02T00:00:00+07:00"
  }
]
```

---

### POST /api/create-cashier
Create new cashier account.

**Request:**
```json
{
  "email": "newcashier@example.com",
  "password": "password123",
  "full_name": "New Cashier",
  "cafe_id": 1
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "user-789",
    "email": "newcashier@example.com",
    "full_name": "New Cashier",
    "role": "cashier",
    "cafe_id": 1,
    "is_approved": true
  }
}
```

---

## 📤 Transaction Items API

### GET /api/rest/transaction_items
Get transaction items.

**Query Parameters:**
- `transaction_id` (optional): Filter by transaction

**Request:**
```
GET /api/rest/transaction_items?transaction_id=tx-123
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "item-123",
      "transaction_id": "tx-123",
      "menu_id": "menu-123",
      "menu_name": "Nasi Goreng",
      "price": 25000,
      "quantity": 2,
      "discount": 0,
      "note": null,
      "variant_id": null,
      "variant_name": null
    }
  ]
}
```

---

## 🔔 Push Notifications API

### POST /api/push-subscriptions
Register push notification subscription.

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "p256dh_key": "base64-encoded-key",
  "auth_key": "base64-encoded-key",
  "user_id": "user-123",
  "cafe_id": 1
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": 1,
    "endpoint": "https://fcm.googleapis.com/...",
    "user_id": "user-123"
  }
}
```

---

### DELETE /api/push-subscriptions/[id]
Unsubscribe from push notifications.

**Response (200 OK):**
```json
{
  "message": "Unsubscribed successfully"
}
```

---

## 🔄 Sync API

### GET /api/sync-profile
Get sync profile for client.

**Query Parameters:**
- `cafe_id` (required): Cafe ID

**Response (200 OK):**
```json
{
  "menu": {
    "last_sync": "2024-01-01T12:00:00+07:00",
    "version": 5
  },
  "categories": {
    "last_sync": "2024-01-01T12:00:00+07:00",
    "version": 3
  },
  "transactions": {
    "last_sync": "2024-01-01T12:00:00+07:00",
    "version": 10
  }
}
```

---

## 📤 Upload API

### POST /api/upload
Upload file to Supabase Storage.

**Request:** (multipart/form-data)
```
file: [binary data]
type: "menu" | "logo" | "receipt"
```

**Response (200 OK):**
```json
{
  "url": "https://supabase-storage-url.com/file.jpg",
  "path": "uploads/menu/file.jpg"
}
```

---

## 🔧 Variant Attributes API

### GET /api/rest/variant_attributes
Get variant attributes for a cafe.

**Query Parameters:**
- `cafe_id` (required): Cafe ID

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "attr-123",
      "cafe_id": 1,
      "name": "Size",
      "type": "select",
      "is_active": true
    },
    {
      "id": "attr-456",
      "cafe_id": 1,
      "name": "Color",
      "type": "select",
      "is_active": true
    }
  ]
}
```

---

### POST /api/rest/variant_attributes
Create variant attribute.

**Request:**
```json
{
  "cafe_id": 1,
  "name": "Size",
  "type": "select"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "attr-789",
    "name": "Size",
    ...
  }
}
```

---

## 📊 Variant Attribute Values API

### GET /api/rest/variant_attribute_values
Get values for variant attributes.

**Query Parameters:**
- `attribute_id` (required): Attribute ID

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "val-123",
      "attribute_id": "attr-123",
      "value": "Small",
      "is_active": true
    },
    {
      "id": "val-456",
      "attribute_id": "attr-123",
      "value": "Medium",
      "is_active": true
    }
  ]
}
```

---

### POST /api/rest/variant_attribute_values
Create attribute value.

**Request:**
```json
{
  "attribute_id": "attr-123",
  "value": "Large"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "val-789",
    "value": "Large",
    ...
  }
}
```

---

## 🔧 Variant Attribute Mappings API

### GET /api/rest/variant_attribute_mappings
Get attribute mappings for variants.

**Query Parameters:**
- `variant_id` (optional): Filter by variant

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "map-123",
      "variant_id": "variant-123",
      "attribute_value_id": "val-123"
    }
  ]
}
```

---

## 📊 Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 400  | Bad Request - Invalid input data |
| 401  | Unauthorized - Authentication required or failed |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource already exists or version conflict |
| 500  | Internal Server Error - Server error |

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `INVALID_CREDENTIALS` | Invalid email or password |
| `USER_NOT_FOUND` | User not found |
| `PERMISSION_DENIED` | Insufficient permissions |
| `INVALID_INPUT` | Invalid input data |
| `RESOURCE_NOT_FOUND` | Resource not found |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `VERSION_CONFLICT` | Version conflict (sync error) |
| `STOCK_INSUFFICIENT` | Insufficient stock |
| `DATABASE_ERROR` | Database operation failed |

---

## 🔒 Security

### Authentication
- JWT tokens for API authentication
- Session-based authentication for web
- Token expiration and refresh

### Authorization
- Role-based access control (RBAC)
- Cafe-based data isolation
- User permission checks

### Rate Limiting
- API rate limiting per user
- DDoS protection (via Vercel)

### Data Validation
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)

---

## 📈 Rate Limiting

### Default Limits
- **Anonymous**: 100 requests per hour
- **Authenticated**: 1000 requests per hour
- **Admin**: 5000 requests per hour

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1609459200
```

---

## 🔄 Caching

### Response Caching
- Static data cached for 5 minutes
- Menu data cached for 1 minute
- Transaction data not cached (real-time)

### Cache Headers
```
Cache-Control: max-age=300, stale-while-revalidate=600
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
```

---

## 🧪 Testing

### API Testing Examples

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get menu
curl http://localhost:3000/api/rest/menu?cafe_id=1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create transaction
curl -X POST http://localhost:3000/api/rest/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"cafe_id":1,"total_amount":50000,...}'
```

---

## 📝 Best Practices

### Client-Side
- Use SWR for data fetching and caching
- Implement optimistic updates for better UX
- Handle errors gracefully with user feedback
- Implement retry logic with exponential backoff

### Server-Side
- Validate all input data
- Use parameterized queries to prevent SQL injection
- Implement proper error handling and logging
- Use database transactions for multi-step operations

### Security
- Never expose sensitive data in API responses
- Implement proper authentication and authorization
- Use HTTPS in production
- Validate and sanitize all input data

---

## 🎯 Conclusion

The KasirKu API provides a comprehensive RESTful interface for all POS operations. The API is designed for performance, security, and ease of use. All endpoints follow REST conventions and provide consistent response formats. The authentication and authorization systems ensure secure access to cafe-specific data, while the caching and rate limiting strategies ensure optimal performance.
