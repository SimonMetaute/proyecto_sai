# NexusMarket Contract Alignment Policy

## 1. Purpose and authority

This document defines cross-cutting rules for keeping NexusMarket's domain, ports, REST contracts, architecture and implementation consistent. It is a language-independent policy for the marketplace; it does not select or assume a web framework, database, or deployment topology.

Use these documents as the sources of truth:

1. This document governs cross-cutting naming, adaptation, conflict reporting and alignment gates. It does not override business rules defined by the domain.
2. `SDD/Domain/Domain_model.md`, `SDD/Domain/Domain_services.md`, `SDD/Domain/Domain_value_objects.md` and the relevant files under `SDD/Domain/Services/` define business concepts, rules and lifecycle behavior.
3. `SDD/Domain/Input-ports.md` and `SDD/Domain/output-ports.md` define application entry points, external capabilities and semantic port operations.
4. `SDD/Adapters/Api-rest-endpoints.md` defines the published REST methods, paths, roles, request/response contracts and endpoint-specific HTTP statuses and error codes.
5. `SDD/Software architecture.md/software_architecture.md` defines the architectural layers, boundaries and marketplace subdomains.

When two documents disagree, do not silently choose the implementation or copy a rule from another system. Preserve the business behavior in the domain documents, preserve the published API behavior in the endpoint contract, and report the conflict. Correct the lower-level or stale document and update affected implementations and tests. If a business change requires an API change, update both the domain contract and REST contract deliberately.

## 2. Language and framework adaptation

The domain and port semantics are canonical. Frameworks and programming languages may adapt syntax and I/O mechanics, but must preserve the same business operation, actor, affected domain objects, authorization scope and result.

### 2.1 Java profile

- The input-port examples in `SDD/Domain/Input-ports.md` are expressed as Java interfaces and are the semantic reference for method names, parameters and ordering.
- Domain and port boundaries use domain models and value objects, not REST DTOs, ORM entities, framework types or raw transport payloads.
- Implementations use the project's selected build and test tooling; this document does not prescribe Maven, Gradle or a framework.

### 2.2 TypeScript profile

- TypeScript operations preserve the Java input-port operation's parameters, their meaning and order.
- I/O-bound operations may return `Promise<T>` and use `async`/`await`; asynchrony does not justify changing business parameters or behavior.
- Request and response DTOs remain in the adapter and are mapped to and from domain models at the boundary.
- Implementations use the scripts and lockfile declared by the project if and when a TypeScript application is present.

The repository documents Java-shaped port contracts and TypeScript adaptation guidance; this policy does not assert that either profile is the only deployed implementation.

## 3. Canonical names and domain vocabulary

Use the role and port names defined by the current NexusMarket contracts:

| Capability | Canonical name |
|---|---|
| Public access and onboarding | `PublicAccessPort` |
| Buyer operations | `BuyerPort` |
| Seller operations | `SellerPort` |
| Logistics operations | `LogisticsOperatorPort` |
| Administration | `AdministratorPort` |
| Supervision and monitoring | `SupervisorPort` |
| Shared notification preferences | `NotificationPreferencesPort` |
| Audit persistence | `AuditLogRepositoryPort` |
| JWT operations | `JwtServicePort` |
| Payment provider integration | `PaymentGatewayPort` |
| Logistics provider integration | `LogisticsIntegrationPort` |

Use the marketplace's domain terms consistently: `Buyer`, `Seller`, `Product`, `ProductVariant`, `ShoppingCart`, `Order`, `Payment`, `Invoice`, `Shipment`, `Return`, `Warehouse` and `Inventory`. Do not introduce banking concepts such as customers, transfers, loans, bank accounts or banking products as substitutes for these concepts.

The contracts do not currently define accepted legacy aliases. Do not create parallel interfaces or claim an alias is supported without documenting a migration mapping here and in the relevant port contract. For repository lookups, follow the domain-model identity and result semantics; do not assume that a primitive ID or an illustrative method name in pseudocode is the canonical contract.

## 4. Input-port signature policy

Compare input ports by semantic operation, parameter meaning, actor, and parameter ordering. Equivalent return-type wrappers for asynchronous I/O are permitted; changes to business inputs are not.

