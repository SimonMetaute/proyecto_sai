# Value Objects and Domain Catalogs - NexusMarket

## 1. Introduction

Value Objects represent controlled business concepts in NexusMarket. They have no identity of their own: two instances are equal when their values are equal. They are immutable after creation and encapsulate concepts that must remain valid across the marketplace.

Using Value Objects prevents arbitrary strings such as `Pending` or `Active` from spreading through the codebase. They centralize validation, make business meaning explicit, and improve type safety and maintainability.

All business catalogs in this document inherit from `DomainCatalog`. Technical fixed values that do not require business metadata are documented separately as primitive enumerations.

## 2. Value Object Hierarchy

```text
ValueObject
├── DomainCatalog (Abstract)
│   ├── UserRole
│   ├── UserStatus
│   ├── BuyerTrustLevel
│   ├── SellerVerificationStatus
│   ├── StoreStatus
│   ├── WarehouseStatus
│   ├── ProductStatus
│   ├── ProductCategory
│   ├── OrderStatus
│   ├── PaymentStatus
│   ├── InvoiceStatus
│   ├── ShipmentStatus
│   ├── InventoryMovementType
│   ├── CartStatus
│   ├── ReturnReason
│   ├── ReturnStatus
│   ├── Currency
│   ├── DocumentType
│   └── OperationType
├── IdentityDocument
├── DeliveryAddress
├── PaymentMethod
├── ProductPrice
├── WarehouseLocation
└── ShipmentTracking

Primitive Enumerations
├── ApprovalDecision
├── NotificationChannel
├── AuditSeverity
├── PersonType
└── PaymentMethodType
```

## 3. DomainCatalog (Abstract)

### Description

`DomainCatalog` is the abstract base class for all controlled business catalogs. It provides a consistent representation for values that have a stable code, a human-readable name, and business documentation.

### Attributes

| Attribute | Type | Description |
|---|---|---|
| `code` | String | Unique machine-readable code. |
| `name` | String | Human-readable display name. |
| `description` | String | Business meaning and usage of the value. |

### Characteristics

- Immutable after creation.
- Equality based on values, not object identity.
- Controlled by the domain and validated against an allowed catalog.
- Codes are unique within their catalog and stable for integrations.
- Catalog values must not be replaced by arbitrary strings in entities or services.

## 4. Business Catalog Value Objects

Each catalog below inherits from `DomainCatalog`.

## UserRole

### Description
Defines the business role that controls a user's permissions and operational scope.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `BUYER` | Buyer | Purchases products and manages their own commerce history. |
| `SELLER` | Seller | Publishes products, manages stock, and fulfills orders. |
| `LOGISTICS_OPERATOR` | Logistics Operator | Operates warehouses, shipments, and physical traceability. |
| `ADMINISTRATOR` | Administrator | Configures and controls marketplace operations. |
| `SUPERVISOR` | Supervisor | Consults operational information without critical mutations. |

## UserStatus

### Description
Represents the access and operational state of a marketplace user.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `ACTIVE` | Active | User may perform authorized operations. |
| `INACTIVE` | Inactive | User is registered but temporarily unavailable. |
| `BLOCKED` | Blocked | Access is denied by a security or business decision. |
| `PENDING_VERIFICATION` | Pending Verification | Required identity or seller validation is incomplete. |

## BuyerTrustLevel

### Description
Classifies buyer trust based on purchase behavior, payment history, and resolved incidents.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `LOW` | Low | New or restricted buyer with limited history. |
| `STANDARD` | Standard | Buyer with normal verified activity. |
| `HIGH` | High | Buyer with consistent successful transactions. |
| `REVIEW_REQUIRED` | Review Required | Activity requires additional business or fraud review. |

## SellerVerificationStatus

### Description
Controls whether a seller is eligible to commercialize products.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `PENDING` | Pending | Seller information is awaiting review. |
| `VERIFIED` | Verified | Seller passed identity and compliance validation. |
| `REJECTED` | Rejected | Seller did not satisfy validation requirements. |

## StoreStatus

### Description
Represents whether a seller's store can operate in the marketplace.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `ACTIVE` | Active | Store can publish and commercialize products. |
| `INACTIVE` | Inactive | Store is not currently available. |
| `SUSPENDED` | Suspended | Store is restricted by an administrative or policy decision. |

## WarehouseStatus

### Description
Defines warehouse readiness for inventory operations and dispatch.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `OPERATIONAL` | Operational | Warehouse may receive, reserve, and dispatch stock. |
| `CLOSED` | Closed | Warehouse cannot perform operations. |
| `MAINTENANCE` | Maintenance | Warehouse is temporarily unavailable. |

