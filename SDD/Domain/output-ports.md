# Output Ports - NexusMarket

## 1. Introduction

Output Ports are interfaces owned by the NexusMarket Domain. They define the contracts through which Domain Services request persistence, security, payment, notification, configuration, or logistics capabilities from the outside world.

The Domain does not depend directly on MySQL, MongoDB, REST APIs, HTTP, Spring Framework, JPA, or any other infrastructure technology. When a Domain Service needs an external capability, it depends on an Output Port. Concrete implementations live in the Adapter layer and translate between Domain Models and external representations.

## 2. Architectural Rule

```text
Domain Service
	  |
	  v
Output Port (Interface)
	  |
	  v
Output Adapter (Implementation)
	  |
	  v
External Resource (Database, API, etc.)
```

### NexusMarket examples

```text
ProductService          -> ProductRepositoryPort
						 -> ProductMySqlAdapter
						 -> MySQL

OperationAuditService   -> AuditLogRepositoryPort
						 -> AuditLogMongoAdapter
						 -> MongoDB

PaymentService          -> PaymentGatewayPort
						 -> PaymentGatewayAdapter
						 -> External API
```

The dependency always points inward: the Domain defines the port, and infrastructure depends on that contract.

## 3. General Parameter Rule

Output Port methods work with Domain Models and Value Objects. They must not expose DTOs, persistence entities, framework types, or primitive identifiers as substitutes for domain concepts.

```text
Incorrect: Optional<Product> findById(String productId)
Correct:   Product findByIdentifier(Product product)
```

The second example is illustrative pseudocode: the actual contract should use the domain's established identity and result semantics, such as `ProductIdentifier`, `Product`, `Optional<Product>`, or a domain-specific result type defined by the project. The important rule is that the port boundary remains expressed in Domain language.

## 4. Output Ports

All interfaces below are conceptual contracts. They deliberately omit Java, Kotlin, Spring, JPA, MongoDB, and HTTP-specific syntax.

### Repository Ports

## 4.1 UserRepositoryPort

### Responsibility
Persists and retrieves `User` records, including the identity and role context shared by buyers, sellers, administrators, logistics operators, and supervisors.

### Methods
```text
interface UserRepositoryPort {
	User save(User user)
	Optional<User> findByEmail(Email email)
	Optional<User> findByIdentityDocument(IdentityDocument identityDocument)
	Optional<User> findByIdentifier(User user)
	boolean existsByEmail(Email email)
}
```

### Main Consumers
- `UserService`
- `BuyerService`
- `SellerService`
- `AuthorizationService`

### Notes
The adapter may persist profile data in several tables, but the Domain sees one user contract. Password material must never be returned by this port.

## 4.2 BuyerRepositoryPort

### Responsibility
Persists and retrieves the buyer-specific profile, addresses, payment capabilities, trust level, and purchase-history references.

### Methods
```text
interface BuyerRepositoryPort {
	Buyer save(Buyer buyer)
	Optional<Buyer> findByIdentifier(Buyer buyer)
	Optional<Buyer> findByUser(User user)
	List<Buyer> findByTrustLevel(BuyerTrustLevel trustLevel)
}
```

### Main Consumers
- `BuyerService`
- `OrderService`
- `ReturnService`

### Notes
The port does not authorize purchases; it supplies the Buyer model to the service that applies business rules.

## 4.3 SellerRepositoryPort

### Responsibility
Persists and retrieves seller profiles, verification status, store references, warehouses, and commercial account references.

### Methods
```text
interface SellerRepositoryPort {
	Seller save(Seller seller)
	Optional<Seller> findByIdentifier(Seller seller)
	Optional<Seller> findByUser(User user)
	Optional<Seller> findByCommercialName(CommercialName commercialName)
	List<Seller> findByVerificationStatus(SellerVerificationStatus status)
}
```

### Main Consumers
- `SellerService`
- `ProductService`
- `OrderService`

### Notes
Verification is a Domain decision. The adapter only persists and queries the resulting model.

## 4.4 ProductRepositoryPort

### Responsibility
Persists, retrieves, and searches catalog `Product` models while preserving publication and seller eligibility information.

