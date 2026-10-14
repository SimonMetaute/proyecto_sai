# API REST Endpoints Specification & Contracts - NexusMarket

## 1. Overview

This document defines all REST API endpoints organized by role. Each endpoint specifies:
- HTTP method and path
- Required authentication and role
- Request body structure (if applicable)
- Response body structure
- Expected HTTP status codes
- Domain model contracts (not DTOs)

All endpoints follow the **hexagonal architecture pattern**, receiving and returning domain models through role-based Input Ports. Request/response DTOs are mapped at the adapter layer.

---

## 2. Global Headers & Security Conventions

### Standard Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Accept: application/json
X-Request-ID: <correlation-id>  (optional, logged for tracing)
```

### JWT Token Payload
```json
{
  "userId": "user-001",
  "username": "john.doe",
  "email": "john@example.com",
  "role": "BUYER|SELLER|LOGISTICS_OPERATOR|ADMINISTRATOR|SUPERVISOR",
  "identification": "1234567890",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Authentication
- All endpoints except Public Access require a valid JWT token.
- Missing or invalid tokens return `401 AUTHENTICATION_REQUIRED`.
- Valid token but insufficient role returns `403 FORBIDDEN`.

---

## 3. Public Access Endpoints (`PublicAccessPort`)

### 3.1. Authentication (Login)
**POST** `/api/v1/auth/login`

**Authentication:** None (Public)

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secure_password"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "user-001",
    "email": "john@example.com",
    "role": "BUYER",
    "username": "john.doe"
  },
  "expiresIn": 3600
}
```

**Error Responses:**
- `400 INVALID_REQUEST` - Missing email or password
- `401 INVALID_CREDENTIALS` - Email/password mismatch

---

### 3.2. Logout
**POST** `/api/v1/auth/logout`

**Authentication:** Required (any role)

**Request Body:** Empty

**Response (204 No Content):** Successful logout, token invalidated

**Error Responses:**
- `401 AUTHENTICATION_REQUIRED` - Missing token
- `500 INTERNAL_ERROR` - Session cleanup failed

---

### 3.3. Self-Register Buyer
**POST** `/api/v1/auth/register/buyer`

**Authentication:** None (Public)

**Request Body:**
```json
{
  "email": "newbuyer@example.com",
  "password": "secure_password",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "identification": "1234567890"
}
```

**Response (201 Created):**
```json
{
  "userId": "user-001",
  "email": "newbuyer@example.com",
  "role": "BUYER",
  "status": "ACTIVE",
  "message": "Buyer registered successfully"
}
```

**Error Responses:**
- `400 INVALID_REQUEST` - Missing required fields
- `409 RESOURCE_ALREADY_EXISTS` - Email already registered
- `422 INVALID_DOMAIN_VALUE` - Invalid email format or weak password

---

### 3.4. Self-Register Seller
**POST** `/api/v1/auth/register/seller`

**Authentication:** None (Public)

**Request Body:**
```json
{
  "email": "newseller@example.com",
  "password": "secure_password",
  "businessName": "My Store",
  "identification": "1234567890",
  "personType": "NATURAL_PERSON|LEGAL_PERSON",
  "phoneNumber": "+1234567890"
}
```

**Response (201 Created):**
```json
{
  "userId": "user-002",
  "email": "newseller@example.com",
  "role": "SELLER",
  "sellerId": "seller-001",
  "verificationStatus": "PENDING",
  "message": "Seller registered. Awaiting identity verification."
}
```

**Error Responses:**
- `400 INVALID_REQUEST` - Missing required fields
- `409 RESOURCE_ALREADY_EXISTS` - Email already registered
- `422 INVALID_DOMAIN_VALUE` - Invalid identification or business name

---

### 3.5. Search Public Catalog
**GET** `/api/v1/catalog/products?category=&search=&minPrice=&maxPrice=&page=1&limit=20`

**Authentication:** None (Public)

**Query Parameters:**
- `category` (optional): Product category
- `search` (optional): Full-text search
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `page` (optional, default 1): Page number
- `limit` (optional, default 20): Items per page

**Response (200 OK):**
```json
{
  "total": 150,
  "page": 1,
  "limit": 20,
  "products": [
    {
      "productId": "prod-001",
      "name": "Laptop Pro",
      "description": "High-performance laptop",
      "category": "Electronics",
      "price": 999.99,
      "currency": "USD",
      "seller": {
        "sellerId": "seller-001",
        "businessName": "Tech Store"
      },
      "status": "PUBLISHED",
      "rating": 4.5,
      "reviewCount": 120
    }
  ]
}
```

**Error Responses:**
- `400 INVALID_REQUEST` - Invalid pagination or filter parameters

---

### 3.6. Consult Public Product Details
**GET** `/api/v1/catalog/products/{productId}`

**Authentication:** None (Public)

**Response (200 OK):**
```json
{
  "productId": "prod-001",
  "name": "Laptop Pro",
  "description": "High-performance laptop with 16GB RAM",
  "category": "Electronics",
  "price": 999.99,
  "currency": "USD",
  "seller": {
    "sellerId": "seller-001",
    "businessName": "Tech Store",
    "rating": 4.8,
    "reviewCount": 250
  },
  "status": "PUBLISHED",
  "variants": [
    {
      "variantId": "var-001",
      "attributes": { "color": "Silver", "storage": "512GB" },
      "price": 1099.99,
      "stock": 15
    }
  ],
  "images": ["https://..."],
  "rating": 4.5,
  "reviewCount": 120
}
```

**Error Responses:**
- `404 RESOURCE_NOT_FOUND` - Product does not exist or is not published

---

## 4. Buyer Endpoints (`BuyerPort`)

### 4.1. Consult My Profile
**GET** `/api/v1/buyer/profile`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "buyerId": "buyer-001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "trustLevel": "VERIFIED",
  "totalOrders": 25,
  "totalSpent": 5000.00,
  "joinedDate": "2024-01-15T10:30:00Z",
  "status": "ACTIVE"
}
```

