# Order Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para crear, confirmar, preparar, enviar, entregar y cerrar órdenes de NexusMarket.

### Introducción

`Order` es el agregado raíz de la transacción comercial. Conserva Buyer, Seller, líneas, subtotales, impuestos, envío, total, estado y fecha estimada de entrega. `OrderLine` representa productos, cantidades, variantes y precios capturados. El ciclo es `PENDING -> CONFIRMED -> PREPARING -> SENT -> DELIVERED`, con cancelación en los estados permitidos y reembolso posterior según la devolución aprobada. Cart, Catalog, Inventory, Payment, Billing y Logistics conservan sus propios límites. Order Services coordina sus decisiones mediante puertos, preserva precios confirmados como valores históricos y registra toda transición crítica con `Operation` y `AuditLog`.

### Responsabilidades principales

- Crear órdenes desde carritos válidos.
- Validar líneas, precios, impuestos y totales.
- Confirmar o cancelar compromisos comerciales.
- Coordinar pago, reserva e inventario.
- Gestionar cambios permitidos del ciclo de vida.
- Agrupar líneas por Seller y Warehouse.
- Preparar fulfillment y envío.
- Predecir entrega, cerrar y archivar órdenes.

### Relación con Domain Model

Entidades: `Order`, `OrderLine`, `Buyer`, `Seller`, `Product`, `Payment`, `Shipment`, `Invoice`, `Operation` y `AuditLog`. Value objects: `OrderStatus`, `ProductPrice`, `Currency`, `DeliveryAddress`, `PaymentStatus`, `ShipmentStatus` y `Quantity`. `Order` es aggregate root; Payment, Shipment, Inventory e Invoice son agregados externos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
confirmOrder(UUID orderId, Decimal total, String status)
```

Correcto:
```text
confirmOrder(ConfirmOrderContext context)
// context.order, paymentDecision and fulfillmentContext are domain concepts
```

### Principio 2: Validación de datos externos

Cart, Catalog, Payment, Inventory y Logistics entregan evidencia que debe validarse por versión, estado y correlación antes de cambiar Order.

### Principio 3: Inmutabilidad de Value Objects

`ProductPrice`, `Currency`, `DeliveryAddress`, `OrderStatus` y cantidades confirmadas se reemplazan por valores nuevos; nunca se mutan precios históricos.

### Principio 4: Traceabilidad operacional

Creación, confirmación, cancelación, transición, agrupamiento, despacho, entrega y cierre generan `Operation` y `AuditLog` según severidad.

### Principio 5: Transaccionalidad y consistencia

Las líneas y totales se validan dentro del agregado. Payment, Inventory y Shipment se coordinan con idempotencia y eventos compensables.

## 3. Domain Model Context

### Entidades principales involucradas

- `Order`: compromiso comercial y estado.
- `OrderLine`: producto, cantidad, variante, precio y subtotal.
- `Buyer` y `Seller`: participantes de la operación.
- `Payment`, `Invoice`, `Shipment` e `Inventory`: contextos coordinados.
- `Operation` y `AuditLog`: trazabilidad.

### Value Objects utilizados

`OrderStatus` (`PENDING`, `CONFIRMED`, `PREPARING`, `SENT`, `DELIVERED`, `CANCELLED`, `REFUNDED`), `ProductPrice`, `Currency`, `DeliveryAddress`, `PaymentStatus`, `ShipmentStatus` y `Quantity`.

### Aggregates y boundaries

```text
Buyer --> Order (root) --> OrderLine[] --> Product snapshot
                         |--> Payment
                         |--> Invoice
                         |--> Inventory reservation
                         +--> Shipment[]
```

Order conserva condiciones confirmadas. Payment autoriza, Inventory reserva, Shipment entrega y Billing factura en sus respectivos contextos.

### Ciclo de vida relevante

```text
PENDING --> CONFIRMED --> PREPARING --> SENT --> DELIVERED --> REFUNDED
   |            |             |
   +----------> CANCELLED <---+
