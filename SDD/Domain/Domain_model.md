# Plantilla
├──, └──, │

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

### 2.16 Operation

`Operation` represents a significant business action executed by a user or by an authorized system process. It connects the actor, the action, and the entity affected, providing the traceability reference used by `AuditLog`.

| Attribute | Type | Description |
|---|---|---|
| operationId | UUID | Unique operation identifier. |
| operationType | OperationType | Type of business operation performed. |
| executionDate | DateTime | Date and time when the operation occurred. |
| performedBy | User | User or authorized actor that performed the operation. |
| affectedEntity | UUID | Identifier of the affected entity. |
| affectedEntityType | String | Type of entity affected by the operation. |

Business rules:
- Every critical operation must identify its performer and affected entity.
- `operationType` must be a valid value from the `OperationType` catalog.
- An operation must preserve the execution time and cannot be silently overwritten.

### 2.17 AuditLog

`AuditLog` is the immutable, append-only record of critical `Operation` instances. It supports regulatory compliance, incident investigation, and reconstruction of the domain state over time.

| Attribute | Type | Description |
|---|---|---|
| auditId | UUID | Unique audit record identifier. |
| operationType | OperationType | Type of operation recorded. |
| operationDate | DateTime | Date and time of the recorded operation. |
| performedBy | User | User or authorized actor responsible for the operation. |
| userRole | Enum | Role held by the actor when the operation occurred. |
| affectedEntity | UUID | Identifier of the affected entity. |
| details | JSON | Flexible operation details and contextual evidence. |
| severity | Enum | Business or compliance impact level of the event. |

Business rules:
- `AuditLog` records are immutable after creation.
- Audit records are append-only: new records may be added, but existing records cannot be updated or deleted.
- Every critical `Operation` must produce an associated audit record.
- `details` must not contain credentials, payment secrets, or other prohibited sensitive data.

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

### 4.1 Domain Relationships Diagram

The following diagrams make explicit how the principal aggregates collaborate during the marketplace lifecycle.

#### 4.1.1 Relationship overview

```text
                      +------------------+
                      |      User        |
                      +---------+--------+
                          |
                +------------------+------------------+
                |                                     |
                v                                     v
            +-------------+                       +-------------+
            |    Buyer    |                       |    Seller   |
            +------+------+                       +------+------+
                |                                     |
           +-------+-------+                 +-----------+-----------+
           |               |                 |           |           |
           v               v                 v           v           v
       +--------------+ +-----------+      +---------+ +---------+ +----------------+
       | ShoppingCart | |   Order   |      |  Store  | | Product | |   Warehouse    |
       +------+-------+ +-----+-----+      +---------+ +----+----+ +-------+--------+
           |               |                           |                |
           | converts to   |                           | has            | stores
           +-------------->+                           v                v
                  +--+---------+             +---------+    +-------------+
                  |            |             | Variant |    |  Inventory  |
                  v            v             +---------+    +-------------+
                +---------+  +---------+
                | Invoice |  | Payment |
                +---------+  +---------+
                  |
                  v
                +---------+
                | Return  |
                +---------+

                Order ----> Shipment ----> DeliveryAddress / Carrier
                  |
                  +-------> OrderLine ----> Product / ProductVariant
```

#### 4.1.2 Main cardinalities

```text
User           1 ---- 0..1 Buyer
User           1 ---- 0..1 Seller
Buyer          1 ---- 0..1 ShoppingCart
Buyer          1 ---- 0..* Order
Seller         1 ---- 1..* Product
Seller         1 ---- 0..* Store
Seller         1 ---- 0..* Warehouse
Product        1 ---- 0..* ProductVariant
Product        1 ---- 0..* Inventory
Warehouse      1 ---- 0..* Inventory
ShoppingCart   1 ---- 0..* CartLine
ShoppingCart   1 ---- 0..1 Order       (after checkout)
Order          1 ---- 1..* OrderLine
Order          1 ---- 0..1 Invoice
Order          1 ---- 0..* Payment
Order          1 ---- 0..* Shipment
Order          1 ---- 0..* Return
OrderLine      * ---- 1    Product
OrderLine      0..* -- 0..1 ProductVariant
Shipment       * ---- 1    Warehouse
Shipment       * ---- 1    DeliveryAddress
```

Legend: `1` means exactly one, `0..1` means optional and unique, `0..*` means zero or more, and `1..*` means one or more. The `Order` created during checkout is the transactional reference used by billing, payment, logistics, and post-sale processes.

### 4.2 User - Buyer Relationship