---

### 4.2. Update My Profile
**PUT** `/api/v1/buyer/profile`

**Authentication:** Required (BUYER)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "updatedFields": ["phoneNumber"]
}
```

**Error Responses:**
- `400 INVALID_REQUEST` - Invalid data format
- `409 RESOURCE_ALREADY_EXISTS` - Phone number already in use

---

### 4.3. Consult My Delivery Addresses
**GET** `/api/v1/buyer/addresses`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "addresses": [
    {
      "addressId": "addr-001",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA",
      "isPrimary": true,
      "isVerified": true
    }
  ]
}
```

---

### 4.4. Add Delivery Address
**POST** `/api/v1/buyer/addresses`

**Authentication:** Required (BUYER)

**Request Body:**
```json
{
  "street": "456 Oak Ave",
  "city": "Los Angeles",
  "state": "CA",
  "zipCode": "90001",
  "country": "USA",
  "isPrimary": false
}
```

**Response (201 Created):**
```json
{
  "addressId": "addr-002",
  "street": "456 Oak Ave",
  "city": "Los Angeles",
  "state": "CA",
  "zipCode": "90001",
  "country": "USA",
  "isVerified": false,
  "message": "Address added. Verification pending."
}
```

---

### 4.5. Set Primary Delivery Address
**PUT** `/api/v1/buyer/addresses/{addressId}/set-primary`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "message": "Primary address updated",
  "addressId": "addr-001"
}
```

---

### 4.6. Remove Delivery Address
**DELETE** `/api/v1/buyer/addresses/{addressId}`

**Authentication:** Required (BUYER)

**Response (204 No Content)**

**Error Responses:**
- `404 RESOURCE_NOT_FOUND` - Address not found
- `409 RESOURCE_ALREADY_EXISTS` - Cannot delete primary address if no alternative exists

---

### 4.7. Consult My Payment Methods
**GET** `/api/v1/buyer/payment-methods`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "paymentMethods": [
    {
      "methodId": "pm-001",
      "type": "CREDIT_CARD",
      "lastFourDigits": "4242",
      "expiryMonth": 12,
      "expiryYear": 2026,
      "isDefault": true
    }
  ]
}
```

---

### 4.8. Add Payment Method
**POST** `/api/v1/buyer/payment-methods`

**Authentication:** Required (BUYER)

**Request Body:**
```json
{
  "type": "CREDIT_CARD",
  "cardNumber": "4111111111111111",
  "expiryMonth": 12,
  "expiryYear": 2026,
  "cvv": "123"
}
```

**Response (201 Created):**
```json
{
  "methodId": "pm-002",
  "type": "CREDIT_CARD",
  "lastFourDigits": "1111",
  "isDefault": false,
  "message": "Payment method added successfully"
}
```

**Error Responses:**
- `422 INVALID_DOMAIN_VALUE` - Invalid card details

---

### 4.9. Create Shopping Cart
**POST** `/api/v1/buyer/cart`

**Authentication:** Required (BUYER)

**Response (201 Created):**
```json
{
  "cartId": "cart-001",
  "buyerId": "buyer-001",
  "status": "OPEN",
  "items": [],
  "subtotal": 0.00,
  "total": 0.00,
  "currency": "USD",
  "createdAt": "2024-09-23T10:30:00Z"
}
```

---