```

La orden debe permanecer trazable desde creación hasta estado terminal.

## 4. Numbered Services

## 1. Create Order

### Description
Crea una orden `PENDING` desde un carrito validado.

### Responsibility
Copiar líneas y condiciones comerciales sin confiar en datos actuales del catálogo.

### Input
- **Primary Input (Domain Model):** `OrderCreationContext` con Buyer, carrito y líneas.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `DeliveryAddress`.
- **Domain Constraints:** carrito válido, Buyer activo, líneas positivas y productos elegibles.

### Processing & Validations
1. Validar Cart. 2. Copiar snapshots. 3. Calcular totales. 4. Crear `PENDING`.

### Persistence & Output
- **Output (Domain Model):** `OrderCreationResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderCreatedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_CREATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 2. Validate Order

### Description
Valida integridad comercial, líneas, comprador, vendedores y condiciones de la orden.

### Responsibility
Producir una decisión previa a confirmación.

### Input
- **Primary Input (Domain Model):** `OrderValidationContext` con `Order` y evidencia externa.
- **Secondary Input (Value Objects):** `OrderStatus`, `ProductPrice`, `Currency`.
- **Domain Constraints:** totales consistentes, productos publicados y cantidades válidas.

### Processing & Validations
1. Validar estado. 2. Comparar líneas. 3. Revisar Seller y Product. 4. Devolver hallazgos.

### Persistence & Output
- **Output (Domain Model):** `OrderValidationResult`.
- **Persisted Aggregates:** ninguno; decisión auditable.
- **Generated Events:** `OrderValidatedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 3. Synchronize Order Prices

### Description
Compara precios capturados con Catalog antes de confirmar y comunica variaciones al Buyer.

### Responsibility
Evitar confirmar condiciones obsoletas sin consentimiento explícito.

### Input
- **Primary Input (Domain Model):** `OrderPriceSynchronizationContext` con Order y snapshot actual.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`.
- **Domain Constraints:** moneda, variante y versión comparables.

### Processing & Validations
1. Obtener precios actuales. 2. Comparar líneas. 3. Calcular diferencias. 4. Solicitar aceptación.

### Persistence & Output
- **Output (Domain Model):** `OrderPriceSynchronizationResult`.
- **Persisted Aggregates:** Order solo tras aceptación.
- **Generated Events:** `OrderPriceChangeDetectedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_PRICE_SYNCHRONIZATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 4. Confirm Order

### Description
Confirma la orden tras validar pago, stock, dirección, precios y reglas comerciales.

### Responsibility
Convertir `PENDING` en compromiso `CONFIRMED` sin estados parciales.

### Input
- **Primary Input (Domain Model):** `OrderConfirmationContext` con Order, Payment y reserva.
- **Secondary Input (Value Objects):** `PaymentStatus`, `DeliveryAddress`, `OrderStatus`, `ProductPrice`.
- **Domain Constraints:** pago autorizado, stock reservado, total exacto y dirección válida.

### Processing & Validations
1. Validar Order. 2. Confirmar Payment. 3. Confirmar Inventory. 4. Cambiar a `CONFIRMED`.

### Persistence & Output
- **Output (Domain Model):** `OrderConfirmationResult`.
- **Persisted Aggregates:** `Order`, referencias de Payment/Inventory, `Operation`, `AuditLog`.
- **Generated Events:** `OrderConfirmedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_CONFIRMATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 5. Cancel Order

### Description
Cancela una orden bajo una regla válida y coordina liberación o reversión.

### Responsibility
Cerrar compromiso sin borrar historia ni ejecutar compensaciones silenciosas.

### Input
- **Primary Input (Domain Model):** `OrderCancellationContext` con Order, actor y motivo.
- **Secondary Input (Value Objects):** `OrderStatus`, `PaymentStatus`.
- **Domain Constraints:** transición permitida, motivo y autoridad.

### Processing & Validations
1. Validar estado. 2. Liberar reserva. 3. Coordinar Payment. 4. Cambiar a `CANCELLED`.

### Persistence & Output
- **Output (Domain Model):** `OrderCancellationResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderCancelledEvent`, `InventoryReleaseRequestedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_CANCELLATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 6. Update Order

### Description
Aplica cambios permitidos mientras la orden no esté confirmada o en fulfillment irreversible.

### Responsibility
Mantener trazabilidad y no alterar condiciones confirmadas.

### Input
- **Primary Input (Domain Model):** `OrderUpdateContext` con Order y change set.
- **Secondary Input (Value Objects):** `DeliveryAddress`, `ProductPrice`, `OrderStatus`.
- **Domain Constraints:** estado modificable y autorización del actor.

### Processing & Validations
1. Verificar estado. 2. Validar cambios. 3. Recalcular totales. 4. Versionar.

### Persistence & Output
- **Output (Domain Model):** `OrderUpdateResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderUpdatedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_UPDATE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 7. Track Order Status

