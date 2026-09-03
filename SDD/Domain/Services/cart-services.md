# Cart Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para administrar carritos, líneas, validaciones, merge, persistencia y conversión a orden en NexusMarket.

### Introducción

`ShoppingCart` es el agregado raíz asociado a un `Buyer`. Contiene `CartLine`, subtotal, total, fecha de actualización y `CartStatus`. El carrito solo acepta productos elegibles, cantidades positivas y precios vigentes. Las modificaciones de catálogo, stock, vendedor, pagos y órdenes se consultan mediante puertos; Cart Services no modifica esos agregados. El checkout valida comprador, productos, vendedores, precios, dirección, método de pago y disponibilidad antes de solicitar la creación de una `Order`. Un carrito convertido o cancelado no puede continuar como carrito abierto. Los cambios relevantes generan `Operation` y `AuditLog`.

### Responsabilidades principales

- Crear y consultar carritos abiertos.
- Añadir, actualizar y quitar líneas.
- Recalcular subtotal y total.
- Validar productos, precios, Seller y disponibilidad.
- Fusionar carritos sin duplicar líneas inválidas.
- Detectar cambios de precio en tiempo real.
- Recuperar carritos abandonados con descuentos autorizados.
- Convertir un carrito válido en flujo de orden.

### Relación con Domain Model

Entidades: `ShoppingCart`, `CartLine`, `Buyer`, `Product`, `Order`, `Operation` y `AuditLog`. Value objects: `CartStatus`, `ProductPrice`, `Currency`, `PaymentMethod`, `DeliveryAddress` y `Quantity`. `ShoppingCart` es aggregate root; Product, Inventory, Payment y Order conservan sus límites propios.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
addItem(UUID buyerId, UUID productId, int quantity, Decimal price)
```

Correcto:
```text
addCartLine(AddCartLineContext context)
// context.buyer, context.product, context.quantity and context.price are domain concepts
```

### Principio 2: Validación de datos externos

La información de catálogo, precios, stock, descuentos y pagos se valida mediante puertos. Una respuesta antigua o incompleta genera advertencia o rechazo, nunca aceptación implícita.

### Principio 3: Inmutabilidad de Value Objects

`ProductPrice`, `Currency`, `PaymentMethod`, `DeliveryAddress` y `CartStatus` se reemplazan por valores nuevos y validados; las líneas guardan el precio capturado en su contexto.

### Principio 4: Traceabilidad operacional

Cambios de líneas, merge, descuentos, invalidaciones y checkout generan operaciones auditables sin almacenar secretos de pago.

### Principio 5: Transaccionalidad y consistencia

Cada modificación del carrito es atómica y recalcula totales. Checkout usa idempotencia y coordina reserva, pago y orden mediante casos de uso y eventos.

## 3. Domain Model Context

### Entidades principales involucradas

- `ShoppingCart`: líneas, totales, estado y propietario.
- `CartLine`: producto, cantidad, precio y variante seleccionada.
- `Buyer`: dueño del carrito y sus capacidades.
- `Product`: elegibilidad y precio actual.
- `Order`: resultado del checkout.

### Value Objects utilizados

`CartStatus` (`OPEN`, `CONVERTED`, `CANCELLED`), `ProductPrice`, `Currency`, `PaymentMethod`, `DeliveryAddress`, `Quantity` y `ProductStatus`.

### Aggregates y boundaries

```text
Buyer (root) --> ShoppingCart (root)
                   |-- CartLine[]
                   |-- CartStatus
                   |-- ProductPrice totals
                   +-- updateDate
ShoppingCart --references--> Product / ProductVariant
ShoppingCart --checkout----> Order
ShoppingCart --coordinates-> Inventory / Payment
```

Cart conserva selección y condiciones estimadas; Order captura condiciones confirmadas. Inventory reserva y Payment autoriza en sus propios contextos.

### Ciclo de vida relevante

```text
OPEN --checkout valid--> CONVERTED
  |                         |
  +--cancel/expire--------> +--immutable history
  |
  +--price/stock invalid--> OPEN with warning