### 4.10. Consult My Cart
**GET** `/api/v1/buyer/cart`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "cartId": "cart-001",
  "status": "OPEN",
  "items": [
    {
      "lineId": "line-001",
      "product": {
        "productId": "prod-001",
        "name": "Laptop Pro",
        "price": 999.99
      },
      "variant": {
        "variantId": "var-001",
        "color": "Silver",
        "storage": "512GB"
      },
      "quantity": 1,
      "subtotal": 999.99
    }
  ],
  "subtotal": 999.99,
  "estimatedTax": 79.99,
  "estimatedShipping": 20.00,
  "total": 1099.98,
  "currency": "USD",
  "warnings": []
}
```

---

### 4.11. Add Item to Cart
**POST** `/api/v1/buyer/cart/items`

**Authentication:** Required (BUYER)

**Request Body:**
```json
{
  "productId": "prod-001",
  "variantId": "var-001",
  "quantity": 1
}
```

**Response (201 Created):**
```json
{
  "lineId": "line-001",
  "cartId": "cart-001",
  "product": {
    "productId": "prod-001",
    "name": "Laptop Pro",
    "price": 999.99
  },
  "quantity": 1,
  "subtotal": 999.99,
  "message": "Item added to cart"
}
```

**Error Responses:**
- `404 RESOURCE_NOT_FOUND` - Product or variant not found
- `409 RESOURCE_ALREADY_EXISTS` - Item already in cart (increments quantity instead)

---

### 4.12. Update Cart Item
**PUT** `/api/v1/buyer/cart/items/{lineId}`

**Authentication:** Required (BUYER)

**Request Body:**
```json
{
  "quantity": 2
}
```

**Response (200 OK):**
```json
{
  "lineId": "line-001",
  "quantity": 2,
  "subtotal": 1999.98,
  "cartTotal": 2099.96
}
```

---

### 4.13. Remove Cart Item
**DELETE** `/api/v1/buyer/cart/items/{lineId}`

**Authentication:** Required (BUYER)

**Response (204 No Content)**

---

### 4.14. Checkout Cart
**POST** `/api/v1/buyer/cart/checkout`

**Authentication:** Required (BUYER)

**Request Body:**
```json
{
  "cartId": "cart-001",
  "deliveryAddressId": "addr-001",
  "paymentMethodId": "pm-001"
}
```

**Response (201 Created):**
```json
{
  "orderId": "order-001",
  "buyerId": "buyer-001",
  "cartId": "cart-001",
  "status": "PENDING",
  "items": [...],
  "deliveryAddress": {...},
  "subtotal": 999.99,
  "tax": 79.99,
  "shippingCost": 20.00,
  "total": 1099.98,
  "currency": "USD",
  "createdAt": "2024-09-23T10:30:00Z",
  "message": "Order created. Payment pending."
}
```

**Error Responses:**
- `400 INVALID_REQUEST` - Missing address or payment method
- `409 RESOURCE_ALREADY_EXISTS` - Cart already converted to order

---

### 4.15. Consult My Orders
**GET** `/api/v1/buyer/orders?status=&page=1&limit=20`

**Authentication:** Required (BUYER)

**Query Parameters:**
- `status` (optional): Filter by order status (PENDING, CONFIRMED, PREPARING, SENT, DELIVERED, CANCELLED)
- `page` (optional)
- `limit` (optional)

**Response (200 OK):**
```json
{
  "total": 25,
  "page": 1,
  "limit": 20,
  "orders": [
    {
      "orderId": "order-001",
      "status": "DELIVERED",
      "total": 1099.98,
      "currency": "USD",
      "itemCount": 1,
      "createdAt": "2024-09-20T10:30:00Z",
      "deliveredAt": "2024-09-22T14:45:00Z"
    }
  ]
}
```

---

### 4.16. Consult Order Details
**GET** `/api/v1/buyer/orders/{orderId}`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "orderId": "order-001",
  "status": "DELIVERED",
  "items": [
    {
      "lineId": "line-001",
      "product": {
        "productId": "prod-001",
        "name": "Laptop Pro"
      },
      "quantity": 1,
      "price": 999.99,
      "subtotal": 999.99
    }
  ],
  "seller": {
    "sellerId": "seller-001",
    "businessName": "Tech Store"
  },
  "deliveryAddress": {...},
  "shipment": {
    "shipmentId": "ship-001",
    "trackingNumber": "TRK123456789",
    "carrier": "FedEx",
    "status": "DELIVERED",
    "estimatedDeliveryDate": "2024-09-22",
    "actualDeliveryDate": "2024-09-22"
  },
  "payment": {
    "paymentId": "pay-001",
    "status": "CAPTURED",
    "method": "CREDIT_CARD"
  },
  "subtotal": 999.99,
  "tax": 79.99,
  "shippingCost": 20.00,
  "total": 1099.98,
  "currency": "USD",
  "timeline": [...]
}
```

---