### Methods
```text
interface ProductRepositoryPort {
	Product save(Product product)
	Optional<Product> findByIdentifier(Product product)
	Optional<Product> findBySku(Sku sku)
	List<Product> search(ProductCriteria criteria)
	List<Product> findBySeller(Seller seller)
}
```

### Main Consumers
- `ProductService`
- `OrderService`
- `ShoppingCartService`

### Notes
Search criteria are Domain concepts. Database query syntax must remain inside the adapter.

## 4.5 ProductVariantRepositoryPort

### Responsibility
Persists and retrieves product variants and validates their association with a parent product.

### Methods
```text
interface ProductVariantRepositoryPort {
	ProductVariant save(ProductVariant variant)
	Optional<ProductVariant> findByIdentifier(ProductVariant variant)
	List<ProductVariant> findByProduct(Product product)
	boolean existsDuplicateVariant(ProductVariant variant)
}
```

### Main Consumers
- `ProductService`
- `OrderService`
- `ShoppingCartService`

## 4.6 InventoryRepositoryPort

### Responsibility
Persists inventory state and supports transactional reservation, release, deduction, and availability checks for a product in a warehouse.

### Methods
```text
interface InventoryRepositoryPort {
	Inventory save(Inventory inventory)
	Optional<Inventory> findByProductAndWarehouse(Product product, Warehouse warehouse)
	List<Inventory> findByProduct(Product product)
	boolean hasAvailableStock(Product product, Quantity quantity)
	Inventory reserve(Product product, Warehouse warehouse, Quantity quantity, Order order)
	Inventory release(Product product, Warehouse warehouse, Quantity quantity, Order order)
	Inventory deduct(Product product, Warehouse warehouse, Quantity quantity, Order order)
}
```

### Main Consumers
- `InventoryService`
- `ProductService`
- `OrderService`
- `ShipmentService`

### Notes
Reservation and stock invariants must be atomic at the adapter boundary. The port must not leak locking or SQL concepts.

## 4.7 ShoppingCartRepositoryPort

### Responsibility
Persists and retrieves a buyer's current `ShoppingCart` and its cart lines.

### Methods
```text
interface ShoppingCartRepositoryPort {
	ShoppingCart save(ShoppingCart cart)
	Optional<ShoppingCart> findOpenByBuyer(Buyer buyer)
	Optional<ShoppingCart> findByIdentifier(ShoppingCart cart)
	void delete(ShoppingCart cart)
}
```

### Main Consumers
- `ShoppingCartService`
- `OrderService`

### Notes
Deletion means removal of an obsolete cart representation; critical business actions must be represented by status and audit operations.

## 4.8 OrderRepositoryPort

### Responsibility
Persists and retrieves the aggregate root for commercial orders and their order lines.

### Methods
```text
interface OrderRepositoryPort {
	Order save(Order order)
	Optional<Order> findByIdentifier(Order order)
	List<Order> findByBuyer(Buyer buyer)
	List<Order> findBySeller(Seller seller)
	List<Order> findByStatus(OrderStatus status)
}
```

### Main Consumers
- `OrderService`
- `PaymentService`
- `ShipmentService`
- `ReturnService`

### Notes
Confirmed prices and quantities are historical Domain values and must not be reconstructed from the current catalog.

## 4.9 InvoiceRepositoryPort

### Responsibility
Persists and retrieves invoices associated with validated orders.

### Methods
```text
interface InvoiceRepositoryPort {
	Invoice save(Invoice invoice)
	Optional<Invoice> findByIdentifier(Invoice invoice)
	Optional<Invoice> findByOrder(Order order)
	Optional<Invoice> findByInvoiceNumber(InvoiceNumber invoiceNumber)
}
```

### Main Consumers
- `BillingService`
- `PaymentService`
- `ReturnService`

### Notes
An invoice must correspond to one valid order and its financial values must remain auditable.

## 4.10 PaymentRepositoryPort

### Responsibility
Persists payment attempts and their Domain status independently of any external payment provider.

### Methods
```text
interface PaymentRepositoryPort {
	Payment save(Payment payment)
	Optional<Payment> findByIdentifier(Payment payment)
	Optional<Payment> findByOrder(Order order)
	List<Payment> findByStatus(PaymentStatus status)
}
```

