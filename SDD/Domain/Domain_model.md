# Domain Model - NexusMarket

## 1. Introduction

NexusMarket is a centralized digital platform that acts as a commercial intermediary between buyers and sellers. Its main purpose is to comprehensively manage marketplace operations, from user registration and product publication to logistics, billing, and post-sale service. The system guarantees traceability, coordination, and operational compliance among all ecosystem actors.

The business domain focuses on managing a multi-user commercial network where each participant plays a specific role and where the platform assumes operational responsibility in transaction mediation, delivery coordination, and control of financial and logistics information.

### Strategic system objectives

- Manage complete marketplace user information.
- Manage seller registration and administration.
- Manage registered buyers.
- Control warehouse and logistics location information.
- Manage product catalog and its variations.
- Manage distributed inventory.
- Manage shopping cart.
- Control the complete order cycle.
- Manage purchase billing.
- Manage logistics processes and deliveries.
- Manage returns and refunds.
- Consolidate administrative information for consultation and decision-making.

### Functional domain vision

The domain consists of several interrelated business areas:

- Identity and users
- Seller commercial management
- Catalog and products
- Inventory and warehouses
- Purchase and cart
- Orders and statuses
- Billing and payments
- Logistics and deliveries
- Returns and refunds
- Administrative information and analytics

From a DDD perspective, NexusMarket is modeled as a system with multiple subdomains, robust business entities, well-defined value objects, and aggregates that maintain consistency within each context.

## Business Participants

Each participant plays a unique role within the system and can only interact with information corresponding to their functions.

| Participant | General Description |
|---|---|
| Buyer | Person who purchases published products. |
| Seller | Responsible for registering and managing their products. |
| Logistics Operator | In charge of physical warehouse and dispatch operations. |
| Administrator | Responsible for seller and warehouse administration. |
| Supervisor | Profile for consultation and operational monitoring. |

### Access rule by role

- Each system user must be associated with a unique business role.
- Access to information and processes is determined by the assigned role.
- Buyers can only manage their history, cart, purchases, and associated support.
- Sellers can only manage their products, inventories, and orders associated with their commercial operations.
- Logistics operators can only operate on warehouses, shipments, and physical traceability.
- Administrators have configuration permissions and operational control of the marketplace.
- Supervisors have access to consultation and monitoring, but do not perform critical business operations for purchase, sale, or dispatch.

---

## 2. Detailed Entities

The following describes the main domain entities, with their attributes, data type, responsibilities, and key rules.

### 2.1 User

| Attribute | Type | Description |
|---|---|---|
| userId | UUID | Unique user identifier. |
| userType | Enum | Can be Buyer, Seller, or Administrator. |
| firstName | String | User's first name. |
| lastName | String | User's last name. |
| email | String | Email for access. |
| phone | String | Contact number. |
| identityDocument | IdentityDocument | Document type and number. |
| registrationDate | DateTime | Date when user was created. |
| status | UserStatus | User status within the system. |
| updateDate | DateTime | Date of last modification. |

Business rules:
- Email must be unique in the system.
- Identity document must be valid and verifiable.
- A user cannot have more than one active primary role simultaneously.
- Status changes must be recorded in audit logs.

### 2.2 Buyer

| Attribute | Type | Description |
|---|---|---|
| buyerId | UUID | Buyer identifier. |
| userId | UUID | Relationship with the User entity. |
| purchaseHistory | List<Order> | Completed orders. |
| deliveryAddresses | List<DeliveryAddress> | Addresses associated with the buyer. |
| paymentMethods | List<PaymentMethod> | Enabled payment methods. |
| trustLevel | Enum | Trust level based on behavior. |
| lastPurchaseDate | DateTime | Last recorded purchase. |

Business rules:
- Buyer must have at least one primary address for purchases.
- Cannot purchase products outside of stock availability.
- History must be immutable for closed transactions.

### 2.3 Seller