### Description
Devuelve estado actual y timeline de la orden para Buyer, Seller o soporte autorizado.

### Responsibility
Exponer progreso sin modificar la orden.

### Input
- **Primary Input (Domain Model):** `OrderStatusQuery` con Order y actor.
- **Secondary Input (Value Objects):** `OrderStatus`, `ShipmentStatus`.
- **Domain Constraints:** visibilidad por rol y fuentes consistentes.

### Processing & Validations
1. Autorizar consulta. 2. Cargar Order. 3. Correlacionar eventos. 4. Construir timeline.

### Persistence & Output
- **Output (Domain Model):** `OrderStatusTimeline`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `OrderStatusConsultedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_STATUS_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 8. Change Order Status

### Description
Aplica una transición de estado causada por un evento operativo válido.

### Responsibility
Impedir saltos de ciclo de vida y duplicación de transiciones.

### Input
- **Primary Input (Domain Model):** `OrderStatusTransitionContext` con Order y evento.
- **Secondary Input (Value Objects):** `OrderStatus`, `PaymentStatus`, `ShipmentStatus`.
- **Domain Constraints:** transición permitida y precondiciones verificadas.

### Processing & Validations
1. Validar estado actual. 2. Validar evento. 3. Cambiar estado. 4. Auditar.

### Persistence & Output
- **Output (Domain Model):** `OrderStatusChangeResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderStatusChangedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_STATUS_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 9. Manage Order Lines

### Description
Administra líneas y variantes antes de confirmar la orden.

### Responsibility
Preservar cantidades, snapshots y subtotales de cada línea.

### Input
- **Primary Input (Domain Model):** `OrderLineContext` con Order y `OrderLine`.
- **Secondary Input (Value Objects):** `Quantity`, `ProductPrice`, `Currency`.
- **Domain Constraints:** cantidad mayor que cero y subtotal exacto.

### Processing & Validations
1. Validar Product. 2. Validar cantidad. 3. Calcular subtotal. 4. Recalcular Order.

### Persistence & Output
- **Output (Domain Model):** `OrderLineResult`.
- **Persisted Aggregates:** `Order`, `Operation`.
- **Generated Events:** `OrderLineChangedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_LINE_MANAGEMENT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 10. Validate Order Lines

### Description
Comprueba producto, variante, cantidad, precio y Seller de todas las líneas.

### Responsibility
Evitar líneas incompletas o inconsistentes.

### Input
- **Primary Input (Domain Model):** `OrderLinesValidationContext` con Order y líneas.
- **Secondary Input (Value Objects):** `ProductPrice`, `Quantity`, `Currency`.
- **Domain Constraints:** Product elegible y subtotal igual a cantidad por precio.

### Processing & Validations
1. Validar referencias. 2. Comparar snapshots. 3. Validar subtotales. 4. Emitir resultado.

### Persistence & Output
- **Output (Domain Model):** `OrderLinesValidationResult`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `OrderLinesValidatedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_LINES_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 11. Group Lines by Seller

### Description
Agrupa líneas por vendedor para coordinación comercial y fulfillment.

### Responsibility
Proponer agrupación sin cambiar la identidad de la orden.