## ProductStatus

### Description
Represents product publication and availability in the catalog.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `DRAFT` | Draft | Product is being prepared and is not publicly purchasable. |
| `PUBLISHED` | Published | Product is visible and eligible for purchase. |
| `INACTIVE` | Inactive | Product has been removed from new commerce. |
| `SUSPENDED` | Suspended | Product is temporarily restricted by policy or validation. |
| `OUT_OF_STOCK` | Out of Stock | Product has no available units for purchase. |

### Lifecycle
```text
DRAFT --> PUBLISHED --> INACTIVE
				  |
				  +--> SUSPENDED --> PUBLISHED
				  |
				  +--> OUT_OF_STOCK --> PUBLISHED
```

## ProductCategory

### Description
Groups products for catalog navigation, search, reporting, and policy enforcement.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `ELECTRONICS` | Electronics | Electronic devices and accessories. |
| `HOME` | Home | Household products and equipment. |
| `CLOTHING_ACCESSORIES` | Clothing and Accessories | Apparel, footwear, and accessories. |
| `BEAUTY` | Beauty | Personal care and cosmetic products. |
| `SPORTS` | Sports | Sporting goods and fitness products. |
| `TOYS` | Toys | Toys, games, and children's products. |
| `OFFICE` | Office | Office and school supplies. |
| `HARDWARE` | Hardware | Tools, materials, and hardware products. |
| `AUTOMOTIVE` | Automotive | Vehicle parts and related products. |
| `OTHER` | Other | Valid product not covered by a specific category. |

## OrderStatus

### Description
Represents the commercial lifecycle of an order from creation to delivery, cancellation, or refund.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `PENDING` | Pending | Order created and awaiting confirmation. |
| `CONFIRMED` | Confirmed | Order conditions and payment are confirmed. |
| `PREPARING` | Preparing | Warehouse is preparing the order. |
| `SENT` | Sent | Shipment has been dispatched. |
| `DELIVERED` | Delivered | Order was delivered successfully. |
| `CANCELLED` | Cancelled | Order was cancelled under an allowed rule. |
| `REFUNDED` | Refunded | Order value was refunded after an approved return. |

### Lifecycle
```text
PENDING --> CONFIRMED --> PREPARING --> SENT --> DELIVERED --> REFUNDED
	|            |             |
	+----------> CANCELLED <---+
```

## PaymentStatus

### Description
Represents the processing result of a payment associated with an order.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `PENDING` | Pending | Payment has been created but not decided. |
| `AUTHORIZED` | Authorized | Payment gateway approved the exact amount. |
| `REJECTED` | Rejected | Payment was denied and fulfillment cannot proceed. |
| `FAILED` | Failed | Payment processing encountered a technical or operational failure. |
| `REFUNDED` | Refunded | Authorized payment was reversed through a refund. |

## InvoiceStatus

### Description
Represents the accounting state of an invoice generated from a confirmed order.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `ISSUED` | Issued | Invoice was generated and recorded. |
| `PAID` | Paid | Invoice amount was settled. |
| `CANCELLED` | Cancelled | Invoice was legally or operationally cancelled. |

## ShipmentStatus

### Description
Represents the logistics progress of a shipment.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `SCHEDULED` | Scheduled | Shipment is planned for fulfillment. |
| `IN_PREPARATION` | In Preparation | Warehouse is preparing the dispatch. |
| `IN_TRANSIT` | In Transit | Carrier has the shipment in movement. |
| `DELIVERED` | Delivered | Delivery was confirmed. |
| `FAILED` | Failed | Delivery could not be completed. |
| `RETAINED` | Retained | Shipment is held pending a resolution. |

## InventoryMovementType

### Description
Classifies stock movements to preserve inventory accuracy and traceability.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `ENTRY` | Entry | Stock received into a warehouse. |
| `RESERVATION` | Reservation | Stock committed to an open order. |
| `DEDUCTION` | Deduction | Stock removed after fulfillment or adjustment. |
| `ADJUSTMENT` | Adjustment | Controlled correction of a stock discrepancy. |
| `RELEASE` | Release | Previously reserved stock made available again. |
| `RETURN` | Return | Stock received from an approved return. |

## CartStatus

### Description
Represents the state of a buyer's shopping cart.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `OPEN` | Open | Cart accepts additions and modifications. |
| `CONVERTED` | Converted | Cart produced an order during checkout. |
| `CANCELLED` | Cancelled | Cart is no longer valid for checkout. |