| Attribute | Type | Description |
|---|---|---|
| sellerId | UUID | Seller identifier. |
| userId | UUID | Relationship to the User entity. |
| commercialName | String | Visible store or business name. |
| personType | Enum | Natural or legal. |
| verificationStatus | Enum | Pending, Verified, Rejected. |
| store | Store | Associated primary store. |
| commercialAccount | CommercialAccount | Account for payments and commissions. |
| reputation | Decimal | General seller rating. |
| approvalDate | DateTime | Seller validation date. |

Business rules:
- A seller must be verified before publishing products.
- Commercial name must be unique at marketplace level.
- Settlement accounts must be consistent with tax information.

### 2.4 Store

| Attribute | Type | Description |
|---|---|---|
| storeId | UUID | Unique store identifier. |
| sellerId | UUID | Seller who owns the store. |
| name | String | Store commercial name. |
| description | String | Visible description. |
| storeCategory | Enum | Business category. |
| status | Enum | Active, Inactive, Suspended. |
| creationDate | DateTime | Creation date. |

Business rules:
- A store can only belong to one active seller.
- Store suspension prevents publication of new products.

### 2.5 Warehouse

| Attribute | Type | Description |
|---|---|---|
| warehouseId | UUID | Warehouse identifier. |
| sellerId | UUID | Responsible seller. |
| name | String | Warehouse name. |
| location | WarehouseLocation | Physical address or coordinate. |
| capacity | Decimal | Estimated storage capacity. |
| status | Enum | Operational, Closed, Maintenance. |
| creationDate | DateTime | Registration date. |

Business rules:
- Warehouse must be operational to dispatch orders.
- Stock associated with a warehouse cannot be left in inconsistent state.

### 2.6 Product

| Attribute | Type | Description |
|---|---|---|
| productId | UUID | Unique product identifier. |
| name | String | Visible product name. |
| description | String | Commercial description. |
| category | ProductCategory | Product group or category. |
| sku | String | Unique internal code. |
| seller | Seller | Responsible seller. |
| basePrice | Decimal | Base product price. |
| productStatus | ProductStatus | Publication status and availability. |
| publicationDate | DateTime | Publication date. |
| brand | String | Product brand. |

Business rules:
- SKU must be globally unique.
- A product cannot be published if the seller is not verified.
- Pricing must be consistent with product type and marketplace policy.

### 2.7 ProductVariant

| Attribute | Type | Description |
|---|---|---|
| variantId | UUID | Variant identifier. |
| productId | UUID | Associated product. |
| attribute | String | Example: color, size, capacity. |
| value | String | Specific variant value. |
| additionalPrice | Decimal | Increase or discount for the variant. |
| skuVariant | String | Variant internal code. |

Business rules:
- Variant combination cannot be duplicated.
- Variant price must be compatible with base price.

### 2.8 Inventory

| Attribute | Type | Description |
|---|---|---|
| inventoryId | UUID | Inventory identifier. |
| productId | UUID | Associated product. |
| warehouseId | UUID | Responsible warehouse. |
| availableStock | Integer | Available units. |
| reservedStock | Integer | Units reserved by open orders. |
| totalStock | Integer | Total available plus reserved. |
| updateDate | DateTime | Date of last movement. |

Business rules:
- availableStock + reservedStock = totalStock.
- There cannot be reserves without a valid associated order.
- Inventory update must be done under transaction.

### 2.9 ShoppingCart

| Attribute | Type | Description |
|---|---|---|
| cartId | UUID | Cart identifier. |
| buyerId | UUID | Owner buyer. |
| cartLines | List<CartLine> | Selected products. |
| subtotal | Decimal | Partial sum without taxes. |
| total | Decimal | Total cart value. |
| updateDate | DateTime | Last modification. |
| status | Enum | Open, Converted, Canceled. |

Business rules:
- Cart cannot contain products from ineligible sellers.
- If product availability changes, cart must be updated.
- Cart converts to order only when purchase is confirmed.