- A `User` can be registered as a `Buyer`.
- A buyer can have multiple `DeliveryAddresses`.
- A buyer can have several `PaymentMethods`.
- A buyer can generate multiple `Orders`.
- A buyer can have a purchase history and ratings.

### 4.3 User - Seller Relationship

- A `User` can be registered as a `Seller`.
- A seller can own one or several `Stores`.
- A seller can manage several `Warehouses`.
- A seller can publish multiple `Products`.
- A seller can have a `CommercialAccount` for settlements and commissions.

### 4.4 Seller - Product Relationship

- A seller publishes one or more products.
- Each product belongs to a category.
- A product can have multiple `ProductVariants`.
- A product can be associated with stock records and availability per warehouse.

### 4.5 Product - Inventory Relationship

- A product is associated with inventory records.
- Inventory is managed by warehouse.
- The system validates real availability before confirming a cart or order.
- Stock can be updated by entry/exit movements.

### 4.6 Buyer - Cart - Order Relationship

- A buyer creates a `ShoppingCart`.
- The cart accumulates purchase lines (`CartLine`).
- When the buyer confirms the purchase, the cart becomes an `Order`.
- The order creates a purchase order linked to product, quantities, value, and logistics.

### 4.7 Order - Invoice - Payment Relationship

- An order generates an `Invoice` when the purchase is completed.
- The order requires an associated `Payment`.
- Payment can be in pending, authorized, rejected, or refunded status.
- The invoice reflects taxes, totals, and marketplace commissions.

### 4.8 Order - Logistics Relationship

- An order can generate one or several `DeliveryOrders`.
- The shipment is associated with a delivery address and a carrier.
- The shipment status is updated during the delivery cycle.
- Logistics may require coordination with the warehouse and seller.

### 4.9 Order - Post-Sale Relationship

- An order can have returns, claims, and refunds.
- A return is associated with a reason, status, and case evaluation.
- The platform can issue a dispute resolution or case closure.

---

## 4.10 Domain Lifecycle Examples

The following examples describe the main state transitions of NexusMarket. Each transition emits a critical domain event and must be recorded as an `Operation` and, when applicable, an `AuditLog` entry. Cross-aggregate coordination is performed through application services or domain events; aggregates preserve their own internal consistency.

### 4.10.1 Order Processing Lifecycle

```text
ShoppingCart: Open
  |
  | CheckoutCart / CART_CREATION
  | Validate buyer, items, seller eligibility, prices, and stock
  v
Order: Pending
  |
  | CreateOrder / ORDER_CREATION
  | Copy cart lines and commercial conditions into the order
  v
Order: Confirmed <-----------------------------+
  |                                           |
  | AuthorizePayment / PAYMENT_AUTHORIZATION  | Payment rejected
  | Validate enabled method and exact amount  | PAYMENT_REJECTION
  v                                           |
Payment: Authorized                           v
  |                                      Order: Cancelled
  | ReserveInventory / INVENTORY_RESERVATION
  | Validate availableStock >= requested quantity
  v
Inventory: Reserved
  |
  | Prepare and dispatch / SHIPMENT_DISPATCH
  | Validate payment authorization and operational warehouse
  v
Shipment: InTransit
  |
  | DeliverShipment / SHIPMENT_DELIVERY
  | Confirm tracking and delivery evidence
  v
Order: Delivered
```

| Transition | Critical event | Entities involved | Restrictions and validations |
|---|---|---|---|
| `ShoppingCart: Open` -> `Order: Pending` | `ORDER_CREATION` | `Buyer`, `ShoppingCart`, `CartLine`, `Order`, `Product` | Buyer is active; cart is valid; quantities are positive; products are published and eligible. |
| `Order: Pending` -> `Order: Confirmed` | `ORDER_CONFIRMATION` | `Order`, `OrderLine`, `Payment` | Totals and taxes are consistent; payment method is enabled; buyer has a valid delivery address. |
| Payment -> `Authorized` | `PAYMENT_AUTHORIZATION` | `Payment`, `Order`, `Buyer` | Authorized amount equals the confirmed order total; rejected payments cannot continue. |
| Inventory -> `Reserved` | `INVENTORY_RESERVATION` | `Inventory`, `Warehouse`, `OrderLine` | Warehouse is operational; available stock covers every requested line; reservation is transactional. |
| Order -> Shipment | `SHIPMENT_DISPATCH` | `Order`, `Shipment`, `Warehouse`, `Carrier` | Payment is authorized, inventory is reserved, and tracking code is unique. |
| Shipment -> `Delivered` | `SHIPMENT_DELIVERY` | `Shipment`, `DeliveryAddress`, `Carrier`, `Order` | Delivery evidence exists; status cannot skip required logistics transitions. |