| Port | Operation | Canonical semantic parameters |
|---|---|---|
| `PublicAccessPort` | `login` | `Email, Password` |
| `PublicAccessPort` | `logout` | `User` |
| `PublicAccessPort` | `registerBuyer` | `Buyer` |
| `PublicAccessPort` | `registerSeller` | `Seller` |
| `PublicAccessPort` | `searchPublicCatalog` | `SearchCriteria` |
| `BuyerPort` | `addItemToCart` | `User, ShoppingCart, Product, ProductVariant, Quantity` |
| `BuyerPort` | `checkoutCart` | `User, ShoppingCart, DeliveryAddress, PaymentMethod` |
| `BuyerPort` | `requestReturn` | `User, Order, ReturnReason, evidence` |
| `SellerPort` | `approveOrder` | `User, Order` |
| `SellerPort` | `adjustInventory` | `User, Product, Warehouse, Quantity, reason` |
| `LogisticsOperatorPort` | `dispatchShipment` | `User, Shipment` |
| `AdministratorPort` | `approveSeller` | `User, Seller` |
| `SupervisorPort` | `consultOrdersByStatus` | `User, OrderStatus` |

This table illustrates representative operations; `SDD/Domain/Input-ports.md` remains the complete operation inventory.

Rules:

1. The REST adapter may accept DTOs and primitive path/query values, but must map them to the domain models, value objects or criteria objects expected by the input port before invoking it.
2. The authenticated actor must be represented by the `User` domain model where the port contract requires it. Authorization must also verify the actor's role and ownership/scope for the affected resource.
3. A value required for a business decision must be explicit in the operation's domain inputs or resolved by the application through an output port before that decision is made.
4. An implementation that drops, adds or reorders a business parameter is `PARTIAL` until the contract documents and tests an intentional semantic change.
5. If a contract example is malformed or ambiguous, report it and reconcile the document and implementation. Do not propagate the defect as a new canonical signature.

## 5. Output-port and dependency policy

Output ports are domain-owned, technology-independent contracts. Adapters implement them and translate between domain models and external systems.

- Repository ports persist and retrieve domain concepts such as users, buyers, sellers, products, inventory, carts, orders, payments, shipments and returns.
- `PaymentGatewayPort` and `LogisticsIntegrationPort` isolate external payment and carrier capabilities from the domain.
- `AuditLogRepositoryPort`, `AuthorizationPort`, `PasswordServicePort`, `JwtServicePort` and `NotificationPort` remain contracts; implementations must not leak secrets or infrastructure types across the boundary.
- REST DTOs, ORM entities, SQL queries, HTTP client types and provider-specific payloads must not be passed into domain services or ports.
- TypeScript may adapt I/O-bound calls to promises, but must preserve the same domain inputs and outcomes. Absence, failure and validation results must have explicit semantics rather than being silently converted to a success-shaped default.

`SDD/Domain/output-ports.md` is the authoritative inventory and responsibility description for output ports.

## 6. REST and HTTP status policy

`SDD/Adapters/Api-rest-endpoints.md` is authoritative for each published endpoint's statuses and error codes. Apply the following general meanings without changing a documented endpoint contract:

| Situation | Status | Contract guidance |
|---|---:|---|
| Malformed JSON, missing required data, invalid shape, type, format, pagination or filter | 400 | Use the endpoint's documented `INVALID_REQUEST` mapping. |
| Missing or invalid authentication token | 401 | Use `AUTHENTICATION_REQUIRED` where documented. |
| Invalid login credentials | 401 | Use `INVALID_CREDENTIALS` where documented. |
| Authenticated actor lacks the required role or permission | 403 | Use `FORBIDDEN`. |
| Resource does not exist or is unavailable under the endpoint's visibility rules | 404 | Use `RESOURCE_NOT_FOUND` where documented. |
| Duplicate resource or incompatible business state | 409 | Use the code documented for that endpoint, such as `RESOURCE_ALREADY_EXISTS`. |
| Semantically invalid domain value | 422 | Use `INVALID_DOMAIN_VALUE` only on endpoints that explicitly declare it. |
| Unexpected runtime or programming failure | 500 | Use the documented generic server-error code, such as `INTERNAL_ERROR`. |
| Required dependency is unavailable | 503 | Add this mapping to the affected endpoint contract before treating it as a public API behavior. |