### 4.17. Track Shipment
**GET** `/api/v1/buyer/orders/{orderId}/shipment/tracking`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "shipmentId": "ship-001",
  "trackingNumber": "TRK123456789",
  "carrier": "FedEx",
  "status": "IN_TRANSIT",
  "estimatedDeliveryDate": "2024-09-24",
  "timeline": [
    {
      "timestamp": "2024-09-23T08:00:00Z",
      "status": "DISPATCHED",
      "location": "Distribution Center, CA",
      "message": "Package dispatched"
    },
    {
      "timestamp": "2024-09-22T14:30:00Z",
      "status": "IN_WAREHOUSE",
      "location": "Warehouse, CA",
      "message": "Package prepared for shipment"
    }
  ]
}
```

---

### 4.18. Request Return
**POST** `/api/v1/buyer/orders/{orderId}/returns`

**Authentication:** Required (BUYER)

**Request Body:**
```json
{
  "reason": "DEFECTIVE|WRONG_ITEM|NOT_AS_DESCRIBED|CHANGED_MIND",
  "description": "The product arrived with scratches",
  "evidenceUrls": ["https://...image1.jpg", "https://...image2.jpg"]
}
```

**Response (201 Created):**
```json
{
  "returnId": "return-001",
  "orderId": "order-001",
  "status": "REQUESTED",
  "reason": "DEFECTIVE",
  "requestedAt": "2024-09-23T11:00:00Z",
  "message": "Return request submitted. Under review."
}
```

---

### 4.19. Consult My Returns
**GET** `/api/v1/buyer/returns?status=&page=1&limit=20`

**Authentication:** Required (BUYER)

**Response (200 OK):**
```json
{
  "total": 3,
  "returns": [
    {
      "returnId": "return-001",
      "orderId": "order-001",
      "status": "APPROVED",
      "reason": "DEFECTIVE",
      "requestedAt": "2024-09-23T11:00:00Z",
      "approvedAt": "2024-09-23T14:30:00Z",
      "refundAmount": 1099.98,
      "refundStatus": "REFUNDED"
    }
  ]
}
```

---

### 4.20. Manage Notification Preferences
**GET/PUT** `/api/v1/buyer/preferences/notifications`

**Authentication:** Required (BUYER)

**GET Response (200 OK):**
```json
{
  "email": true,
  "sms": true,
  "pushNotification": false,
  "orderUpdates": true,
  "returnUpdates": true,
  "promotions": false
}
```

**PUT Request Body:**
```json
{
  "email": true,
  "sms": false,
  "pushNotification": true,
  "orderUpdates": true,
  "promotions": true
}
```

**PUT Response (200 OK):**
```json
{
  "message": "Preferences updated"
}
```

---

## 5. Seller Endpoints (`SellerPort`)

### 5.1. Consult My Profile
**GET** `/api/v1/seller/profile`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "sellerId": "seller-001",
  "userId": "user-002",
  "businessName": "Tech Store",
  "identification": "1234567890",
  "personType": "NATURAL_PERSON",
  "verificationStatus": "VERIFIED",
  "email": "seller@techstore.com",
  "phoneNumber": "+1234567890",
  "rating": 4.8,
  "reviewCount": 250,
  "totalSales": 45000.00,
  "status": "ACTIVE",
  "joinedDate": "2024-01-01T00:00:00Z"
}
```

---

### 5.2. Update My Profile
**PUT** `/api/v1/seller/profile`

**Authentication:** Required (SELLER)

**Request Body:**
```json
{
  "phoneNumber": "+9876543210",
  "description": "We sell quality electronics"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully"
}
```

---

### 5.3. Consult My Store
**GET** `/api/v1/seller/store`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "storeId": "store-001",
  "sellerId": "seller-001",
  "storeName": "Tech Store",
  "storeDescription": "Quality electronics",
  "status": "ACTIVE",
  "rating": 4.8,
  "reviewCount": 250,
  "bannerUrl": "https://...",
  "logoUrl": "https://..."
}
```

---

### 5.4. Create Product
**POST** `/api/v1/seller/products`

**Authentication:** Required (SELLER)

**Request Body:**
```json
{
  "name": "Laptop Pro",
  "description": "High-performance laptop with 16GB RAM",
  "category": "Electronics",
  "sku": "LAPTOP-PRO-001",
  "price": 999.99,
  "currency": "USD",
  "images": ["https://..."],
  "attributes": {
    "brand": "TechBrand",
    "warranty": "2 years"
  }
}
```

**Response (201 Created):**
```json
{
  "productId": "prod-001",
  "name": "Laptop Pro",
  "status": "DRAFT",
  "sku": "LAPTOP-PRO-001",
  "price": 999.99,
  "message": "Product created in DRAFT status. Ready for publication."
}
```

---

### 5.5. Update Product
**PUT** `/api/v1/seller/products/{productId}`

**Authentication:** Required (SELLER)

**Request Body:**
```json
{
  "description": "Updated description",
  "price": 949.99
}
```

**Response (200 OK):**
```json
{
  "message": "Product updated",
  "productId": "prod-001"
}
```

**Error Responses:**
- `409 RESOURCE_ALREADY_EXISTS` - Cannot update price of published product without validation

---

### 5.6. Publish Product
**POST** `/api/v1/seller/products/{productId}/publish`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "productId": "prod-001",
  "status": "PUBLISHED",
  "message": "Product published successfully",
  "publicUrl": "https://marketplace.com/products/prod-001"
}
```