### Input
- **Primary Input (Domain Model):** `SellerGroupingContext` con Order y líneas.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`.
- **Domain Constraints:** Seller de cada Product verificado y consistente.

### Processing & Validations
1. Resolver vendedores. 2. Agrupar líneas. 3. Validar totales. 4. Emitir plan.

### Persistence & Output
- **Output (Domain Model):** `SellerFulfillmentGroups`.
- **Persisted Aggregates:** plan y `Operation`.
- **Generated Events:** `OrderSellerGroupsCreatedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_SELLER_GROUPING`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 12. Group Lines by Warehouse

### Description
Asigna líneas a almacenes disponibles para optimizar preparación y envío.

### Responsibility
Crear un plan de fulfillment sin reservar nuevamente stock.

### Input
- **Primary Input (Domain Model):** `WarehouseGroupingContext` con Order e inventarios.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `Quantity`.
- **Domain Constraints:** warehouse operativo y cobertura suficiente.

### Processing & Validations
1. Consultar disponibilidad. 2. Agrupar líneas. 3. Minimizar particiones. 4. Emitir plan.

### Persistence & Output
- **Output (Domain Model):** `WarehouseFulfillmentPlan`.
- **Persisted Aggregates:** plan y `Operation`.
- **Generated Events:** `OrderWarehouseGroupsCreatedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_WAREHOUSE_GROUPING`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 13. Validate Order Totals

### Description
Comprueba subtotal, impuestos, shipping cost y total final.

### Responsibility
Garantizar que el importe confirmado sea matemáticamente y comercialmente consistente.

### Input
- **Primary Input (Domain Model):** `OrderTotalsContext` con Order y política fiscal.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `Tax`.
- **Domain Constraints:** total igual a subtotal + impuestos + envío.

### Processing & Validations
1. Sumar líneas. 2. Validar impuestos. 3. Validar envío. 4. Comparar total.

### Persistence & Output
- **Output (Domain Model):** `OrderTotalsValidationResult`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `OrderTotalsValidatedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_TOTALS_VALIDATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 14. Validate Fulfillment Readiness

### Description
Determina si una orden puede pasar a preparación.

### Responsibility
Confirmar pago, reserva, dirección y almacén antes de fulfillment.

### Input
- **Primary Input (Domain Model):** `FulfillmentReadinessContext` con Order, Payment, Inventory y Warehouse.
- **Secondary Input (Value Objects):** `PaymentStatus`, `WarehouseStatus`, `OrderStatus`.
- **Domain Constraints:** Order confirmada, pago autorizado y stock reservado.

### Processing & Validations
1. Validar estado. 2. Confirmar Payment. 3. Confirmar Inventory. 4. Devolver decisión.

### Persistence & Output
- **Output (Domain Model):** `FulfillmentReadinessDecision`.
- **Persisted Aggregates:** ninguno; decisión auditable.
- **Generated Events:** `OrderFulfillmentReadyEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_FULFILLMENT_READINESS`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 15. Prepare Order

### Description
Pasa una orden confirmada a `PREPARING` y solicita operaciones de almacén.

### Responsibility
Abrir fulfillment solo cuando las precondiciones estén satisfechas.

### Input
- **Primary Input (Domain Model):** `OrderPreparationContext` con Order y plan de fulfillment.
- **Secondary Input (Value Objects):** `OrderStatus`, `WarehouseStatus`, `Quantity`.
- **Domain Constraints:** readiness aprobada y almacén operativo.

### Processing & Validations
1. Validar plan. 2. Confirmar reservas. 3. Cambiar a `PREPARING`. 4. Solicitar preparación.

### Persistence & Output
- **Output (Domain Model):** `OrderPreparationResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderPreparationStartedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_PREPARATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 16. Dispatch Order

### Description
Registra el despacho y cambia la orden a `SENT` con evidencia de Shipment.

### Responsibility
No declarar enviado sin tracking y confirmación logística.

### Input
- **Primary Input (Domain Model):** `OrderDispatchContext` con Order, Shipment y Warehouse.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `OrderStatus`, `WarehouseLocation`.
- **Domain Constraints:** pago autorizado, reserva vigente y tracking único.

### Processing & Validations
1. Validar Shipment. 2. Confirmar tracking. 3. Deducir reserva. 4. Cambiar a `SENT`.

### Persistence & Output
- **Output (Domain Model):** `OrderDispatchResult`.
- **Persisted Aggregates:** `Order`, Shipment/Inventory por sus servicios, `Operation`, `AuditLog`.
- **Generated Events:** `OrderDispatchedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_DISPATCH`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 17. Track Delivery Progress

### Description
Correlaciona estados de shipments y entrega para actualizar la vista de Order.

### Responsibility
Mantener estado de orden coherente con evidencia logística.

### Input
- **Primary Input (Domain Model):** `DeliveryProgressContext` con Order y Shipment status updates.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `OrderStatus`.
- **Domain Constraints:** eventos ordenados y tracking verificable.

### Processing & Validations
1. Validar tracking. 2. Ordenar eventos. 3. Correlacionar shipments. 4. Proponer transición.

### Persistence & Output
- **Output (Domain Model):** `DeliveryProgressResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderDeliveryProgressedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_DELIVERY_TRACKING`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 18. Predict Delivery Date

### Description
Calcula la fecha estimada usando Seller, Warehouse, carrier e historial de entregas.

### Responsibility
Ofrecer una predicción con confianza sin prometer una fecha contractual.

### Input
- **Primary Input (Domain Model):** `DeliveryPredictionContext` con Order, plan y evidencia histórica.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `DeliveryAddress`, `ShipmentStatus`.
- **Domain Constraints:** datos suficientes, modelo versionado y fecha actual confiable.

### Processing & Validations
1. Reunir tiempos históricos. 2. Considerar particiones. 3. Calcular intervalo. 4. Guardar predicción.

### Persistence & Output
- **Output (Domain Model):** `DeliveryPrediction`.
- **Persisted Aggregates:** Order solo como estimación versionada.
- **Generated Events:** `OrderDeliveryDatePredictedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_DELIVERY_PREDICTION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 19. Handle Fulfillment Exception