```

Solo `OPEN` admite líneas. `CONVERTED` y `CANCELLED` no pueden volver a checkout.

## 4. Numbered Services

## 1. Create Shopping Cart

### Description
Crea un carrito abierto para un comprador activo.

### Responsibility
Establecer propietario, moneda contextual y estado `OPEN`.

### Input
- **Primary Input (Domain Model):** `CartCreationContext` con `Buyer` y contexto comercial.
- **Secondary Input (Value Objects):** `Currency`, `CartStatus`.
- **Domain Constraints:** Buyer activo y máximo un carrito abierto según política.

### Processing & Validations
1. Validar comprador. 2. Buscar carrito abierto. 3. Crear si no existe. 4. Inicializar totales.

### Persistence & Output
- **Output (Domain Model):** `ShoppingCartCreationResult`.
- **Persisted Aggregates:** `ShoppingCart`, `Operation`.
- **Generated Events:** `ShoppingCartCreatedEvent`.

### Operation & Audit
- **Operation Type:** `CART_CREATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 2. Consult Cart

### Description
Devuelve líneas, totales, advertencias de elegibilidad y fecha de actualización.

### Responsibility
Exponer una vista coherente sin mutar el carrito.

### Input
- **Primary Input (Domain Model):** `CartQueryContext` con `Buyer` y carrito.
- **Secondary Input (Value Objects):** `Currency`, `CartStatus`.
- **Domain Constraints:** propietario o actor autorizado; datos actuales.

### Processing & Validations
1. Autorizar consulta. 2. Cargar carrito. 3. Obtener advertencias. 4. Devolver resumen.

### Persistence & Output
- **Output (Domain Model):** `CartView`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `CartConsultedEvent`.

### Operation & Audit
- **Operation Type:** `CART_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 3. Add Item to Cart

### Description
Añade un producto, variante y cantidad al carrito abierto.

### Responsibility
Garantizar línea válida, Seller elegible y precio compatible.

### Input
- **Primary Input (Domain Model):** `AddCartLineContext` con `Buyer`, `ShoppingCart` y `Product`.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `Quantity`.
- **Domain Constraints:** producto publicado, Seller elegible, cantidad positiva y stock consultable.

### Processing & Validations
1. Validar carrito abierto. 2. Consultar Product. 3. Validar Seller y stock. 4. Crear o acumular línea.

### Persistence & Output
- **Output (Domain Model):** `CartLineAddedResult`.
- **Persisted Aggregates:** `ShoppingCart`, `Operation`, `AuditLog`.
- **Generated Events:** `CartLineAddedEvent`.

### Operation & Audit
- **Operation Type:** `CART_LINE_ADD`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 4. Update Cart Item

### Description
Modifica cantidad, variante o condiciones de una línea existente.

### Responsibility
Preservar subtotal de línea y elegibilidad tras el cambio.

### Input
- **Primary Input (Domain Model):** `UpdateCartLineContext` con carrito y `CartLine`.
- **Secondary Input (Value Objects):** `Quantity`, `ProductPrice`.
- **Domain Constraints:** línea perteneciente al carrito y cantidad positiva.

### Processing & Validations
1. Validar línea. 2. Consultar precio y stock. 3. Cambiar valor. 4. Recalcular totales.

### Persistence & Output
- **Output (Domain Model):** `CartLineUpdateResult`.
- **Persisted Aggregates:** `ShoppingCart`, `Operation`.
- **Generated Events:** `CartLineUpdatedEvent`.

### Operation & Audit
- **Operation Type:** `CART_LINE_UPDATE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Remove Cart Item

### Description
Quita una línea del carrito sin borrar órdenes o historial.

### Responsibility
Eliminar solo la selección abierta y recalcular totales.

### Input
- **Primary Input (Domain Model):** `RemoveCartLineContext` con `ShoppingCart` y `CartLine`.
- **Secondary Input (Value Objects):** `CartStatus`.
- **Domain Constraints:** carrito `OPEN` y línea perteneciente al agregado.

### Processing & Validations
1. Validar propietario. 2. Confirmar estado. 3. Retirar línea. 4. Recalcular subtotal y total.

### Persistence & Output
- **Output (Domain Model):** `CartLineRemovalResult`.
- **Persisted Aggregates:** `ShoppingCart`, `Operation`.
- **Generated Events:** `CartLineRemovedEvent`.

### Operation & Audit
- **Operation Type:** `CART_LINE_REMOVE`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 6. Recalculate Cart Totals

### Description
Recalcula subtotal y total a partir de líneas y condiciones vigentes.