**Error Responses:**
- `422 INVALID_DOMAIN_VALUE` - Missing required fields or compliance check failed

---

### 5.7. Add Product Variant
**POST** `/api/v1/seller/products/{productId}/variants`

**Authentication:** Required (SELLER)

**Request Body:**
```json
{
  "attributes": {
    "color": "Silver",
    "storage": "512GB"
  },
  "price": 1099.99,
  "sku": "LAPTOP-PRO-001-SIL-512"
}
```

**Response (201 Created):**
```json
{
  "variantId": "var-001",
  "productId": "prod-001",
  "attributes": {
    "color": "Silver",
    "storage": "512GB"
  },
  "price": 1099.99,
  "sku": "LAPTOP-PRO-001-SIL-512"
}
```

---

### 5.8. Consult My Inventory
**GET** `/api/v1/seller/inventory`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "warehouse": {
    "warehouseId": "wh-001",
    "name": "Main Warehouse",
    "location": "New York, NY"
  },
  "inventory": [
    {
      "inventoryId": "inv-001",
      "product": {
        "productId": "prod-001",
        "name": "Laptop Pro",
        "sku": "LAPTOP-PRO-001"
      },
      "available": 50,
      "reserved": 5,
      "total": 55
    }
  ]
}
```

---

### 5.9. Register Stock Entry
**POST** `/api/v1/seller/inventory/entries`

**Authentication:** Required (SELLER)

**Request Body:**
```json
{
  "productId": "prod-001",
  "quantity": 20,
  "receiptReference": "REC-2024-09-23-001"
}
```

**Response (201 Created):**
```json
{
  "entryId": "entry-001",
  "productId": "prod-001",
  "quantity": 20,
  "newAvailableStock": 70,
  "message": "Stock entry registered"
}
```

---

### 5.10. Adjust Inventory
**POST** `/api/v1/seller/inventory/adjustments`

**Authentication:** Required (SELLER)

**Request Body:**
```json
{
  "productId": "prod-001",
  "adjustment": -5,
  "reason": "DAMAGED|THEFT|INVENTORY_COUNT_CORRECTION",
  "description": "5 units found damaged during count"
}
```

**Response (201 Created):**
```json
{
  "adjustmentId": "adj-001",
  "productId": "prod-001",
  "adjustment": -5,
  "previousStock": 70,
  "newStock": 65,
  "message": "Inventory adjustment applied"
}
```

---

### 5.11. Consult Orders for Fulfillment
**GET** `/api/v1/seller/orders?status=CONFIRMED&page=1&limit=20`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "total": 10,
  "orders": [
    {
      "orderId": "order-001",
      "buyerName": "John Doe",
      "status": "CONFIRMED",
      "items": [
        {
          "lineId": "line-001",
          "product": {
            "productId": "prod-001",
            "name": "Laptop Pro"
          },
          "quantity": 1,
          "price": 999.99
        }
      ],
      "total": 1099.98,
      "createdAt": "2024-09-23T10:30:00Z"
    }
  ]
}
```

---

### 5.12. Approve Order (for Fulfillment)
**POST** `/api/v1/seller/orders/{orderId}/approve`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "orderId": "order-001",
  "status": "APPROVED",
  "message": "Order approved for preparation"
}
```

---

### 5.13. Prepare Order
**POST** `/api/v1/seller/orders/{orderId}/prepare`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "orderId": "order-001",
  "status": "PREPARING",
  "message": "Order preparation started"
}
```

---

### 5.14. Consult My Shipments
**GET** `/api/v1/seller/shipments?status=&page=1&limit=20`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "total": 15,
  "shipments": [
    {
      "shipmentId": "ship-001",
      "orderId": "order-001",
      "status": "IN_TRANSIT",
      "trackingNumber": "TRK123456789",
      "carrier": "FedEx",
      "dispatchedAt": "2024-09-23T08:00:00Z"
    }
  ]
}
```

---

### 5.15. Preview Settlement
**GET** `/api/v1/seller/settlement/preview?startDate=2024-09-01&endDate=2024-09-30`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "period": "2024-09-01 to 2024-09-30",
  "totalSales": 45000.00,
  "commissionRate": 0.05,
  "commissionAmount": 2250.00,
  "taxes": 180.00,
  "deductions": 0.00,
  "netAmount": 42570.00,
  "currency": "USD"
}
```

---

### 5.16. Consult My Performance
**GET** `/api/v1/seller/performance`

**Authentication:** Required (SELLER)

**Response (200 OK):**
```json
{
  "rating": 4.8,
  "reviewCount": 250,
  "totalOrders": 500,
  "fulfilledOrders": 495,
  "cancelledOrders": 3,
  "returnedOrders": 2,
  "avgResponseTime": "2 hours",
  "memberSince": "2024-01-01T00:00:00Z"
}
```