### 2.10 Order

| Attribute | Type | Description |
|---|---|---|
| orderId | UUID | Unique order identifier. |
| buyerId | UUID | Order buyer. |
| sellerId | UUID | Responsible seller. |
| orderLines | List<OrderLine> | Purchased products. |
| subtotal | Decimal | Order base value. |
| taxes | Decimal | Applied taxes. |
| shippingCost | Decimal | Shipping cost. |
| total | Decimal | Final total. |
| orderStatus | OrderStatus | Order cycle status. |
| creationDate | DateTime | Creation date. |
| estimatedDeliveryDate | DateTime | Estimated delivery date. |

Business rules:
- An order can only be generated if the cart is valid.
- Valid payment must exist before final shipment confirmation.
- Order must remain traceable from creation to closure.

### 2.11 OrderLine

| Attribute | Type | Description |
|---|---|---|
| orderLineId | UUID | Line identifier. |
| productId | UUID | Requested product. |
| quantity | Integer | Quantity ordered. |
| unitPrice | Decimal | Price per unit. |
| subtotal | Decimal | Line total. |
| variantId | UUID | Product variant, if applicable. |

Business rules:
- Quantity must be greater than zero.
- Subtotal must match quantity × unitPrice.

### 2.12 Invoice

| Attribute | Type | Description |
|---|---|---|
| invoiceId | UUID | Invoice identifier. |
| orderId | UUID | Associated order. |
| invoiceNumber | String | Correlative or unique number. |
| issueDate | DateTime | Issue date. |
| subtotal | Decimal | Taxable base. |
| taxes | Decimal | Tax amount. |
| total | Decimal | Total value. |
| currency | Currency | Currency type. |
| invoiceStatus | Enum | Issued, Paid, Cancelled. |

Business rules:
- Invoice must correspond exactly to a confirmed order.
- Invoice number cannot be duplicated.
- Issuance must be associated with audit logs.

### 2.13 Payment

| Attribute | Type | Description |
|---|---|---|
| paymentId | UUID | Payment identifier. |
| orderId | UUID | Associated order. |
| paymentMethod | PaymentMethod | Method used for payment. |
| amount | Decimal | Paid amount. |
| currency | Currency | Payment currency. |
| paymentStatus | PaymentStatus | Pending, Authorized, Rejected, Refunded. |
| externalTransactionId | String | Gateway or financial entity identifier. |
| processingDate | DateTime | Validation date. |

Business rules:
- Payment must be approved before shipment preparation.
- An order cannot be paid with a non-enabled method.
- Refunds must reflect the reality of the original transaction.

### 2.14 Shipment

| Attribute | Type | Description |
|---|---|---|
| shipmentId | UUID | Shipment identifier. |
| orderId | UUID | Associated order. |
| warehouseId | UUID | Origin warehouse. |
| deliveryAddress | DeliveryAddress | Destination location. |
| carrier | Carrier | Transport company. |
| trackingCode | String | Tracking identifier. |
| shipmentStatus | ShipmentStatus | Scheduled, InTransit, Delivered, Failed. |
| departureDate | DateTime | Actual shipment date. |
| deliveryDate | DateTime | Delivery date. |

Business rules:
- A shipment can only be generated when stock is available and an order is validated.
- Tracking code must be unique.
- Failed deliveries must open a logistics resolution flow.

### 2.15 Return

| Attribute | Type | Description |
|---|---|---|
| returnId | UUID | Return identifier. |
| orderId | UUID | Related order. |
| invoiceId | UUID | Associated invoice. |
| reason | Enum | Damage, Shipping Error, Disagreement, Other. |
| returnStatus | Enum | Requested, InReview, Approved, Rejected, Completed. |
| requestDate | DateTime | Request date. |
| refundAmount | Decimal | Amount to be refunded. |

Business rules:
- Return must be associated with an order in eligible status.
- Refund amount cannot exceed total purchase value.
- Evidence or case validation must exist before automatic approvals.