### Responsibility
Garantizar sumas deterministas sin confiar en totales enviados por clientes.

### Input
- **Primary Input (Domain Model):** `CartPricingContext` con carrito y líneas.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `Tax`.
- **Domain Constraints:** subtotal igual a suma de líneas; moneda única.

### Processing & Validations
1. Validar líneas. 2. Sumar precios. 3. Aplicar descuentos permitidos. 4. Actualizar totales.

### Persistence & Output
- **Output (Domain Model):** `CartPricingResult`.
- **Persisted Aggregates:** `ShoppingCart`, `Operation`.
- **Generated Events:** `CartTotalsRecalculatedEvent`.

### Operation & Audit
- **Operation Type:** `CART_TOTALS_RECALCULATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 7. Validate Cart Conditions

### Description
Comprueba Buyer, productos, Seller, precios, cantidades, stock y restricciones del carrito.

### Responsibility
Determinar si el carrito puede avanzar a checkout.

### Input
- **Primary Input (Domain Model):** `CartValidationContext` con Buyer, carrito y condiciones.
- **Secondary Input (Value Objects):** `ProductStatus`, `ProductPrice`, `Currency`.
- **Domain Constraints:** Buyer activo, productos publicados, líneas positivas y Seller elegible.

### Processing & Validations
1. Validar Buyer. 2. Validar cada línea. 3. Consultar Inventory. 4. Devolver errores y advertencias.

### Persistence & Output
- **Output (Domain Model):** `CartValidationResult`.
- **Persisted Aggregates:** ninguno; auditoría de decisión.
- **Generated Events:** `CartConditionsValidatedEvent`.

### Operation & Audit
- **Operation Type:** `CART_CONDITIONS_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 8. Validate Cart Prices

### Description
Detecta diferencias entre el precio capturado en la línea y el precio vigente del catálogo.

### Responsibility
Evitar que checkout utilice condiciones obsoletas sin confirmación.

### Input
- **Primary Input (Domain Model):** `CartPriceValidationContext` con carrito y snapshot de catálogo.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`.
- **Domain Constraints:** comparación por moneda, variante y timestamp.

### Processing & Validations
1. Obtener precios actuales. 2. Comparar líneas. 3. Clasificar cambios. 4. Solicitar confirmación.

### Persistence & Output
- **Output (Domain Model):** `CartPriceChangeReport`.
- **Persisted Aggregates:** `ShoppingCart` solo tras confirmación.
- **Generated Events:** `CartPriceChangedEvent`.

### Operation & Audit
- **Operation Type:** `CART_PRICE_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 9. Validate Cart Availability

### Description
Comprueba disponibilidad actual de cada línea en inventarios elegibles.

### Responsibility
Evitar checkout de cantidades que Inventory no puede cubrir.

### Input
- **Primary Input (Domain Model):** `CartAvailabilityContext` con carrito e inventarios.
- **Secondary Input (Value Objects):** `Quantity`, `ProductStatus`.
- **Domain Constraints:** respuesta reciente y cantidad disponible suficiente.

### Processing & Validations
1. Consultar Inventory. 2. Comparar cantidades. 3. Identificar líneas parciales. 4. Emitir decisión.

### Persistence & Output
- **Output (Domain Model):** `CartAvailabilityResult`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `CartAvailabilityChangedEvent`.

### Operation & Audit
- **Operation Type:** `CART_AVAILABILITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 10. Suggest Related Products

### Description
Propone productos relacionados con las líneas actuales sin agregarlos automáticamente.

### Responsibility
Mejorar la selección respetando elegibilidad y visibilidad.

### Input
- **Primary Input (Domain Model):** `RelatedProductContext` con carrito y productos.
- **Secondary Input (Value Objects):** `ProductCategory`, `ProductPrice`, `Currency`.
- **Domain Constraints:** productos publicados, vendedor elegible y datos autorizados.

### Processing & Validations
1. Analizar categorías. 2. Consultar recomendador. 3. Filtrar estados. 4. Ordenar sugerencias.

### Persistence & Output
- **Output (Domain Model):** `RelatedProductSuggestions`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `RelatedProductsSuggestedEvent`.

### Operation & Audit
- **Operation Type:** `RELATED_PRODUCTS_SUGGESTION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 11. Merge Cart