---

## 6. Logistics Operator Endpoints (`LogisticsOperatorPort`)

### 6.1. Consult Operational Warehouses
**GET** `/api/v1/logistics/warehouses`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Response (200 OK):**
```json
{
  "warehouses": [
    {
      "warehouseId": "wh-001",
      "name": "Main Warehouse",
      "location": {
        "city": "New York",
        "state": "NY",
        "country": "USA"
      },
      "status": "OPERATIONAL",
      "capacity": 10000,
      "currentOccupancy": 6500
    }
  ]
}
```

---

### 6.2. Consult Warehouse Details
**GET** `/api/v1/logistics/warehouses/{warehouseId}`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Response (200 OK):**
```json
{
  "warehouseId": "wh-001",
  "name": "Main Warehouse",
  "location": {...},
  "status": "OPERATIONAL",
  "capacity": 10000,
  "currentOccupancy": 6500,
  "inventory": [
    {
      "productId": "prod-001",
      "productName": "Laptop Pro",
      "available": 50,
      "reserved": 5,
      "total": 55
    }
  ]
}
```

---

### 6.3. Register Stock Entry
**POST** `/api/v1/logistics/inventory/entries`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Request Body:**
```json
{
  "warehouseId": "wh-001",
  "productId": "prod-001",
  "quantity": 20,
  "receiptReference": "REC-2024-09-23-001"
}
```

**Response (201 Created):**
```json
{
  "entryId": "entry-001",
  "warehouseId": "wh-001",
  "quantity": 20,
  "message": "Stock entry registered"
}
```

---

### 6.4. Consult Shipments Ready for Dispatch
**GET** `/api/v1/logistics/shipments/pending-dispatch`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Response (200 OK):**
```json
{
  "shipments": [
    {
      "shipmentId": "ship-001",
      "orderId": "order-001",
      "status": "IN_PREPARATION",
      "items": [...],
      "destinationAddress": {...},
      "warehouseId": "wh-001"
    }
  ]
}
```

---

### 6.5. Prepare Shipment
**POST** `/api/v1/logistics/shipments/{shipmentId}/prepare`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Response (200 OK):**
```json
{
  "shipmentId": "ship-001",
  "status": "IN_PREPARATION",
  "message": "Shipment preparation started"
}
```

---

### 6.6. Select Carrier
**POST** `/api/v1/logistics/shipments/{shipmentId}/carrier`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Request Body:**
```json
{
  "carrier": "FedEx|UPS|DHL",
  "service": "STANDARD|EXPRESS|OVERNIGHT"
}
```

**Response (200 OK):**
```json
{
  "shipmentId": "ship-001",
  "carrier": "FedEx",
  "service": "STANDARD",
  "estimatedDeliveryDate": "2024-09-26",
  "shippingCost": 20.00,
  "message": "Carrier selected"
}
```

---

### 6.7. Dispatch Shipment
**POST** `/api/v1/logistics/shipments/{shipmentId}/dispatch`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Response (200 OK):**
```json
{
  "shipmentId": "ship-001",
  "status": "IN_TRANSIT",
  "trackingNumber": "TRK123456789",
  "carrier": "FedEx",
  "dispatchedAt": "2024-09-23T08:00:00Z",
  "message": "Shipment dispatched successfully"
}
```

---

### 6.8. Track Shipment
**GET** `/api/v1/logistics/shipments/{shipmentId}/tracking`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Response (200 OK):**
```json
{
  "shipmentId": "ship-001",
  "trackingNumber": "TRK123456789",
  "carrier": "FedEx",
  "status": "IN_TRANSIT",
  "timeline": [...]
}
```

---

### 6.9. Confirm Delivery
**POST** `/api/v1/logistics/shipments/{shipmentId}/confirm-delivery`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Response (200 OK):**
```json
{
  "shipmentId": "ship-001",
  "status": "DELIVERED",
  "deliveredAt": "2024-09-25T14:30:00Z",
  "message": "Delivery confirmed"
}
```

---

### 6.10. Handle Delivery Exception
**POST** `/api/v1/logistics/shipments/{shipmentId}/exception`

**Authentication:** Required (LOGISTICS_OPERATOR)

**Request Body:**
```json
{
  "exceptionType": "DELIVERY_FAILED|WRONG_ADDRESS|DAMAGED",
  "details": "Address not found, returned to warehouse"
}
```

**Response (200 OK):**
```json
{
  "shipmentId": "ship-001",
  "status": "FAILED",
  "exceptionType": "DELIVERY_FAILED",
  "message": "Exception registered"
}
```

---

## 7. Administrator Endpoints (`AdministratorPort`)