### 4.10.2 Product Publication Lifecycle

```text
User: Registered
  |
  | RegisterVendor / SELLER_REGISTRATION
  | Validate identity and commercial information
  v
Seller: PendingVerification
  |
  | ApproveVendor / SELLER_VERIFICATION
  | Validate compliance and seller eligibility
  v
Seller: Verified
  |
  | CreateProduct / PRODUCT_PUBLICATION
  | Create product with catalog data and draft status
  v
Product: Draft
  |
  | PublishProduct / PRODUCT_PUBLICATION
  | Validate category, SKU, price, variants, and verified seller
  v
Product: Published
  |
  +--> PRODUCT_STATUS_CHANGE --> Product: Suspended
  |                                  |
  |                                  +--> PRODUCT_STATUS_CHANGE --> Published
  |
  +--> PRODUCT_STATUS_CHANGE --> Product: OutOfStock
  |                                  |
  |                                  +--> INVENTORY_ENTRY --------> Published
  |
  +--> PRODUCT_UNPUBLICATION --> Product: Inactive
```

| Transition | Critical event | Entities involved | Restrictions and validations |
|---|---|---|---|
| User -> `Seller: PendingVerification` | `SELLER_REGISTRATION` | `User`, `Seller`, `IdentityDocument` | Identity and commercial data are complete; seller cannot publish yet. |
| Seller -> `Verified` | `SELLER_VERIFICATION` | `Seller`, `User`, `Operation`, `AuditLog` | Only an authorized role may approve; verification decision is auditable. |
| Seller -> `Product: Draft` | `PRODUCT_PUBLICATION` | `Seller`, `Store`, `Product` | Seller exists and is associated with an active store. |
| Draft -> `Published` | `PRODUCT_PUBLICATION` | `Product`, `ProductVariant`, `ProductCategory`, `ProductPrice` | Seller is verified; SKU is unique; catalog data, price, and variants are valid. |
| Published -> `Suspended` / `OutOfStock` | `PRODUCT_STATUS_CHANGE` | `Product`, `Inventory`, `Seller` | Suspension follows policy; out-of-stock status reflects zero available stock. |
| Published -> `Inactive` | `PRODUCT_UNPUBLICATION` | `Product`, `Seller`, `Operation`, `AuditLog` | Product is removed from new purchases without altering historical order lines. |

### 4.10.3 Return & Refund Lifecycle

```text
Order: Delivered
  |
  | RequestReturn / RETURN_REQUEST
  | Validate return window, order status, reason, and evidence
  v
Return: Requested
  |
  | ReviewReturn
  | Check eligibility, invoice, items, and evidence
  v
Return: InReview
  |
  +--> ApproveReturn / RETURN_APPROVAL --> Return: Approved
  |                                           |
  |                                           | ProcessRefund / REFUND_PROCESSING
  |                                           | Validate original payment and amount
  |                                           v
  |                                       Payment: Refunded
  |                                           |
  |                                           v
  |                                       Return: Completed
  |
  +--> RejectReturn / RETURN_REJECTION --> Return: Rejected
                        |
                        +--> DISPUTE_RESOLUTION (if challenged)
```

| Transition | Critical event | Entities involved | Restrictions and validations |
|---|---|---|---|
| Delivered order -> `Return: Requested` | `RETURN_REQUEST` | `Buyer`, `Order`, `Return`, `Invoice` | Order is eligible; request is within the allowed period; reason and evidence are recorded. |
| Requested -> `InReview` | `RETURN_REQUEST` | `Return`, `OrderLine`, `Product`, `Operation` | Requested items belong to the order; no duplicate active return exists for the same item. |
| In review -> `Approved` | `RETURN_APPROVAL` | `Return`, `Order`, `Seller`, `AuditLog` | Evidence and case validation support approval; refund cannot exceed the eligible amount. |
| In review -> `Rejected` | `RETURN_REJECTION` | `Return`, `Buyer`, `Operation`, `AuditLog` | Rejection reason is mandatory and must be traceable. |
| Approved -> refunded/completed | `REFUND_PROCESSING` | `Return`, `Payment`, `Invoice`, `Buyer` | Refund uses the original transaction; amount and currency match the approved return; result is recorded. |

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

#### OperationType Catalog