### Description
Fusiona dos contextos de selección del mismo Buyer en un carrito abierto válido.

### Responsibility
Resolver líneas duplicadas, precios y conflictos sin perder trazabilidad.

### Input
- **Primary Input (Domain Model):** `CartMergeContext` con Buyer, carrito destino y carrito origen.
- **Secondary Input (Value Objects):** `Quantity`, `ProductPrice`, `CartStatus`.
- **Domain Constraints:** mismo Buyer, estado compatible y límites de líneas.

### Processing & Validations
1. Validar propietarios. 2. Fusionar líneas equivalentes. 3. Revalidar precios y stock. 4. Cancelar origen.

### Persistence & Output
- **Output (Domain Model):** `CartMergeResult`.
- **Persisted Aggregates:** carrito destino, origen, `Operation`, `AuditLog`.
- **Generated Events:** `CartsMergedEvent`.

### Operation & Audit
- **Operation Type:** `CART_MERGE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 12. Persist Cart Snapshot

### Description
Guarda un snapshot recuperable del carrito y sus condiciones estimadas.

### Responsibility
Permitir continuidad sin convertir el snapshot en precio contractual.

### Input
- **Primary Input (Domain Model):** `CartSnapshotContext` con carrito y versión.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `CartStatus`.
- **Domain Constraints:** versión, Buyer y timestamp identificados.

### Processing & Validations
1. Validar carrito. 2. Sellar líneas. 3. Guardar snapshot. 4. Emitir evento.

### Persistence & Output
- **Output (Domain Model):** `CartSnapshotResult`.
- **Persisted Aggregates:** snapshot y `Operation`.
- **Generated Events:** `CartSnapshotPersistedEvent`.

### Operation & Audit
- **Operation Type:** `CART_SNAPSHOT_PERSISTENCE`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 13. Recover Abandoned Cart

### Description
Recupera un carrito sin actividad y ofrece un incentivo permitido, sin garantizar stock o precio.

### Responsibility
Reactivar una selección abierta con consentimiento y política de descuento.

### Input
- **Primary Input (Domain Model):** `AbandonedCartContext` con Buyer, carrito y campaña.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`, `CartStatus`.
- **Domain Constraints:** propietario verificado, campaña vigente y no duplicar beneficio.

### Processing & Validations
1. Detectar abandono. 2. Validar consentimiento. 3. Revalidar líneas. 4. Aplicar oferta condicionada.

### Persistence & Output
- **Output (Domain Model):** `CartRecoveryResult`.
- **Persisted Aggregates:** `ShoppingCart`, campaña, `Operation`, `AuditLog`.
- **Generated Events:** `AbandonedCartRecoveredEvent`.

### Operation & Audit
- **Operation Type:** `ABANDONED_CART_RECOVERY`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 14. Checkout Cart

### Description
Inicia la conversión del carrito validado hacia una orden pendiente.

### Responsibility
Coordinar validación, reserva y creación de orden de forma idempotente.

### Input
- **Primary Input (Domain Model):** `CheckoutContext` con Buyer, carrito, dirección y método de pago.
- **Secondary Input (Value Objects):** `DeliveryAddress`, `PaymentMethod`, `Currency`, `ProductPrice`.
- **Domain Constraints:** carrito `OPEN`, Buyer activo, dirección válida, método habilitado, stock y precios confirmados.

### Processing & Validations
1. Validar condiciones. 2. Revalidar precios y stock. 3. Solicitar creación de Order. 4. Marcar carrito `CONVERTED` solo tras éxito.

### Persistence & Output
- **Output (Domain Model):** `CheckoutResult` con `Order`.
- **Persisted Aggregates:** `ShoppingCart`, `Order` mediante su servicio, reservas mediante Inventory.
- **Generated Events:** `CartCheckedOutEvent`, `OrderCreationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `CART_CHECKOUT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 15. Cancel Cart

### Description
Cancela un carrito abierto por solicitud, expiración o invalidez permanente.

### Responsibility
Cerrar selección sin cancelar órdenes ni pagos externos.

### Input
- **Primary Input (Domain Model):** `CartCancellationContext` con carrito, Buyer y motivo.
- **Secondary Input (Value Objects):** `CartStatus`, `OperationType`.
- **Domain Constraints:** carrito `OPEN`; reservas eventuales gestionadas por Inventory.