### Description
Gestiona fallos de stock, pago, almacén, tracking o preparación.

### Responsibility
Proponer cancelación, reintento, reasignación o revisión sin ocultar el incidente.

### Input
- **Primary Input (Domain Model):** `FulfillmentExceptionContext` con Order, excepción y evidencia.
- **Secondary Input (Value Objects):** `OrderStatus`, `PaymentStatus`, `WarehouseStatus`.
- **Domain Constraints:** causa codificada, actor y compensación explícitos.

### Processing & Validations
1. Clasificar excepción. 2. Evaluar impacto. 3. Proponer resolución. 4. Auditar.

### Persistence & Output
- **Output (Domain Model):** `FulfillmentExceptionResolution`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog` tras decisión.
- **Generated Events:** `OrderFulfillmentExceptionEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_FULFILLMENT_EXCEPTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 20. Update Order Delivery Address

### Description
Cambia la dirección solo cuando el estado y la logística lo permitan.

### Responsibility
Evitar que una dirección nueva rompa Shipment o evidencia de entrega.

### Input
- **Primary Input (Domain Model):** `OrderAddressChangeContext` con Order y `DeliveryAddress`.
- **Secondary Input (Value Objects):** `DeliveryAddress`, `OrderStatus`, `ShipmentStatus`.
- **Domain Constraints:** no despachada, dirección válida y autorización del Buyer.

### Processing & Validations
1. Validar estado. 2. Validar cobertura. 3. Recalcular envío. 4. Guardar nueva dirección.

### Persistence & Output
- **Output (Domain Model):** `OrderAddressChangeResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderDeliveryAddressChangedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_ADDRESS_CHANGE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 21. Close Order

### Description
Cierra la orden cuando entrega y obligaciones comerciales están completas.

### Responsibility
Finalizar el ciclo sin omitir pagos, factura, entrega o devoluciones pendientes.

### Input
- **Primary Input (Domain Model):** `OrderClosureContext` con Order, Shipment e Invoice.
- **Secondary Input (Value Objects):** `OrderStatus`, `ShipmentStatus`, `PaymentStatus`.
- **Domain Constraints:** entrega confirmada y obligaciones resueltas.

### Processing & Validations
1. Confirmar entrega. 2. Verificar pago e invoice. 3. Evaluar devoluciones abiertas. 4. Cerrar.

### Persistence & Output
- **Output (Domain Model):** `OrderClosureResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderClosedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_CLOSURE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 22. Archive Order

### Description
Prepara una representación de solo lectura para conservación histórica.

### Responsibility
Reducir carga operativa sin borrar la orden ni su trazabilidad.

### Input
- **Primary Input (Domain Model):** `OrderArchivalContext` con Order cerrado.
- **Secondary Input (Value Objects):** `OrderStatus`, `Currency`.
- **Domain Constraints:** estado terminal y retención vigente.

### Processing & Validations
1. Verificar cierre. 2. Sellar snapshot. 3. Transferir a almacenamiento histórico. 4. Mantener referencias.

