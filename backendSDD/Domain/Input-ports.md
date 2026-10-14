# Input Ports (Role-Based Use Case Interfaces) - NexusMarket

The language-independent signatures and Java/TypeScript adaptation rules are defined in `SDD/Contract-alignment.md`. The Java snippets below are semantic contracts: TypeScript uses the same parameters and `Promise<T>` for I/O-bound operations. It must not silently add or remove business parameters.

## 1. Overview

Input Ports define the application entry contracts through which external delivery mechanisms (such as REST Controllers) interact with the core domain.

In this architecture, **Input Ports are organized strictly by System Roles (`UserRole`)**, plus a public access port for unauthenticated operations. This ensures that:
- Every role exposes a dedicated, cohesive interface with the exact operations allowed for that role.
- REST Controllers and Security filters evaluate role permissions directly against the targeted Role Input Port.
- Methods in Input Ports operate exclusively on **Domain Models** and **Value Objects**, receiving the `User` domain object (reconstructed from JWT claims) and domain entities as parameters.

---

# 2. General Principles

### 2.1 Role Isolation
Each system role interacts with the application through its corresponding Role Input Port interface in `domain/ports/in/`:
- `PublicAccessPort` (Public / Unauthenticated)
- `BuyerPort` (`BUYER`)
- `SellerPort` (`SELLER`)
- `LogisticsOperatorPort` (`LOGISTICS_OPERATOR`)
- `AdministratorPort` (`ADMINISTRATOR`)
- `SupervisorPort` (`SUPERVISOR`)

### 2.2 Domain Model Parameters
All Input Port methods receive **Domain Models** (e.g., `User`, `Buyer`, `Seller`, `Product`, `Order`, `Shipment`, `Return`) instead of primitive IDs or DTOs.
The `User` domain model passed to each service contains the identity, role, and associated customer details reconstructed from the JWT token claims.

---

# 3. Input Port Definitions

## 3.1 PublicAccessPort
Exposes public operations that do not require prior authentication or are required for initial onboarding and authentication.

```java
public interface PublicAccessPort {
    // Authentication & User Registration
    User login(Email email, Password password);
    void logout(User user);
    User registerBuyer(Buyer buyer);
    User registerSeller(Seller seller);
    
    // Catalog Visibility
    List<Product> searchPublicCatalog(SearchCriteria criteria);
    Product consultPublicProductDetails(Product product);
}
```

---

## 3.2 BuyerPort (`BUYER`)
Exposes operations for buyers to manage their profile, shopping cart, orders, and post-sale activities.

```java
public interface BuyerPort {
    // Profile Management
    Buyer consultMyProfile(User user);
    Buyer updateMyProfile(User user, Buyer buyer);
    Buyer consultMyTrustLevel(User user);
    
    // Address Management
    List<DeliveryAddress> consultMyDeliveryAddresses(User user);
    DeliveryAddress addDeliveryAddress(User user, DeliveryAddress address);
    DeliveryAddress setPrimaryDeliveryAddress(User user, DeliveryAddress address);
    void removeDeliveryAddress(User user, DeliveryAddress address);
    
    // Payment Methods
    List<PaymentMethod> consultMyPaymentMethods(User user);
    PaymentMethod addPaymentMethod(User user, PaymentMethod method);
    PaymentMethod setDefaultPaymentMethod(User user, PaymentMethod method);
    void removePaymentMethod(User user, PaymentMethod method);
    
    // Shopping Cart
    ShoppingCart createCart(User user);
    ShoppingCart consultMyCart(User user);
    ShoppingCart addItemToCart(User user, ShoppingCart cart, Product product, ProductVariant variant, Quantity quantity);
    ShoppingCart updateCartItem(User user, ShoppingCart cart, CartLine line, Quantity newQuantity);
    ShoppingCart removeCartItem(User user, ShoppingCart cart, CartLine line);
    ShoppingCart mergeCart(User user, ShoppingCart currentCart, ShoppingCart previousCart);
    void cancelCart(User user, ShoppingCart cart);
    
    // Checkout & Orders
    Order checkoutCart(User user, ShoppingCart cart, DeliveryAddress deliveryAddress, PaymentMethod paymentMethod);
    List<Order> consultMyOrders(User user);
    Order consultOrderDetails(User user, Order order);
    List<Operation> consultMyOrderHistory(User user, Order order);
    Order updateOrderDeliveryAddress(User user, Order order, DeliveryAddress newAddress);
    
    // Shipment Tracking
    Shipment trackShipment(User user, Shipment shipment);
    List<ShipmentStatusUpdate> consultShipmentProgress(User user, Shipment shipment);
    
    // Returns & Refunds
    Return requestReturn(User user, Order order, ReturnReason reason, String evidence);
    List<Return> consultMyReturns(User user);
    Return consultReturnDetails(User user, Return returnCase);
    
    // Preferences & Privacy
    BuyerPreferences consultMyPreferences(User user);
    BuyerPreferences updateMyPreferences(User user, BuyerPreferences preferences);
    void grantDataPrivacyConsent(User user, PrivacyPolicy policy);
    void revokeDataPrivacyConsent(User user, PrivacyPolicy policy);
    String exportMyPrivacyData(User user);
}
```