Specific rules:

- NexusMarket's current endpoint specification uses both `400` and `422`; they are not interchangeable. Preserve the status and code for each endpoint as written until the contract is deliberately revised.
- `401` authentication failures and `403` authorization failures must not be collapsed into validation errors.
- `409` is for an operation actually blocked by a conflicting resource or state. Do not infer a conflict merely because an endpoint performs an upsert, increments a quantity, or is retried.
- Do not map unknown exceptions to `400`. Unexpected errors are server errors and must not expose implementation details.
- A new public status or error code must be documented in `Api-rest-endpoints.md` before implementation or tests treat it as contractual.
- Error response fields and safe-message rules belong in the dedicated REST error contract when one is established; until then, do not invent a second, conflicting response shape.

## 7. Lifecycle, consistency and idempotency

Marketplace actions may span orders, inventory, payment, settlement, shipment and returns. Their contracts must preserve the lifecycle and consistency rules defined by the relevant domain services.

- A confirmed or terminal order, payment, invoice or shipment must not be changed through an operation that violates its documented lifecycle.
- Inventory reservation, release, adjustment and order fulfillment must not be reported as successful when the corresponding domain operation fails.
- External payment and logistics operations must follow the idempotency and retry semantics of the domain operation and provider adapter; retries must not accidentally charge twice, dispatch twice or duplicate a refund.
- A failed or ambiguous external operation must be represented explicitly and reconciled through the relevant payment, order or shipment workflow. Do not assume that a timeout means the provider did not process the request.
- Audit records for critical operations must preserve actor, time, affected entity, operation and outcome in accordance with the input-port and domain contracts.

## 8. REST contract traceability

Maintain or generate a traceability row for every endpoint in `SDD/Adapters/Api-rest-endpoints.md`:

| Method | Path | Role/access | Input-port operation | Request mapping/validation | Success status and response | Error codes/statuses | Tests | State |
|---|---|---|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | `PublicAccessPort.login` | Map credentials to `Email` and `Password` | `200` login response | `400 INVALID_REQUEST`, `401 INVALID_CREDENTIALS` | Unit and REST integration | `PENDING` |

An endpoint is `VERIFIED` only when method, path, authentication and role, request mapping, port operation, success response, error mapping and tests agree. If the matrix is maintained outside this document, identify its location and use the same required columns.

## 9. Known contract discrepancy to resolve

The current REST specification describes adding an already-present product to a cart as `409 RESOURCE_ALREADY_EXISTS`, while its description says the existing line's quantity is incremented. Those outcomes are inconsistent: a successful increment should not be represented as a conflict response. Reconcile the endpoint's behavior, response and error list with `BuyerPort.addItemToCart` and the cart service before marking that endpoint `VERIFIED`. Do not silently choose one interpretation in an implementation.

The input-port document also contains the malformed operation name `changeSeller Status` in the administrator section. Confirm the intended operation name against the domain service and implementation, correct the port contract, and update any adapter and tests together. Do not copy the malformed spelling into a new implementation.

## 10. Alignment gate

NexusMarket's SDD and implementation are aligned only when:

1. Domain behavior and lifecycle rules agree across the domain model, value objects and detailed services.
2. Input-port operations have consistent names, actor, semantic parameters and ordering across contracts and implementations.
3. Output-port boundaries remain technology-independent and isolate persistence and external payment/logistics providers.
4. Role-based access and resource ownership match the port and endpoint contracts.
5. Every REST endpoint has consistent request mapping, success behavior and documented error statuses/codes.
6. The `addItemToCart` conflict and quantity-increment discrepancy and malformed `changeSeller Status` operation are resolved or explicitly tracked as unresolved; neither is marked verified while unresolved.
7. External payment, inventory, order, logistics and return outcomes preserve their domain lifecycle and retry semantics.
8. Required unit and REST integration tests pass, and alignment evidence is recorded with the project's chosen workflow.

Until every applicable condition is met, the affected contract or endpoint must be marked `PARTIAL` or `FAILING`, never `VERIFIED` or `COMPLETE`.