### Persistence & Output
- **Output (Domain Model):** `OrderArchiveResult`.
- **Persisted Aggregates:** snapshot histórico, `Operation`, `AuditLog`.
- **Generated Events:** `OrderArchivedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_ARCHIVAL`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 23. Process Order Refund State

### Description
Actualiza la orden a `REFUNDED` cuando Return y Payment confirman el reembolso.

### Responsibility
No marcar reembolso por una solicitud pendiente o un pago no revertido.

### Input
- **Primary Input (Domain Model):** `OrderRefundContext` con Order, Return y Payment.
- **Secondary Input (Value Objects):** `OrderStatus`, `PaymentStatus`, `Currency`.
- **Domain Constraints:** Return aprobada, monto coherente y Payment reembolsado.

### Processing & Validations
1. Validar Return. 2. Comparar monto. 3. Confirmar Payment. 4. Cambiar estado.

### Persistence & Output
- **Output (Domain Model):** `OrderRefundStateResult`.
- **Persisted Aggregates:** `Order`, `Operation`, `AuditLog`.
- **Generated Events:** `OrderRefundedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_REFUND_STATE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 24. Audit Order Lifecycle

### Description
Construye una timeline de creación, cambios, pago, reservas, envío, entrega, cancelación y cierre.

### Responsibility
Hacer reconstruible toda la vida de la orden.

### Input
- **Primary Input (Domain Model):** `OrderAuditQuery` con Order, actor y periodo.
- **Secondary Input (Value Objects):** `OrderStatus`, `OperationType`, `AuditSeverity`.
- **Domain Constraints:** fuentes append-only y visibilidad autorizada.

### Processing & Validations
1. Autorizar consulta. 2. Leer operaciones. 3. Ordenar transiciones. 4. Detectar inconsistencias.

### Persistence & Output
- **Output (Domain Model):** `OrderLifecycleTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `OrderLifecycleAuditedEvent`.