### Processing & Validations
1. Verificar propietario. 2. Liberar compromisos mediante puerto. 3. Cambiar a `CANCELLED`. 4. Auditar.

### Persistence & Output
- **Output (Domain Model):** `CartCancellationResult`.
- **Persisted Aggregates:** `ShoppingCart`, `Operation`, `AuditLog`.
- **Generated Events:** `CartCancelledEvent`.

### Operation & Audit
- **Operation Type:** `CART_CANCELLATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 16. Audit Cart Activity

### Description
Construye una timeline de cambios, precios, merge, recuperación y checkout.

### Responsibility
Reconstruir la evolución del carrito sin alterar su historial.

### Input
- **Primary Input (Domain Model):** `CartAuditQuery` con Buyer, carrito y periodo.
- **Secondary Input (Value Objects):** `CartStatus`, `OperationType`, `AuditSeverity`.
- **Domain Constraints:** actor autorizado y fuentes append-only.

### Processing & Validations
1. Autorizar consulta. 2. Leer operaciones. 3. Ordenar eventos. 4. Identificar anomalías.

### Persistence & Output
- **Output (Domain Model):** `CartActivityTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `CartActivityAuditedEvent`.

### Operation & Audit
- **Operation Type:** `CART_ACTIVITY_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### ShoppingCartRepositoryPort
```text
interface ShoppingCartRepositoryPort {
    ShoppingCart save(ShoppingCart cart)
    Optional<ShoppingCart> findOpenByBuyer(Buyer buyer)
    Optional<ShoppingCart> findByIdentifier(ShoppingCart cart)
    void delete(ShoppingCart cart)
}
```

#### ProductRepositoryPort
```text
interface ProductRepositoryPort {
    Optional<Product> findByIdentifier(Product product)
    List<Product> findEligible(CartLineCollection lines)
}
```

#### CartSnapshotRepositoryPort
```text
interface CartSnapshotRepositoryPort {
    CartSnapshot append(CartSnapshot snapshot)
    List<CartSnapshot> findByBuyer(Buyer buyer, SnapshotQuery query)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByCart(ShoppingCart cart, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByCart(ShoppingCart cart, AuditQuery query)
}
```

### External Service Contracts

#### InventoryAvailabilityPort
```text
interface InventoryAvailabilityPort {
    InventoryAvailabilityResult validate(CartAvailabilityContext context)
    ReservationRequest prepare(CheckoutContext context)
}
```

#### SellerEligibilityPort
```text
interface SellerEligibilityPort {
    SellerEligibilityResult evaluate(Product product)
}
```

#### ProductPricingPort
```text
interface ProductPricingPort {
    ProductPriceSnapshot retrieve(Product product, ProductVariant variant)
}
```

#### OrderCreationPort
```text
interface OrderCreationPort {
    OrderCreationResult create(CheckoutContext context)
}
```

#### RecommendationPort
```text
interface RecommendationPort {
    RelatedProductSuggestions suggest(RelatedProductContext context)
}
```

#### DiscountCampaignPort
```text
interface DiscountCampaignPort {
    CartOffer evaluate(AbandonedCartContext context)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(CartOperationContext context)
}
```

#### ClockPort
```text
interface ClockPort {
    DomainDateTime now()
}
```

## 6. Input Ports (Use Cases)

### Use Cases & Public Interfaces

```text
interface AddItemToCartUseCase {
    CartLineAddedResult execute(AddCartLineContext context)
}
interface ValidateCartConditionsUseCase {
    CartValidationResult execute(CartValidationContext context)
}
interface MergeCartUseCase {
    CartMergeResult execute(CartMergeContext context)
}
interface CheckoutCartUseCase {
    CheckoutResult execute(CheckoutContext context)
}
interface RecoverAbandonedCartUseCase {
    CartRecoveryResult execute(AbandonedCartContext context)
}
interface ValidateCartPricesUseCase {
    CartPriceChangeReport execute(CartPriceValidationContext context)
}
```

### Ejemplos de invocación

```text
const validation = await validateCartConditionsUseCase.execute({
    buyer: buyer,
    cart: shoppingCart,
    policy: activeCartPolicy,
    actor: buyer
})
```

```text
const checkout = await checkoutCartUseCase.execute({
    buyer: buyer,
    cart: validatedCart,
    deliveryAddress: buyer.primaryDeliveryAddress(),
    paymentMethod: buyer.defaultPaymentMethod(),
    currency: Currency.COP
})
```

## 7. Data Flow Diagram

```text
[Input Adapter] -> [Cart Use Case] -> [ShoppingCart Domain Service]
                                      |-> Cart Repository
                                      |-> Product / Pricing / Seller Ports
                                      |-> Inventory Availability Port
                                      |-> Order Creation Port
                                      |-> Recommendation / Discount Ports
                                      |-> Operation + AuditLog Ports
                                      v
                              [Cart Result / Domain Event]
                                      v
                         Order, Inventory, Payment, Logistics
```

El carrito calcula selección y condiciones estimadas. Order confirma la compra, Inventory reserva, Payment autoriza y Logistics prepara el envío.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `ShoppingCart.cartId` debe ser único y estable.
2. Cada carrito debe pertenecer a un único `Buyer`.
3. Solo puede existir un carrito abierto por Buyer según la política.
4. Una `CartLine` debe referenciar un Product válido.
5. Las cantidades de línea deben ser mayores que cero.
6. Cada subtotal de línea debe ser cantidad por precio unitario.
7. El subtotal del carrito debe ser la suma de sus líneas.
8. El total debe usar una moneda coherente y `ProductPrice` válido.
9. Un carrito no puede mezclar vendedores inelegibles.
10. `CartStatus` solo utiliza valores del catálogo.

### Transactional Constraints

11. Añadir, actualizar o retirar línea recalcula totales atómicamente.
12. Checkout valida el carrito antes de solicitar una Order.
13. Checkout es idempotente por referencia de operación.
14. El precio debe revalidarse antes de crear la orden.
15. La disponibilidad debe revalidarse antes de reservar.
16. El carrito solo pasa a `CONVERTED` después de crear la orden correctamente.
17. Un fallo de reserva no convierte el carrito.
18. Un timeout de catálogo o Inventory no habilita checkout.
19. Merge no puede perder líneas sin decisión explícita.
20. Cancelar el carrito no cancela automáticamente una Order existente.

### Authorization & Access Constraints

21. El Buyer solo administra su propio carrito.
22. Un Seller no puede modificar el carrito de un Buyer.
23. Un supervisor puede consultar vistas autorizadas, no ejecutar checkout.
24. Cart no puede autoautorizar pagos.
25. Descuentos solo provienen de campañas autorizadas.
26. Productos suspendidos o inactivos no pueden añadirse.
27. La búsqueda de productos respeta visibilidad y políticas del catálogo.
28. Direcciones y métodos de pago se usan solo con propósito autorizado.
29. La recuperación requiere verificar propietario y consentimiento de comunicación.
30. Las vistas no exponen secretos de pago ni datos de terceros.

### Persistence & State Constraints

31. `CONVERTED` y `CANCELLED` no admiten modificaciones de líneas.
32. Los precios del carrito son estimados hasta la confirmación de Order.
33. El precio capturado en una Order no se modifica por cambios posteriores del carrito.
34. Los snapshots deben identificar versión y timestamp.
35. `AuditLog` es inmutable y append-only.
36. `Operation` conserva actor, tipo, entidad y tiempo.
37. Repositorios usan modelos de dominio, no DTOs ni ORM.
38. Timestamps proceden de `ClockPort`.
39. No se eliminan referencias históricas de carritos convertidos.
40. Adaptadores no filtran SQL, HTTP ni detalles de almacenamiento.

### Cross-Aggregate and Business Rules

41. Cart no modifica Product, Inventory, Order, Payment o Buyer internamente.
42. Catalog conserva la fuente de verdad de producto y precio vigente.
43. Inventory conserva la fuente de verdad de disponibilidad y reserva.
44. Order conserva la fuente de verdad de condiciones confirmadas.
45. Una orden pendiente requiere carrito válido y Buyer activo.
46. La dirección primaria debe ser válida para checkout cuando la operación lo exija.
47. El método de pago debe estar habilitado antes de avanzar a confirmación.
48. Cambios de precio deben mostrarse al Buyer antes de confirmar.

### Audit, Performance & Business Rules

49. Checkout, merge, descuentos, invalidaciones y cambios de precio generan auditoría.
50. La auditoría no contiene credenciales, tokens, números completos de pago ni datos innecesarios.