---

## 3.3 SellerPort (`SELLER`)
Exposes operations for sellers to manage their store, products, inventory, orders, and settlement.

```java
public interface SellerPort {
    // Profile & Store Management
    Seller consultMyProfile(User user);
    Seller updateMyProfile(User user, Seller seller);
    Store consultMyStore(User user);
    Store updateMyStore(User user, Store store);
    StoreStatus changeStoreStatus(User user, Store store, StoreStatus newStatus);
    CommercialAccount consultMyCommercialAccount(User user);
    
    // Warehouse Management
    List<Warehouse> consultMyWarehouses(User user);
    Warehouse registerWarehouse(User user, Warehouse warehouse);
    Warehouse updateWarehouse(User user, Warehouse warehouse);
    WarehouseStatus changeWarehouseStatus(User user, Warehouse warehouse, WarehouseStatus newStatus);
    
    // Product Catalog Management
    Product createProduct(User user, Product product);
    Product updateProduct(User user, Product product);
    void publishProduct(User user, Product product);
    void removeProduct(User user, Product product);
    void suspendProduct(User user, Product product, String reason);
    
    // Product Variants & Attributes
    ProductVariant addProductVariant(User user, Product product, ProductVariant variant);
    ProductVariant updateProductVariant(User user, ProductVariant variant);
    void removeProductVariant(User user, ProductVariant variant);
    List<ProductAttribute> manageProductAttributes(User user, Product product, List<ProductAttribute> attributes);
    
    // Inventory Management
    List<Inventory> consultMyInventory(User user);
    Inventory consultInventoryByProduct(User user, Product product, Warehouse warehouse);
    Inventory registerStockEntry(User user, Inventory inventory, Quantity quantity, String receiptReference);
    Inventory adjustInventory(User user, Product product, Warehouse warehouse, Quantity adjustment, String reason);
    void allocateInventoryForOrder(User user, Order order);
    
    // Order Management & Fulfillment
    List<Order> consultMyOrdersForFulfillment(User user);
    Order consultOrderDetails(User user, Order order);
    Order approveOrder(User user, Order order);
    Order prepareOrder(User user, Order order);
    
    // Shipment & Dispatch
    Shipment createShipment(User user, Order order, Warehouse warehouse, DeliveryAddress address);
    Shipment selectCarrier(User user, Shipment shipment, Carrier carrier, String service);
    Shipment dispatchShipment(User user, Shipment shipment);
    List<Shipment> consultMyShipments(User user);
    Shipment trackShipment(User user, Shipment shipment);
    
    // Financial Management & Settlement
    List<Payment> consultPaymentsForMyOrders(User user);
    SettlementPreview previewSettlement(User user, DateRange period);
    Settlement processSettlement(User user, Settlement settlement);
    List<Commission> consultMyCommissions(User user, DateRange period);
    
    // Returns & Refunds (Seller Side)
    List<Return> consultReturnRequests(User user);
    Return consultReturnDetails(User user, Return returnCase);
    Return approveReturn(User user, Return returnCase);
    Return rejectReturn(User user, Return returnCase, String reason);
    
    // Performance & Analytics
    SellerPerformanceMetrics consultMyPerformance(User user);
    List<AuditLog> consultMyOperationHistory(User user, DateRange period);
}
```