### Main Consumers
- `PaymentService`
- `OrderService`
- `ReturnService`

### Notes
External transaction identifiers may be stored as Domain data, but gateway response objects never cross this boundary.

## 4.11 ShipmentRepositoryPort

### Responsibility
Persists and retrieves shipments, tracking information, delivery destinations, and logistics status.

### Methods
```text
interface ShipmentRepositoryPort {
	Shipment save(Shipment shipment)
	Optional<Shipment> findByIdentifier(Shipment shipment)
	List<Shipment> findByOrder(Order order)
	Optional<Shipment> findByTrackingCode(TrackingCode trackingCode)
	List<Shipment> findByStatus(ShipmentStatus status)
}
```

### Main Consumers
- `ShipmentService`
- `OrderService`
- `ReturnService`

### Notes
Tracking history is append-only from the Domain perspective; an adapter must not silently rewrite delivery evidence.

## 4.12 ReturnRepositoryPort

### Responsibility
Persists and retrieves return cases, review decisions, reasons, and approved refund amounts.

### Methods
```text
interface ReturnRepositoryPort {
	Return save(Return returnCase)
	Optional<Return> findByIdentifier(Return returnCase)
	List<Return> findByOrder(Order order)
	List<Return> findByStatus(ReturnStatus status)
}
```

### Main Consumers
- `ReturnService`
- `PaymentService`
- `OrderService`

### Notes
The repository does not approve returns. Eligibility, evidence, and refund rules remain in the Domain Service and Return aggregate.

## 4.13 WarehouseRepositoryPort

### Responsibility
Persists and retrieves warehouses and their operational status and location.

### Methods
```text
interface WarehouseRepositoryPort {
	Warehouse save(Warehouse warehouse)
	Optional<Warehouse> findByIdentifier(Warehouse warehouse)
	List<Warehouse> findBySeller(Seller seller)
	List<Warehouse> findByStatus(WarehouseStatus status)
}
```

### Main Consumers
- `WarehouseService`
- `InventoryService`
- `ShipmentService`

### Notes
The service decides whether a warehouse is operational; this port only provides the persisted Domain model.

## 4.14 OperationRepositoryPort

### Responsibility
Persists significant `Operation` records that connect an actor, an `OperationType`, and an affected entity.

### Methods
```text
interface OperationRepositoryPort {
	Operation append(Operation operation)
	List<Operation> findByActor(User user)
	List<Operation> findByAffectedEntity(EntityReference affectedEntity)
	List<Operation> findByType(OperationType operationType)
}
```

### Main Consumers
- `ProductService`
- `OrderService`
- `PaymentService`
- `ShipmentService`
- `ReturnService`

### Notes
Operations are append-only facts. `append` must not update or delete an existing operation.

## 4.15 AuditLogRepositoryPort

### Responsibility
Persists immutable audit records for critical operations. MongoDB is an expected adapter choice because audit details are flexible, but the Domain depends only on this interface.

### Methods
```text
interface AuditLogRepositoryPort {
	AuditLog append(AuditLog auditLog)
	List<AuditLog> findByEntity(EntityReference affectedEntity)
	List<AuditLog> findByActor(User user)
	List<AuditLog> findByDateRange(DateRange dateRange)
}
```

### Main Consumers
- `UserService`
- `BuyerService`
- `SellerService`
- `ProductService`
- `OrderService`
- `PaymentService`
- `ShipmentService`
- `ReturnService`

### Notes
The adapter must enforce append-only persistence. No port method permits update or delete. Sensitive credentials and full payment secrets must not be written to `details`.

### Service Ports

## 4.16 PasswordServicePort

### Responsibility
Hashes credentials and verifies a supplied password without exposing the hashing library or password storage mechanism to the Domain.

### Methods
```text
interface PasswordServicePort {
	PasswordHash hash(PlainPassword password)
	boolean matches(PlainPassword password, PasswordHash hash)
}
```

### Main Consumers
- `UserService`
- `AuthenticateUserService`

### Notes
Plain passwords are transient input values and must never be persisted or logged.

## 4.17 JwtServicePort

### Responsibility
Creates and validates access tokens for an authenticated user while hiding the JWT library and signing infrastructure.