## ReturnReason

### Description
Identifies the business reason supplied for a return request.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `DAMAGE` | Damage | Product arrived damaged or defective. |
| `SHIPPING_ERROR` | Shipping Error | Delivery was incorrect or failed because of logistics. |
| `DISAGREEMENT` | Disagreement | Product does not meet the buyer's justified expectation. |
| `OTHER` | Other | Eligible reason requiring case details. |

## ReturnStatus

### Description
Represents the review and resolution state of a return case.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `REQUESTED` | Requested | Buyer submitted a return request. |
| `IN_REVIEW` | In Review | Eligibility and evidence are being evaluated. |
| `APPROVED` | Approved | Return is eligible for processing. |
| `REJECTED` | Rejected | Return does not satisfy the policy. |
| `COMPLETED` | Completed | Return and any approved refund are closed. |

### Lifecycle
```text
REQUESTED --> IN_REVIEW --> APPROVED --> COMPLETED
					  |
					  +---------> REJECTED
```

## Currency

### Description
Defines a supported monetary currency and its formatting rules. `Currency` is a catalog with additional value attributes.

### Inherits From
`DomainCatalog`

### Additional Attributes
| Attribute | Type | Description |
|---|---|---|
| `code` | String | ISO-style currency code. |
| `name` | String | Currency name. |
| `symbol` | String | Display symbol. |
| `decimals` | Integer | Number of fractional decimal places. |

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `COP` | Colombian Peso | Marketplace currency with two decimal places. |
| `USD` | United States Dollar | Supported international currency. |
| `EUR` | Euro | Supported international currency. |

## DocumentType

### Description
Defines the accepted identity document types for buyer and seller verification.

### Inherits From
`DomainCatalog`

### Allowed Values
| Code | Name | Description |
|---|---|---|
| `CITIZENSHIP_CARD` | Citizenship Card | National identity document. |
| `IDENTITY_CARD` | Identity Card | General identity document. |
| `TAX_ID` | Tax ID | Tax identification document for a person or company. |
| `PASSPORT` | Passport | International identity document. |
| `FOREIGN_ID` | Foreign ID | Identity document issued by another country. |

## 5. Main Value Objects (No-Catalog)

These Value Objects do not inherit from `DomainCatalog`; they are compositions of validated values with no controlled list of alternatives.

`Currency` is the intentional exception: it inherits from `DomainCatalog` because its codes are controlled, and it also participates in monetary value composition through its additional attributes. Its definition appears in the catalog section above.

## IdentityDocument

### Description
Encapsulates the identity information used to verify buyers, sellers, and administrators.

### Attributes
| Attribute | Type | Description |
|---|---|---|
| `documentType` | DocumentType | Controlled identity document type. |
| `documentNumber` | String | Document number, validated for format and uniqueness rules. |
| `issueCountry` | String | Country that issued the document. |

### Usage
Used by `User` registration, seller verification, eligibility checks, and audit evidence.

## DeliveryAddress

### Description
Represents a validated destination for delivery and billing.

### Attributes
| Attribute | Type | Description |
|---|---|---|
| `country` | String | Destination country. |
| `department` | String | Administrative region. |
| `city` | String | Destination city. |
| `neighborhood` | String | Local area or neighborhood. |
| `address` | String | Street and number details. |
| `postalCode` | String | Postal code where applicable. |
| `reference` | String | Additional delivery instructions. |

### Usage
Owned by `Buyer` profiles and captured by `Order` and `Shipment` as an immutable transaction value.

## PaymentMethod

### Description
Encapsulates the non-sensitive payment instrument selected by a buyer.

### Attributes
| Attribute | Type | Description |
|---|---|---|
| `type` | PaymentMethodType | Technical type of payment instrument. |
| `maskedNumber` | String | Masked identifier; never stores the full secret number. |
| `cardholder` | String | Instrument holder. |
| `expirationDate` | String | Expiration metadata. |
| `brand` | String | Card or provider brand. |

### Usage
Stored in buyer payment capabilities and referenced during `Payment` authorization.

## ProductPrice

### Description
Represents a complete monetary value for a catalog product, including currency and applied tax.

### Attributes
| Attribute | Type | Description |
|---|---|---|
| `baseValue` | Decimal | Base product amount. |
| `currency` | Currency | Supported currency catalog value. |
| `appliedTax` | Decimal | Tax amount or rate applied by the domain. |
| `finalPrice` | Decimal | Resulting amount used for commerce. |