---

## 3. Domain Class Hierarchy

The following hierarchy represents the conceptual structure of the marketplace domain, organized by aggregates and functional components:

```text
NexusMarket
├── User
│   ├── Buyer
│   │   ├── ShoppingCart
│   │   ├── DeliveryAddress
│   │   ├── PaymentMethod
│   │   └── PurchaseHistory
│   └── Seller
│       ├── SellerProfile
│       ├── Store
│       ├── Warehouse
│       ├── ProductCatalog
│       ├── Inventory
│       └── CommercialAccount
├── Product
│   ├── ProductCategory
│   ├── ProductVariant
│   ├── ProductAttribute
│   ├── ProductPrice
│   └── ProductStatus
├── Order
│   ├── OrderLine
│   ├── OrderStatus
│   ├── Invoice
│   ├── Payment
│   ├── Shipment
│   └── Return
├── Warehouse
│   ├── WarehouseLocation
│   ├── ProductStock
│   ├── InventoryMovement
│   └── InventoryReservation
├── Logistics
│   ├── Carrier
│   ├── DeliveryRoute
│   ├── ShipmentTracking
│   └── DeliveryStatus
├── Billing
│   ├── Invoice
│   ├── Tax
│   ├── MarketplaceCommission
│   └── SellerSettlement
├── PostSale
│   ├── Return
│   ├── Refund
│   ├── Claim
│   └── DisputeResolution
├── Administration
│   ├── OperativeDashboard
│   ├── GeneralReport
│   ├── Audit
│   └── CommercialConsolidated
└── SharedDomain
    ├── Currency
    ├── IdentityDocument
    ├── GenericStatus
    └── Notification
```

This hierarchy expresses the composition of the domain as a set of business aggregates, with special emphasis on the responsibilities of user, catalog, purchases, logistics, billing, and administration.

---

## 4. Domain Relationships

The NexusMarket domain is structured around relationships between entities and aggregates. The following presents the main mapping of business relationships:

### 4.1 User - Buyer Relationship

- A `User` can be registered as a `Buyer`.
- A buyer can have multiple `DeliveryAddresses`.
- A buyer can have several `PaymentMethods`.
- A buyer can generate multiple `Orders`.
- A buyer can have a purchase history and ratings.

### 4.2 User - Seller Relationship

- A `User` can be registered as a `Seller`.
- A seller can own one or several `Stores`.
- A seller can manage several `Warehouses`.
- A seller can publish multiple `Products`.
- A seller can have a `CommercialAccount` for settlements and commissions.

### 4.3 Seller - Product Relationship

- A seller publishes one or more products.
- Each product belongs to a category.
- A product can have multiple `ProductVariants`.
- A product can be associated with stock records and availability per warehouse.

### 4.4 Product - Inventory Relationship

- A product is associated with inventory records.
- Inventory is managed by warehouse.
- The system validates real availability before confirming a cart or order.
- Stock can be updated by entry/exit movements.

### 4.5 Buyer - Cart - Order Relationship

- A buyer creates a `ShoppingCart`.
- The cart accumulates purchase lines (`CartLine`).
- When the buyer confirms the purchase, the cart becomes an `Order`.
- The order creates a purchase order linked to product, quantities, value, and logistics.

### 4.6 Order - Invoice - Payment Relationship

- An order generates an `Invoice` when the purchase is completed.
- The order requires an associated `Payment`.
- Payment can be in pending, authorized, rejected, or refunded status.
- The invoice reflects taxes, totals, and marketplace commissions.

### 4.7 Order - Logistics Relationship

- An order can generate one or several `DeliveryOrders`.
- The shipment is associated with a delivery address and a carrier.
- The shipment status is updated during the delivery cycle.
- Logistics may require coordination with the warehouse and seller.

### 4.8 Order - Post-Sale Relationship

- An order can have returns, claims, and refunds.
- A return is associated with a reason, status, and case evaluation.
- The platform can issue a dispute resolution or case closure.