---

## 3.4 LogisticsOperatorPort (`LOGISTICS_OPERATOR`)
Exposes operations for logistics operators to manage warehouse operations, inventory movements, and shipment dispatch.

```java
public interface LogisticsOperatorPort {
    // Warehouse Operations
    List<Warehouse> consultOperationalWarehouses(User user);
    Warehouse consultWarehouseDetails(User user, Warehouse warehouse);
    WarehouseStatus changeWarehouseStatus(User user, Warehouse warehouse, WarehouseStatus newStatus);
    
    // Inventory Operations
    List<Inventory> consultInventoryByWarehouse(User user, Warehouse warehouse);
    Inventory registerStockEntry(User user, Inventory inventory, Quantity quantity, String receiptReference);
    Inventory registerStockMovement(User user, Inventory inventory, InventoryMovementType movementType, Quantity quantity, String reason);
    Inventory adjustInventory(User user, Inventory inventory, Quantity adjustment, String reason);
    List<InventoryMovement> consultInventoryMovementHistory(User user, Warehouse warehouse, DateRange period);
    
    // Shipment Preparation & Dispatch
    List<Shipment> consultShipmentsReadyForDispatch(User user);
    Shipment prepareShipment(User user, Shipment shipment);
    Shipment selectCarrier(User user, Shipment shipment, Carrier carrier, String service);
    ShippingCost calculateShippingCost(User user, Shipment shipment);
    Shipment dispatchShipment(User user, Shipment shipment);
    
    // Shipment Tracking & Exception Handling
    List<Shipment> consultActiveShipments(User user);
    Shipment trackShipment(User user, Shipment shipment);
    List<ShipmentStatusUpdate> consultShipmentProgress(User user, Shipment shipment);
    Shipment handleDeliveryException(User user, Shipment shipment, String exceptionType, String details);
    Shipment confirmDelivery(User user, Shipment shipment);
    
    // Return Receipt & Processing
    List<Return> consultReturnShipmentsInTransit(User user);
    Shipment receiveReturnedStock(User user, Shipment returnShipment);
    Inventory registerReturnedStock(User user, Inventory inventory, Quantity quantity, String condition);
    
    // Warehouse Allocation & Optimization
    List<Warehouse> suggestOptimalWarehouseAllocation(User user, Order order);
    void rebalanceInventoryBetweenWarehouses(User user, Product product, Warehouse sourceWarehouse, Warehouse targetWarehouse, Quantity quantity);
}
```

---

## 3.5 AdministratorPort (`ADMINISTRATOR`)
Exposes high-privilege operations for system configuration, seller/buyer management, marketplace policies, compliance, and full operational oversight.