### 7.1. Consult Users
**GET** `/api/v1/admin/users?role=&status=&page=1&limit=20`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "total": 1500,
  "users": [
    {
      "userId": "user-001",
      "username": "john.doe",
      "email": "john@example.com",
      "role": "BUYER",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 7.2. Change User Status
**PATCH** `/api/v1/admin/users/{userId}/status`

**Authentication:** Required (ADMINISTRATOR)

**Request Body:**
```json
{
  "newStatus": "ACTIVE|SUSPENDED|BLOCKED",
  "reason": "Reason for status change"
}
```

**Response (200 OK):**
```json
{
  "userId": "user-001",
  "status": "SUSPENDED",
  "message": "User status updated"
}
```

---

### 7.3. Approve Seller
**POST** `/api/v1/admin/sellers/{sellerId}/approve`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "sellerId": "seller-001",
  "verificationStatus": "VERIFIED",
  "message": "Seller approved"
}
```

---

### 7.4. Reject Seller
**POST** `/api/v1/admin/sellers/{sellerId}/reject`

**Authentication:** Required (ADMINISTRATOR)

**Request Body:**
```json
{
  "reason": "Documentation incomplete"
}
```

**Response (200 OK):**
```json
{
  "sellerId": "seller-001",
  "verificationStatus": "REJECTED",
  "message": "Seller rejected"
}
```

---

### 7.5. Revoke Seller Access
**POST** `/api/v1/admin/sellers/{sellerId}/revoke`

**Authentication:** Required (ADMINISTRATOR)

**Request Body:**
```json
{
  "reason": "Policy violation"
}
```

**Response (200 OK):**
```json
{
  "sellerId": "seller-001",
  "status": "REVOKED",
  "message": "Seller access revoked"
}
```

---

### 7.6. Consult Pending Seller Verifications
**GET** `/api/v1/admin/sellers/pending-verification`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "sellers": [
    {
      "sellerId": "seller-001",
      "businessName": "Tech Store",
      "verificationStatus": "PENDING",
      "submittedAt": "2024-09-20T10:30:00Z"
    }
  ]
}
```

---

### 7.7. Consult Suspended Products
**GET** `/api/v1/admin/products/suspended`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "products": [
    {
      "productId": "prod-001",
      "name": "Laptop Pro",
      "seller": {...},
      "status": "SUSPENDED",
      "suspensionReason": "Policy violation",
      "suspendedAt": "2024-09-22T10:30:00Z"
    }
  ]
}
```

---

### 7.8. Reactivate Suspended Product
**POST** `/api/v1/admin/products/{productId}/reactivate`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "productId": "prod-001",
  "status": "PUBLISHED",
  "message": "Product reactivated"
}
```

---

### 7.9. Consult All Returns
**GET** `/api/v1/admin/returns?status=&page=1&limit=20`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "total": 50,
  "returns": [
    {
      "returnId": "return-001",
      "orderId": "order-001",
      "buyer": {...},
      "seller": {...},
      "status": "IN_REVIEW",
      "reason": "DEFECTIVE",
      "requestedAt": "2024-09-23T11:00:00Z"
    }
  ]
}
```

---

### 7.10. Approve Return
**POST** `/api/v1/admin/returns/{returnId}/approve`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "returnId": "return-001",
  "status": "APPROVED",
  "refundAmount": 1099.98,
  "message": "Return approved"
}
```

---

### 7.11. Reject Return
**POST** `/api/v1/admin/returns/{returnId}/reject`

**Authentication:** Required (ADMINISTRATOR)

**Request Body:**
```json
{
  "reason": "Ineligible for return"
}
```

**Response (200 OK):**
```json
{
  "returnId": "return-001",
  "status": "REJECTED",
  "message": "Return rejected"
}
```

---

### 7.12. Update Commission Policy
**PUT** `/api/v1/admin/policies/commission`

**Authentication:** Required (ADMINISTRATOR)

**Request Body:**
```json
{
  "rate": 0.05,
  "effectiveDate": "2024-10-01T00:00:00Z",
  "description": "Standard commission rate"
}
```

**Response (200 OK):**
```json
{
  "message": "Commission policy updated",
  "effectiveDate": "2024-10-01T00:00:00Z"
}
```

---

### 7.13. Update Return Policy
**PUT** `/api/v1/admin/policies/return`

**Authentication:** Required (ADMINISTRATOR)

**Request Body:**
```json
{
  "returnWindow": 30,
  "restockingFee": 0.10,
  "description": "30-day return window with 10% restocking fee"
}
```

**Response (200 OK):**
```json
{
  "message": "Return policy updated"
}
```

---

### 7.14. Consult Operational Dashboard
**GET** `/api/v1/admin/dashboard`

**Authentication:** Required (ADMINISTRATOR)