---



## 5. Value Objects / Catalogs

Value objects represent immutable business concepts of value, used to encapsulate data without their own identity.

### 5.1 Main value objects

#### IdentityDocument
- documentType: Enum
- documentNumber: String
- issueCountry: String

Usage: identifies buyers, sellers, and administrators.

#### DeliveryAddress
- country: String
- department: String
- city: String
- neighborhood: String
- address: String
- postalCode: String
- reference: String

Usage: represents the exact location for deliveries and billing.

#### PaymentMethod
- type: Enum
- maskedNumber: String
- cardholder: String
- expirationDate: String
- brand: String

Usage: encapsulates payment information for buyers.

#### Currency
- code: String
- name: String
- symbol: String
- decimals: Integer

Usage: standardizes monetary representation, for example COP, USD, EUR.

#### ProductPrice
- baseValue: Decimal
- currency: Currency
- appliedTax: Decimal
- finalPrice: Decimal

Usage: ensures monetary consistency in the catalog.

### 5.2 Domain catalogs

#### User Status Catalog
- Active
- Inactive
- Blocked
- PendingVerification

#### Product Status Catalog
- Draft
- Published
- Inactive
- Suspended
- OutOfStock

#### Product Category Catalog
- Electronics
- Home
- Clothing and Accessories
- Beauty
- Sports
- Toys
- Office
- Hardware
- Automotive
- Other

#### Order Status Catalog
- Pending
- Confirmed
- Preparing
- Sent
- Delivered
- Cancelled
- Refunded

#### Payment Status Catalog
- Pending
- Authorized
- Rejected
- Refunded
- Failed

#### Shipment Status Catalog
- Scheduled
- InPreparation
- InTransit
- Delivered
- Failed
- Retained

#### Document Type Catalog
- Citizenship Card
- Identity Card
- Tax ID
- Passport
- Foreign ID

#### Supported Currencies Catalog
- COP
- USD
- EUR

---

## 6. Domain Design Rules

The domain design for NexusMarket must follow a series of rules oriented towards consistency, traceability, and business evolution.

### 6.1 Immutability

Value objects must be immutable. Once created, they cannot change their value. This ensures:

- consistency in prices and addresses,
- lower risk of business errors,
- clarity in the traceability of operations.

Example: a delivery address or a price should not be modified implicitly after being accepted by the system.

### 6.2 Audit

Every critical operation must be recorded with information about:

- user who executed the action,
- timestamp,
- affected entity,
- change made,
- reason or justification for the change.

This applies especially to:
- creation and editing of sellers,
- product publication,
- stock changes,
- order confirmation,
- payment approval,
- resolution of returns and disputes.

### 6.3 Transactional consistency

Operations that involve more than one aggregate must be maintained under transactions or coherent domain events. Examples:

- Confirming order implies reserving stock and authorizing payment.
- Generating return requires validating the associated order and invoice.
- Updating inventory must preserve the relationship between available, reserved, and total stock.

### 6.4 Domain constraints

- A published product cannot exist without a verified seller.
- An order cannot be delivered without evidence of valid payment.
- A cart cannot contain products with non-existent inventory.
- The invoice must correspond to a legitimate and validated order.
- A seller cannot settle balance without having valid commercial and banking information.

### 6.5 Lifecycle traceability

Each entity with relevant status must record its complete lifecycle:

- creation,
- modification,
- approval,
- cancellation,
- closure,
- settlement or return.

This is essential for the resolution of marketplace operations, especially in logistics, support, and administrative audit.

### 6.6 Separation of responsibilities by aggregate

Each aggregate must maintain its own consistency and not depend on direct manipulation of other aggregates. For example:

- `Inventory` manages stock.
- `Order` manages the purchase cycle.
- `Payment` manages authorization and charging.
- `Shipment` manages deliveries and tracking.
- `Return` manages refunds and resolution.


---