```java
public interface AdministratorPort {
    // User Management
    User registerEmployeeUser(User user, User newEmployee);
    List<User> consultUsers(User user, UserFilterCriteria criteria);
    User consultUserDetails(User user, User targetUser);
    User changeUserStatus(User user, User targetUser, UserStatus newStatus);
    User changeUserRole(User user, User targetUser, UserRole newRole);
    void suspendUserAccess(User user, User targetUser, String reason);
    void reactivateUserAccess(User user, User targetUser);
    
    // Buyer Management & Trust
    List<Buyer> consultBuyers(User user, BuyerFilterCriteria criteria);
    Buyer consultBuyerDetails(User user, Buyer buyer);
    Buyer changeCustomerStatus(User user, Buyer buyer, BuyerStatus newStatus);
    BuyerTrustLevel assessBuyerTrustProfile(User user, Buyer buyer);
    void restrictBuyerAccess(User user, Buyer buyer, String reason);
    
    // Seller Verification & Compliance
    List<Seller> consultPendingSellerVerifications(User user);
    List<Seller> consultAllSellers(User user, SellerFilterCriteria criteria);
    Seller consultSellerDetails(User user, Seller seller);
    Seller approveSeller(User user, Seller seller);
    Seller rejectSeller(User user, Seller seller, String reason);
    Seller revokeSellerAccess(User user, Seller seller, String reason);
    Seller changeSeller Status(User user, Seller seller, SellerVerificationStatus newStatus);
    SellerComplianceReview reviewSellerCompliance(User user, Seller seller);
    
    // Product Catalog Control
    List<Product> consultSuspendedProducts(User user);
    List<Product> consultProductsForApproval(User user);
    Product approveProduct(User user, Product product);
    Product rejectProduct(User user, Product product, String reason);
    Product suspendProduct(User user, Product product, String reason);
    Product reactivateProduct(User user, Product product);
    
    // Marketplace Policies & Configuration
    TaxPolicy consultTaxPolicy(User user);
    TaxPolicy updateTaxPolicy(User user, TaxPolicy policy);
    CommissionPolicy consultCommissionPolicy(User user);
    CommissionPolicy updateCommissionPolicy(User user, CommissionPolicy policy);
    ReturnPolicy consultReturnPolicy(User user);
    ReturnPolicy updateReturnPolicy(User user, ReturnPolicy policy);
    ShippingPolicy consultShippingPolicy(User user);
    ShippingPolicy updateShippingPolicy(User user, ShippingPolicy policy);
    
    // KPI & Metrics Management
    KPIDefinition defineKPI(User user, KPIDefinition kpiDefinition);
    List<KPIDefinition> consultDefinedKPIs(User user);
    
    // Financial & Settlement Oversight
    List<Settlement> consultAllSettlements(User user, DateRange period);
    Settlement consultSettlementDetails(User user, Settlement settlement);
    Payment reconcilePayment(User user, Payment payment);
    Invoice consultInvoiceDetails(User user, Invoice invoice);
    
    // Returns & Disputes Management
    List<Return> consultAllReturns(User user, ReturnFilterCriteria criteria);
    Return consultReturnDetails(User user, Return returnCase);
    Return approveReturn(User user, Return returnCase);
    Return rejectReturn(User user, Return returnCase, String reason);
    List<Dispute> consultAllDisputes(User user, DisputeFilterCriteria criteria);
    Dispute resolveDispute(User user, Dispute dispute, String resolution);
    
    // Operational Monitoring & Alerts
    OperationalDashboard consultOperationalDashboard(User user);
    List<AnomalyAlert> consultActiveAnomalies(User user);
    AnomalyAlert investigateAnomaly(User user, AnomalyAlert anomaly);
    
    // Audit & Compliance
    List<AuditLog> consultAuditLogs(User user, AuditFilterCriteria criteria);
    List<Operation> consultAllOperations(User user, OperationFilterCriteria criteria);
    void reconcileAuditRecords(User user, AuditReconciliationRequest request);
}
```

---

## 3.6 SupervisorPort (`SUPERVISOR`)
Exposes read-only and limited operations for supervisors to monitor marketplace health, review key metrics, and escalate issues without making critical mutations.

```java
public interface SupervisorPort {
    // Dashboard & Monitoring
    OperationalDashboard consultOperationalDashboard(User user);
    List<KPIMetric> consultKPIMetrics(User user, DateRange period);
    List<AnomalyAlert> consultActiveAnomalies(User user);
    MarketplaceHealthStatus consultMarketplaceHealth(User user);
    
    // Order Monitoring
    List<Order> consultOrdersByStatus(User user, OrderStatus status);
    Order consultOrderDetails(User user, Order order);
    List<Operation> consultOrderTimeline(User user, Order order);
    
    // Payment & Financial Monitoring
    List<Payment> consultPaymentsByStatus(User user, PaymentStatus status);
    Payment consultPaymentDetails(User user, Payment payment);
    FinancialSummary consultFinancialSummary(User user, DateRange period);
    
    // Shipment Tracking
    List<Shipment> consultShipmentsByStatus(User user, ShipmentStatus status);
    Shipment consultShipmentDetails(User user, Shipment shipment);
    List<ShipmentStatusUpdate> consultShipmentProgress(User user, Shipment shipment);
    
    // Return & Dispute Monitoring
    List<Return> consultReturnsByStatus(User user, ReturnStatus status);
    Return consultReturnDetails(User user, Return returnCase);
    List<Dispute> consultDisputes(User user);
    
    // Seller Performance Review
    List<SellerPerformanceMetrics> consultSellerPerformance(User user);
    SellerPerformanceMetrics consultSellerPerformanceDetails(User user, Seller seller);
    
    // Buyer Risk Assessment
    BuyerRiskScore assessBuyerRisk(User user, Buyer buyer);
    List<BuyerRiskScore> consultHighRiskBuyers(User user);
    
    // Audit Trail Review (Read-Only)
    List<AuditLog> consultAuditLogs(User user, AuditFilterCriteria criteria);
    List<Operation> consultOperations(User user, OperationFilterCriteria criteria);
    
    // Report Access
    AdministrativeReport generateReport(User user, ReportType reportType, DateRange period);
    List<AdminAlert> consultAdministrativeAlerts(User user);
}
```