### Usage
Used by `Product`, `ProductVariant`, `OrderLine`, `Order`, and `Invoice`. Confirmed order prices are immutable historical values.

## WarehouseLocation

### Description
Encapsulates the physical location required to operate a warehouse and route shipments.

### Attributes
| Attribute | Type | Description |
|---|---|---|
| `coordinates` | String | Geographic coordinates when available. |
| `address` | DeliveryAddress | Structured physical address. |

### Usage
Used by `Warehouse`, inventory allocation, route planning, and dispatch validation.

## ShipmentTracking

### Description
Captures the carrier identifier and chronological status evidence for a shipment.

### Attributes
| Attribute | Type | Description |
|---|---|---|
| `trackingCode` | String | Unique carrier tracking code. |
| `carrier` | String | Transport provider identifier. |
| `statusUpdates` | List<ShipmentStatusUpdate> | Ordered status changes with timestamps. |

### Usage
Used by `Shipment`, logistics monitoring, buyer notifications, and delivery evidence.

## 6. OperationType Catalog (Special)

## OperationType

### Description
`OperationType` identifies a significant action or event that occurred in NexusMarket, such as publishing a product, reserving inventory, or approving a return. It is used by `Operation` and `AuditLog` to make business activity traceable.

### Inherits From
`DomainCatalog`

### Operations vs. States

An operation describes something that happened at a point in time, while a status describes the current state of an entity. For example, `PAYMENT_AUTHORIZATION` is an operation; `PaymentStatus.AUTHORIZED` is the resulting state. Operations are append-only facts and must not be used as a substitute for current state.

### User & Access Operations
| Code | Name | Description |
|---|---|---|
| `BUYER_REGISTRATION` | Buyer Registration | Buyer profile was created. |
| `SELLER_REGISTRATION` | Seller Registration | Seller profile was created. |
| `SELLER_VERIFICATION` | Seller Verification | Seller eligibility was approved or reviewed. |
| `USER_STATUS_CHANGE` | User Status Change | User access state changed. |

### Product Operations
| Code | Name | Description |
|---|---|---|
| `PRODUCT_PUBLICATION` | Product Publication | Product was created or published. |
| `PRODUCT_MODIFICATION` | Product Modification | Product data was changed. |
| `PRODUCT_UNPUBLICATION` | Product Unpublication | Product was removed from active commerce. |
| `PRODUCT_STATUS_CHANGE` | Product Status Change | Product publication or availability state changed. |

### Inventory Operations
| Code | Name | Description |
|---|---|---|
| `INVENTORY_ENTRY` | Inventory Entry | Stock entered a warehouse. |
| `INVENTORY_RESERVATION` | Inventory Reservation | Stock was reserved for an order. |
| `INVENTORY_DEDUCTION` | Inventory Deduction | Stock was deducted after fulfillment. |
| `INVENTORY_ADJUSTMENT` | Inventory Adjustment | Stock was corrected under control. |

### Purchase Operations
| Code | Name | Description |
|---|---|---|
| `CART_CREATION` | Cart Creation | Shopping cart was opened. |
| `CART_MODIFICATION` | Cart Modification | Cart contents or quantities changed. |
| `CART_CANCELLATION` | Cart Cancellation | Cart was invalidated or cancelled. |
| `ORDER_CREATION` | Order Creation | Order was created from a valid cart. |
| `ORDER_CONFIRMATION` | Order Confirmation | Order conditions were confirmed. |

### Payment Operations
| Code | Name | Description |
|---|---|---|
| `PAYMENT_CREATION` | Payment Creation | Payment attempt was created. |
| `PAYMENT_AUTHORIZATION` | Payment Authorization | Payment was authorized by the processor. |
| `PAYMENT_REJECTION` | Payment Rejection | Payment was rejected. |
| `PAYMENT_REFUND_REQUEST` | Payment Refund Request | Refund was requested for an eligible transaction. |
| `REFUND_PROCESSING` | Refund Processing | Refund was sent for processing or completed. |

### Shipment Operations
| Code | Name | Description |
|---|---|---|
| `SHIPMENT_DISPATCH` | Shipment Dispatch | Shipment left the operational warehouse. |
| `SHIPMENT_STATUS_UPDATE` | Shipment Status Update | Shipment logistics state changed. |
| `SHIPMENT_DELIVERY` | Shipment Delivery | Delivery was confirmed. |
| `SHIPMENT_FAILURE` | Shipment Failure | Delivery failed and requires resolution. |