### Operation & Audit
- **Operation Type:** `ORDER_LIFECYCLE_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### OrderRepositoryPort
```text
interface OrderRepositoryPort {
    Order save(Order order)
    Optional<Order> findByIdentifier(Order order)
    List<Order> findByBuyer(Buyer buyer)
    List<Order> findBySeller(Seller seller)
    List<Order> findByStatus(OrderStatus status)
}
```

#### OrderLineRepositoryPort
```text
interface OrderLineRepositoryPort {
    OrderLine save(OrderLine line)
    List<OrderLine> findByOrder(Order order)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByOrder(Order order, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByOrder(Order order, AuditQuery query)
}
```

### External Service Contracts

#### CartValidationPort
```text
interface CartValidationPort {
    CartValidationResult validate(ShoppingCart cart)
}
```

#### PaymentValidationPort
```text
interface PaymentValidationPort {
    PaymentDecision validate(Order order, Payment payment)
}
```

#### InventoryReservationPort
```text
interface InventoryReservationPort {
    ReservationResult reserve(Order order)
    ReservationReleaseResult release(Order order)
}
```

#### ProductSnapshotPort
```text
interface ProductSnapshotPort {
    ProductSnapshot retrieve(OrderLine line)
}
```

#### ShipmentReadinessPort
```text
interface ShipmentReadinessPort {
    ShipmentReadinessResult evaluate(Order order)
}
```

#### DeliveryPredictionPort
```text
interface DeliveryPredictionPort {
    DeliveryPrediction predict(DeliveryPredictionContext context)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(OrderOperationContext context)
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
interface CreateOrderUseCase {
    OrderCreationResult execute(OrderCreationContext context)
}
interface ConfirmOrderUseCase {
    OrderConfirmationResult execute(OrderConfirmationContext context)
}
interface CancelOrderUseCase {
    OrderCancellationResult execute(OrderCancellationContext context)
}
interface ValidateOrderUseCase {
    OrderValidationResult execute(OrderValidationContext context)
}
interface PrepareOrderUseCase {
    OrderPreparationResult execute(OrderPreparationContext context)
}
interface TrackOrderStatusUseCase {
    OrderStatusTimeline execute(OrderStatusQuery query)
}
interface CloseOrderUseCase {
    OrderClosureResult execute(OrderClosureContext context)
}
```

### Ejemplos de invocación

```text
const order = await createOrderUseCase.execute({
    buyer: buyer,
    cart: validatedCart,
    lines: cartLines,
    deliveryAddress: buyer.primaryDeliveryAddress(),
    currency: Currency.COP
})
```

```text
const confirmation = await confirmOrderUseCase.execute({
    order: pendingOrder,
    paymentDecision: authorizedPayment,
    reservation: inventoryReservation,
    totals: validatedTotals
})
```

## 7. Data Flow Diagram

```text
[Cart] -> [Create Order] -> [Order PENDING]
                              |
                  validate prices, payment, stock
                              v
                         [CONFIRMED]
                    /         |         \
              Payment     Inventory     Invoice
                              |
                              v
                         [PREPARING]
                              |
                         [Shipment]
                              v
                    [SENT] -> [DELIVERED]
                              |
                 [Close / Return / Refund]
                              v
                    [REFUNDED or ARCHIVED]
```

Order conserva el compromiso comercial; Cart origina, Payment autoriza, Inventory reserva/deduce, Shipment entrega y Billing factura.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Order.orderId` debe ser único y estable.
2. Cada orden debe referenciar un Buyer válido.
3. Cada línea debe referenciar un Product válido.
4. La cantidad de cada línea debe ser mayor que cero.
5. El subtotal de línea debe ser cantidad por precio unitario.
6. El subtotal de Order debe sumar sus líneas.
7. Total debe igualar subtotal, impuestos y shipping cost.
8. `OrderStatus` solo utiliza valores del catálogo.
9. `Currency` debe ser explícita y soportada.
10. Una Order conserva Seller y precios capturados por línea.

### Transactional Constraints

11. Crear Order requiere Cart válido.
12. Confirmar requiere Payment autorizado y monto exacto.
13. Confirmar requiere reservas de Inventory válidas.
14. Crear, confirmar y cancelar deben ser idempotentes.
15. Un timeout externo nunca confirma una orden.
16. Eventos se publican después de confirmar Order.
17. Cambiar estado valida estado actual y precondiciones.
18. Deducción de stock requiere despacho válido.
19. Cancelación coordina liberación y reversión sin borrar historia.
20. Reembolso cambia estado solo tras confirmación de Return y Payment.

### Authorization & Access Constraints

21. Buyer administra su orden dentro de límites permitidos.
22. Seller consulta solo órdenes de su operación.
23. Supervisor consulta, pero no ejecuta confirmaciones críticas.
24. Solo actores autorizados cancelan o cambian dirección.
25. Order no autoriza pagos por sí misma.
26. La creación de Shipment requiere readiness aprobada.
27. Las predicciones no constituyen garantía contractual.
28. Datos de Payment y Buyer se minimizan en vistas.
29. Acceso a timeline requiere actor y propósito.
30. Las políticas de cancelación dependen del estado de Order.

### Persistence & State Constraints

31. Precios y cantidades confirmados son inmutables.
32. `OrderStatus` respeta su ciclo de vida sin saltos.
33. `AuditLog` es inmutable y append-only.
34. `Operation` conserva actor, entidad, tipo y tiempo.
35. Órdenes cerradas son de solo lectura salvo flujo de devolución.
36. Archivar no elimina Order ni sus referencias financieras.
37. Repositorios reciben modelos y value objects, no DTOs ni ORM.
38. Timestamps proceden de `ClockPort`.
39. Adaptadores no filtran SQL, HTTP o detalles de proveedores.
40. Versiones de Order deben permitir reconstruir condiciones históricas.

### Cross-Aggregate Constraints

41. Order no modifica internamente Cart, Product, Inventory, Payment o Shipment.
42. Cart es fuente de verdad de selección antes de crear Order.
43. Catalog es fuente de verdad del precio vigente, no del precio confirmado.
44. Inventory es fuente de verdad de reservas y disponibilidad.
45. Payment es fuente de verdad de autorización y reembolso.
46. Shipment es fuente de verdad de tracking y entrega.
47. Billing es fuente de verdad de Invoice e impuestos financieros.
48. Cambios externos se coordinan con eventos y compensaciones explícitas.

### Audit, Performance & Business Rules

49. Creación, confirmación, cancelación, despacho, entrega, cierre y refund generan auditoría crítica.
50. Auditoría no contiene credenciales, secretos, datos completos de pago ni información innecesaria.