---

# 4. Cross-Cutting Input Ports (Shared by Multiple Roles)

## 4.1 NotificationPreferencesPort
Accessible by Buyers, Sellers, and Administrators to manage notification channels and preferences.

```java
public interface NotificationPreferencesPort {
    UserNotificationPreferences consultMyNotificationPreferences(User user);
    UserNotificationPreferences updateNotificationPreferences(User user, UserNotificationPreferences preferences);
    void subscribeToNotificationChannel(User user, NotificationChannel channel, String contact);
    void unsubscribeFromNotificationChannel(User user, NotificationChannel channel);
    List<Notification> consultMyNotificationHistory(User user, DateRange period);
}
```

---

# 5. Design Rules for Input Ports

### 5.1 Immutability of Confirmed Data
Once an order, invoice, payment, or shipment reaches a confirmed or terminal state, methods must not allow modifications that break transactional integrity.

### 5.2 Role-Based Method Visibility
Input Port methods are strictly organized by role. A method in `BuyerPort` is not available to a Seller without explicit authorization through business logic.

### 5.3 Audit Trail on Every Critical Operation
Every method call in any Input Port must trigger:
- Operation record creation
- User/Actor identification
- Timestamp
- Affected entity reference
- Success/failure status

### 5.4 Transactional Consistency
Methods that modify multiple aggregates (e.g., `checkoutCart` affecting `ShoppingCart`, `Order`, `Inventory`, `Payment`) must complete atomically or roll back completely.

### 5.5 Idempotence on External Operations
Methods that interact with external systems (e.g., `dispatchShipment`, `processSettlement`) must be idempotent to handle retries and duplicate requests safely.

### 5.6 Domain Model Validation
All input parameters must be validated against domain rules before persistence or state change. DTOs or primitives must be transformed into domain models first.

### 5.7 Separation of Concerns
- **Queries** (read-only, no side effects): `consult*`, `track*`, `generate*`
- **Commands** (state-changing, auditable): `create*`, `update*`, `change*`, `request*`, `approve*`, `reject*`, `dispatch*`, `process*`

---

# 6. Implementation Notes

- All methods return **Domain Models**, not DTOs.
- All methods receive a **User domain object** to support authorization and audit trails.
- Complex operations may return a **Result<T>** wrapper to convey both success and validation details.
- Exceptions are domain-specific (e.g., `InsufficientInventoryException`, `SellerNotVerifiedException`, `PaymentAuthorizationFailedException`).
- TypeScript implementations use `Promise<T>` and `async/await` for all I/O-bound operations.
- Pagination and filtering are done through domain-level criteria objects (e.g., `BuyerFilterCriteria`, `OrderFilterCriteria`), not framework-specific query languages.

---

# 7. Input Port Organization

```
domain/
└── ports/
    └── in/
        ├── PublicAccessPort
        ├── BuyerPort
        ├── SellerPort
        ├── LogisticsOperatorPort
        ├── AdministratorPort
        ├── SupervisorPort
        └── NotificationPreferencesPort
```

Each Input Port is implemented by a **Use Case service** in the Application Layer, which orchestrates Domain Services and invokes Output Ports for persistence and external integration.