### Post-Sale Operations
| Code | Name | Description |
|---|---|---|
| `RETURN_REQUEST` | Return Request | Buyer requested a return. |
| `RETURN_APPROVAL` | Return Approval | Return was approved after review. |
| `RETURN_REJECTION` | Return Rejection | Return was rejected with a reason. |
| `DISPUTE_RESOLUTION` | Dispute Resolution | A post-sale dispute was resolved. |

## 7. Primitive Enumerations

Primitive enumerations are technical fixed values. They do not inherit from `DomainCatalog` because they do not need a business name, description, or independently evolving catalog record.

## ApprovalDecision
### Description
Technical decision used by review workflows.
### Values
`APPROVED`, `REJECTED`

## NotificationChannel
### Description
Delivery channel for marketplace notifications.
### Values
`EMAIL`, `SMS`, `PUSH_NOTIFICATION`

## AuditSeverity
### Description
Technical severity assigned to an audit record.
### Values
`INFORMATION`, `WARNING`, `ERROR`, `CRITICAL`

## PersonType
### Description
Identifies whether a seller represents a natural or legal person.
### Values
`NATURAL_PERSON`, `LEGAL_PERSON`

## PaymentMethodType
### Description
Technical payment instrument type used by `PaymentMethod`.
### Values
`CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`, `DIGITAL_WALLET`, `CASH_ON_DELIVERY`

## 8. Value Object Design Rules

## 8.1 Immutability

Value Objects cannot change after creation. Updates create a new instance and preserve the previous value in historical transactions. This improves consistency and makes price, address, identity, and audit evidence traceable.

## 8.2 Equality

Value Objects are compared by value, not identity. Two instances with the same validated attributes represent the same Value Object.

## 8.3 Controlled Values

Use `DomainCatalog` values instead of arbitrary strings such as `Active` or `Pending`. This provides type safety, centralized validation, consistent serialization, and controlled evolution.

## 8.4 Business vs. Technical Enumerations

Use `DomainCatalog` when a value requires `code`, `name`, `description`, business validation, or controlled evolution. Use a primitive enum when the value is a small technical set with no business metadata, such as a notification channel or an approval result.

## 8.5 Relationship with Entities

Entities reference Value Objects rather than strings. For example, use `Order.orderStatus: OrderStatus`, not `Order.orderStatus: String`; use `Product.productStatus: ProductStatus` and `Payment.paymentStatus: PaymentStatus` for the same reason.

## 9. Value Object Usage Guide

| Entity | Value Objects used | Main constraints |
|---|---|---|
| `User` | `UserRole`, `UserStatus`, `IdentityDocument` | Role is controlled; identity data must be valid; status changes are auditable. |
| `Buyer` | `BuyerTrustLevel`, `DeliveryAddress`, `PaymentMethod` | Buyer needs a primary address before checkout. |
| `Seller` | `SellerVerificationStatus`, `PersonType` | Seller must be verified before publication. |
| `Store` | `StoreStatus`, `ProductCategory` | Suspended stores cannot publish products. |
| `Warehouse` | `WarehouseStatus`, `WarehouseLocation` | Dispatch requires an operational warehouse. |
| `Product` | `ProductStatus`, `ProductCategory`, `ProductPrice` | Published product requires verified seller and valid SKU/price. |
| `Inventory` | `InventoryMovementType`, `WarehouseStatus` | Available plus reserved stock must equal total stock. |
| `ShoppingCart` | `CartStatus`, `ProductPrice` | Cart contents must remain eligible and available. |
| `Order` | `OrderStatus`, `DeliveryAddress`, `Currency`, `ProductPrice` | Confirmed commercial values are preserved. |
| `Invoice` | `InvoiceStatus`, `Currency`, `ProductPrice` | Invoice must match the validated order. |
| `Payment` | `PaymentStatus`, `PaymentMethodType`, `Currency` | Authorized amount and currency cannot change after confirmation. |
| `Shipment` | `ShipmentStatus`, `ShipmentTracking`, `DeliveryAddress` | Tracking code is unique and transitions are traceable. |
| `Return` | `ReturnReason`, `ReturnStatus`, `Currency` | Return eligibility and refund amount must be validated. |
| `Operation` / `AuditLog` | `OperationType`, `UserRole`, `AuditSeverity` | Records are attributable, immutable, and append-only. |

The definitions in this document are the canonical vocabulary for controlled values in the NexusMarket domain. Entity and service contracts should reference these types directly.