### Methods
```text
interface JwtServicePort {
	AccessToken generate(User user)
	TokenClaims validate(AccessToken token)
	void revoke(AccessToken token)
}
```

### Main Consumers
- `AuthenticateUserService`
- `LogoutUserService`
- `AuthorizationService`

### Notes
Token claims are mapped to Domain authorization concepts; cryptographic keys and token format remain outside the Domain.

## 4.18 PaymentGatewayPort

### Responsibility
Authorizes, captures, and refunds payments through an external processor using Domain payment requests and results.

### Methods
```text
interface PaymentGatewayPort {
	PaymentAuthorization authorize(Payment payment)
	PaymentCapture capture(Payment payment)
	RefundResult refund(Payment payment, RefundAmount amount)
}
```

### Main Consumers
- `PaymentService`
- `ReturnService`

### Notes
Stripe, PayPal, or another provider is an adapter decision. Gateway SDK types and HTTP errors must be translated into Domain results.

## 4.19 NotificationPort

### Responsibility
Sends buyer, seller, and operator notifications through email, SMS, push, or another supported channel.

### Methods
```text
interface NotificationPort {
	NotificationResult send(Notification notification)
	NotificationResult sendToUser(User user, Notification notification)
}
```

### Main Consumers
- `UserService`
- `BuyerService`
- `SellerService`
- `OrderService`
- `PaymentService`
- `ShipmentService`
- `ReturnService`

### Notes
The Domain supplies a business notification, not an SMTP message, provider payload, or HTTP request.

## 4.20 AuthorizationPort

### Responsibility
Obtains an authorization decision when permissions depend on an external policy, tenant, compliance, or access-control system.

### Methods
```text
interface AuthorizationPort {
	AuthorizationDecision authorize(User user, DomainAction action, EntityReference resource)
}
```

### Main Consumers
- `BuyerService`
- `SellerService`
- `ProductService`
- `OrderService`
- `ReturnService`

### Notes
Authorization rules that can be evaluated from Domain Models remain in the Domain and do not require this port.

## 4.21 BusinessConfigurationPort

### Responsibility
Provides externally configurable business parameters such as return windows, commission rates, tax rules, and shipping policies.

### Methods
```text
interface BusinessConfigurationPort {
	ReturnPolicy getReturnPolicy()
	CommissionPolicy getCommissionPolicy()
	TaxPolicy getTaxPolicy()
	ShippingPolicy getShippingPolicy()
}
```

### Main Consumers
- `ProductService`
- `OrderService`
- `PaymentService`
- `ShipmentService`
- `ReturnService`

### Notes
Configuration is returned as validated Domain policy objects. The Domain must not read environment variables or configuration files directly.

## 4.22 LogisticsIntegrationPort

### Responsibility
Integrates with external carriers or fulfillment systems for dispatch, tracking, delivery confirmation, and exception handling.

### Methods
```text
interface LogisticsIntegrationPort {
	DispatchResult dispatch(Shipment shipment)
	ShipmentTracking getTracking(Shipment shipment)
	DeliveryConfirmation confirmDelivery(Shipment shipment)
	LogisticsException resolveException(Shipment shipment)
}
```

### Main Consumers
- `ShipmentService`
- `OrderService`
- `ReturnService`

### Notes
Carrier APIs, credentials, webhooks, and transport protocols belong to adapters. The port exchanges `Shipment`, `ShipmentTracking`, and Domain results.

## 5. Port Organization

```text
domain/
└── ports/
	└── out/
		├── Repository Ports
		│   ├── UserRepositoryPort
		│   ├── BuyerRepositoryPort
		│   ├── SellerRepositoryPort
		│   ├── ProductRepositoryPort
		│   ├── ProductVariantRepositoryPort
		│   ├── InventoryRepositoryPort
		│   ├── ShoppingCartRepositoryPort
		│   ├── OrderRepositoryPort
		│   ├── InvoiceRepositoryPort
		│   ├── PaymentRepositoryPort
		│   ├── ShipmentRepositoryPort
		│   ├── ReturnRepositoryPort
		│   ├── WarehouseRepositoryPort
		│   ├── OperationRepositoryPort
		│   └── AuditLogRepositoryPort
		│
		└── Service Ports
			├── PasswordServicePort
			├── JwtServicePort
			├── PaymentGatewayPort
			├── NotificationPort
			├── AuthorizationPort
			├── BusinessConfigurationPort
			└── LogisticsIntegrationPort
```