**Response (200 OK):**
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "totalUsers": 10000,
  "totalBuyers": 8000,
  "totalSellers": 2000,
  "activeOrders": 350,
  "pendingPayments": 45,
  "pendingReturns": 12,
  "suspendedProducts": 5,
  "suspendedSellers": 2,
  "totalGrossVolume": 500000.00,
  "commissionEarned": 25000.00,
  "avgOrderValue": 1428.57
}
```

---

## 8. Supervisor Endpoints (`SupervisorPort`)

### 8.1. Consult Operational Dashboard
**GET** `/api/v1/supervisor/dashboard`

**Authentication:** Required (SUPERVISOR)

**Response (200 OK):** (Same as Administrator, but with limited details)

---

### 8.2. Consult KPI Metrics
**GET** `/api/v1/supervisor/metrics?startDate=2024-09-01&endDate=2024-09-30`

**Authentication:** Required (SUPERVISOR)

**Response (200 OK):**
```json
{
  "period": "2024-09-01 to 2024-09-30",
  "ordersCreated": 5000,
  "ordersConfirmed": 4800,
  "ordersCancelled": 100,
  "averageOrderValue": 1428.57,
  "totalGrossVolume": 7143000.00,
  "totalCommission": 357150.00,
  "averageDeliveryTime": "3.2 days",
  "customerSatisfaction": "92%"
}
```

---

### 8.3. Consult Active Anomalies
**GET** `/api/v1/supervisor/anomalies`

**Authentication:** Required (SUPERVISOR)

**Response (200 OK):**
```json
{
  "anomalies": [
    {
      "anomalyId": "anom-001",
      "type": "HIGH_RETURN_RATE",
      "severity": "WARNING",
      "affectedEntity": {
        "type": "SELLER",
        "id": "seller-002",
        "name": "Electronics Plus"
      },
      "description": "Return rate 25% (above 10% threshold)",
      "detectedAt": "2024-09-23T10:00:00Z"
    }
  ]
}
```

---

### 8.4. Consult Order Monitoring
**GET** `/api/v1/supervisor/orders?status=&page=1&limit=20`

**Authentication:** Required (SUPERVISOR)

**Response (200 OK):**
```json
{
  "total": 350,
  "orders": [...]
}
```

---

## 9. Error Response Examples

### 400 Bad Request - Invalid Request
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "status": 400,
  "code": "INVALID_REQUEST",
  "message": "Email is required",
  "path": "/api/v1/auth/login",
  "requestId": "req-001H...",
  "details": {
    "field": "email",
    "error": "Required field missing"
  }
}
```

### 401 Authentication Required
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "status": 401,
  "code": "AUTHENTICATION_REQUIRED",
  "message": "Missing or invalid JWT token",
  "path": "/api/v1/buyer/profile",
  "requestId": "req-001H..."
}
```

### 403 Forbidden
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "status": 403,
  "code": "FORBIDDEN",
  "message": "Insufficient permissions for this operation",
  "path": "/api/v1/admin/users",
  "requestId": "req-001H..."
}
```

### 404 Not Found
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "status": 404,
  "code": "RESOURCE_NOT_FOUND",
  "message": "Product not found",
  "path": "/api/v1/catalog/products/prod-999",
  "requestId": "req-001H..."
}
```

### 409 Conflict / Resource Already Exists
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "status": 409,
  "code": "RESOURCE_ALREADY_EXISTS",
  "message": "Email already registered",
  "path": "/api/v1/auth/register/buyer",
  "requestId": "req-001H..."
}
```

### 422 Unprocessable Entity - Domain Validation Failure
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "status": 422,
  "code": "INVALID_DOMAIN_VALUE",
  "message": "Product publication failed: insufficient inventory",
  "path": "/api/v1/seller/products/prod-001/publish",
  "requestId": "req-001H...",
  "details": {
    "reason": "Minimum 10 units required for publication, current: 5"
  }
}
```

### 500 Internal Server Error
```json
{
  "timestamp": "2024-09-23T12:00:00Z",
  "status": 500,
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "path": "/api/v1/buyer/orders",
  "requestId": "req-001H..."
}
```

---

## 10. Endpoint Organization Summary

| Role | Endpoints | Base Path |
|---|---|---|
| Public | Login, Logout, Register, Search Catalog | `/api/v1/auth/`, `/api/v1/catalog/` |
| Buyer | Profile, Addresses, Payments, Cart, Orders, Shipment Tracking, Returns | `/api/v1/buyer/` |
| Seller | Profile, Store, Products, Inventory, Orders, Shipments, Settlement, Performance | `/api/v1/seller/` |
| Logistics Operator | Warehouses, Inventory, Shipments, Dispatch, Delivery | `/api/v1/logistics/` |
| Administrator | Users, Sellers, Products, Returns, Disputes, Policies, Dashboard | `/api/v1/admin/` |
| Supervisor | Dashboard, Metrics, Anomalies, Orders, Monitoring | `/api/v1/supervisor/` |

---

## 11. Version & Evolution

- **API Version:** `v1`
- **Last Updated:** 2024-09-23
- **Next Review:** Quarterly or when major features are added

All endpoints must be implemented with the domain model contracts defined in `SDD/Domain/Input-ports.md`.