| Domain | Operation types |
|---|---|
| User & Access | `BUYER_REGISTRATION`, `SELLER_REGISTRATION`, `SELLER_VERIFICATION`, `USER_STATUS_CHANGE` |
| Products | `PRODUCT_PUBLICATION`, `PRODUCT_MODIFICATION`, `PRODUCT_UNPUBLICATION`, `PRODUCT_STATUS_CHANGE` |
| Inventory | `INVENTORY_ENTRY`, `INVENTORY_RESERVATION`, `INVENTORY_DEDUCTION`, `INVENTORY_ADJUSTMENT` |
| Purchase | `CART_CREATION`, `CART_MODIFICATION`, `CART_CANCELLATION`, `ORDER_CREATION`, `ORDER_CONFIRMATION` |
| Payment | `PAYMENT_CREATION`, `PAYMENT_AUTHORIZATION`, `PAYMENT_REJECTION`, `PAYMENT_REFUND_REQUEST`, `REFUND_PROCESSING` |
| Shipping | `SHIPMENT_DISPATCH`, `SHIPMENT_STATUS_UPDATE`, `SHIPMENT_DELIVERY`, `SHIPMENT_FAILURE` |
| After-sales | `RETURN_REQUEST`, `RETURN_APPROVAL`, `RETURN_REJECTION`, `DISPUTE_RESOLUTION` |

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

### 6.6 Critical Operations and Audit Events

Each state transition that changes a business commitment must create an `Operation` with its `OperationType` and append an `AuditLog` record. Domain events may coordinate other aggregates asynchronously, but they must carry the operation identifier and preserve ordering and correlation information for reconstruction of the business flow.

### 6.7 Aggregate Boundaries and Responsibilities

NexusMarket is organized into aggregates with explicit consistency boundaries. Each aggregate owns its state and invariants; coordination with another aggregate occurs through an application service, an identifier reference, or a domain event, never through direct access to another aggregate's internal objects.

| Aggregate | Root responsibility | Boundary and consistency rules |
|---|---|---|
| `User` | Identity, role, and account status | Owns identity and access state. `Buyer` and `Seller` profiles reference the user without modifying its internal state. |
| `Product` | Catalog definition and publication state | Owns product data, variants, price, category, and publication lifecycle. It does not reserve or deduct inventory directly. |
| `Order` | Commercial transaction and order lines | Owns purchased quantities, prices, totals, and order status. It references payment, inventory, and shipment by identifiers or events. |
| `Inventory` | Stock quantities and reservations per warehouse | Owns available, reserved, and total stock. It validates stock invariants and does not change order state directly. |
| `Shipment` | Dispatch and delivery tracking | Owns carrier, tracking, destination, and shipment status. It consumes fulfillment information but does not own inventory or payment state. |
| `Return` | Return case and refund eligibility | Owns reason, evidence, review decision, and approved amount. It requests refund processing without changing payment internals directly. |

The aggregate root is the only entry point for changes inside its boundary. Repositories load and persist one aggregate at a time, and cross-aggregate workflows must tolerate eventual consistency while preserving the required business invariants.

### 6.8 Critical Operational Constraints

The following constraints are mandatory for the main marketplace workflows:

| Area | Constraint | Enforcement point |
|---|---|---|
| Buyer | A buyer must have at least one valid primary `DeliveryAddress` before checkout. | Cart validation and order creation. |
| Buyer | A buyer cannot purchase a product when the required quantity is unavailable. | Inventory availability validation and reservation. |
| Seller | A seller must be verified before publishing or modifying a product's public state. | Seller authorization and product publication. |
| Seller | A seller must have at least one operational `Warehouse` to fulfill an order. | Shipment preparation and dispatch. |
| Order | A valid, authorized `Payment` is required before shipment preparation or dispatch. | Order confirmation and logistics workflow. |
| Order | An order cannot be modified once its shipment is `InTransit`; only permitted status transitions remain available. | Order aggregate state transition. |
| Order | Historical order lines preserve the confirmed product, quantity, price, and tax values. | Order confirmation and post-sale processing. |
| Payment | Payment must be authorized before fulfillment proceeds. | Payment authorization and order workflow. |
| Payment | The authorized amount and currency cannot change after order confirmation; a correction requires a controlled cancellation or refund flow. | Payment aggregate and refund process. |
| Audit | Critical operations must be attributable, immutable, and append-only. | `Operation` creation and `AuditLog` persistence. |

### 6.9 Separation of responsibilities by aggregate

Each aggregate must maintain its own consistency and not depend on direct manipulation of other aggregates. For example:

- `Inventory` manages stock.
- `Order` manages the purchase cycle.
- `Payment` manages authorization and charging.
- `Shipment` manages deliveries and tracking.
- `Return` manages refunds and resolution.


---