## 6. Mapping to Adapters

```text
ProductRepositoryPort
		^
		|
		+-- ProductMySqlAdapter ---> MySQL
```

```text
PaymentGatewayPort
		^
		|
		+-- StripeAdapter ---> Stripe API
		+-- PaypalAdapter ---> PayPal API
```

A port may have multiple adapters. The Domain never knows which adapter is active. Adapters translate between Domain Models and persistence, provider, or transport representations.

## 7. Database Responsibility

A port is not a one-to-one representation of a database table.

```text
UserRepositoryPort
		|
		v
UserMySqlAdapter
		|
		+-- user table
		+-- buyer_profile table
		+-- seller_profile table
```

The Domain knows only the port and its Domain Models. This allows the physical schema, database engine, indexes, and table decomposition to evolve without changing Domain Services.

## 8. Service-to-Port Relationship

| Domain Service | Output Ports used |
|---|---|
| `UserService` | `UserRepositoryPort`, `PasswordServicePort`, `JwtServicePort`, `NotificationPort`, `AuditLogRepositoryPort` |
| `BuyerService` | `BuyerRepositoryPort`, `UserRepositoryPort`, `OrderRepositoryPort`, `AuthorizationPort`, `NotificationPort`, `AuditLogRepositoryPort` |
| `SellerService` | `SellerRepositoryPort`, `UserRepositoryPort`, `ProductRepositoryPort`, `InventoryRepositoryPort`, `AuthorizationPort`, `NotificationPort`, `AuditLogRepositoryPort` |
| `ProductService` | `ProductRepositoryPort`, `ProductVariantRepositoryPort`, `SellerRepositoryPort`, `InventoryRepositoryPort`, `AuthorizationPort`, `OperationRepositoryPort`, `AuditLogRepositoryPort` |
| `OrderService` | `OrderRepositoryPort`, `BuyerRepositoryPort`, `SellerRepositoryPort`, `ProductRepositoryPort`, `InventoryRepositoryPort`, `PaymentRepositoryPort`, `ShipmentRepositoryPort`, `NotificationPort`, `AuthorizationPort`, `OperationRepositoryPort`, `AuditLogRepositoryPort` |
| `PaymentService` | `PaymentRepositoryPort`, `PaymentGatewayPort`, `OrderRepositoryPort`, `InvoiceRepositoryPort`, `NotificationPort`, `OperationRepositoryPort`, `AuditLogRepositoryPort` |
| `ShipmentService` | `ShipmentRepositoryPort`, `OrderRepositoryPort`, `InventoryRepositoryPort`, `WarehouseRepositoryPort`, `LogisticsIntegrationPort`, `NotificationPort`, `OperationRepositoryPort`, `AuditLogRepositoryPort` |
| `ReturnService` | `ReturnRepositoryPort`, `OrderRepositoryPort`, `InvoiceRepositoryPort`, `PaymentRepositoryPort`, `NotificationPort`, `AuthorizationPort`, `OperationRepositoryPort`, `AuditLogRepositoryPort` |

## 9. Final Architectural Rules

1. All Output Ports belong to the Domain.
2. Output Ports are interfaces, not concrete infrastructure classes.
3. Adapters implement Output Ports outside the Domain.
4. Domain Services never access repositories directly; they depend on repository ports.
5. Domain Services never access databases directly.
6. Domain Services never call external APIs directly.
7. Domain Services never depend on Spring, JPA, Hibernate, MongoDB, or similar infrastructure technologies.
8. Ports use Domain Models and Value Objects, never DTOs or persistence entities.
9. Domain relationships must not be represented with primitive IDs when a Domain Model or typed reference is appropriate.
10. Use an Output Port only when the required information or capability is external to the Domain.
11. Do not create a port solely because the database contains another table.
12. Business rules evaluable from Domain Models remain in the Domain.
13. External or configurable business information is accessed through an appropriate Output Port.
14. Persistence adapters translate between Domain Models and persistence representations.
15. The Domain must be fully testable without a database, provider SDK, network, or other external infrastructure.

