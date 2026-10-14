# Logistics Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para crear, preparar, enrutar, rastrear y cerrar envíos de NexusMarket.

### Introducción

`Shipment` es el agregado raíz logístico asociado a una `Order`, un `Warehouse`, una `DeliveryAddress`, un `Carrier` y un `ShipmentTracking`. El ciclo operativo usa `SCHEDULED`, `IN_PREPARATION`, `IN_TRANSIT`, `DELIVERED`, `FAILED` y `RETAINED`. Un envío solo se genera cuando la orden está validada y existe stock; el tracking debe ser único y cada actualización debe conservar evidencia cronológica. Logistics Services coordina carriers, rutas, costos, predicciones, notificaciones y excepciones mediante puertos. Inventory, Order, Warehouse y Payment conservan sus propias fuentes de verdad. Toda transición crítica produce `Operation` y `AuditLog`.

### Responsabilidades principales

- Crear y preparar envíos desde órdenes válidas.
- Seleccionar carrier, servicio y costo.
- Generar tracking único y registrar eventos.
- Coordinar almacenes, rutas y despachos.
- Integrar múltiples carriers con fallback.
- Predecir entregas y emitir alertas proactivas.
- Confirmar entregas con evidencia.
- Resolver fallos, retrasos y excepciones.

### Relación con Domain Model

Entidades: `Shipment`, `Order`, `Warehouse`, `Carrier`, `DeliveryAddress`, `Operation` y `AuditLog`. Value objects: `ShipmentStatus`, `ShipmentTracking`, `WarehouseLocation`, `DeliveryAddress`, `Currency`, `PaymentStatus` y `OrderStatus`. `Shipment` es aggregate root; Order, Inventory, Warehouse y Return son límites externos consultados o coordinados mediante puertos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
createShipment(UUID orderId, String address, String carrier)
```

Correcto:
```text
createShipment(CreateShipmentContext context)
// context.order, context.deliveryAddress and carrierSelection are domain concepts
```

### Principio 2: Validación de datos externos

Carriers, geocodificación, tracking, costos y confirmaciones se validan por proveedor, correlación, fecha y firma. Un evento desconocido no cambia el estado del envío.

### Principio 3: Inmutabilidad de Value Objects

`DeliveryAddress`, `WarehouseLocation`, `ShipmentTracking`, `Currency` y estados son inmutables. Una corrección crea un evento o valor nuevo, nunca reescribe evidencia histórica.

### Principio 4: Traceabilidad operacional

Creación, despacho, selección de carrier, tracking, entrega, excepción, fallback y cambio de ruta generan `Operation` y `AuditLog` según impacto.

### Principio 5: Transaccionalidad y consistencia

Shipment mantiene sus transiciones atómicas. Inventory deduce stock y Order actualiza progreso mediante sus servicios; Logistics no modifica sus agregados directamente.

## 3. Domain Model Context

### Entidades principales involucradas

- `Shipment`: destino, carrier, tracking, estado y fechas.
- `Order`: orden validada y condiciones de fulfillment.
- `Warehouse`: origen operativo y ubicación.
- `Carrier`: proveedor y servicio de transporte.
- `DeliveryAddress`: destino capturado para la transacción.
- `Operation` / `AuditLog`: trazabilidad.

### Value Objects utilizados

`ShipmentStatus`, `ShipmentTracking`, `WarehouseLocation`, `DeliveryAddress`, `Currency`, `OrderStatus`, `PaymentStatus` y `Quantity`.

### Aggregates y boundaries

```text
Order (root) --> Shipment (root)
                   |-- DeliveryAddress snapshot
                   |-- Warehouse reference
                   |-- Carrier
                   |-- ShipmentTracking
                   +-- ShipmentStatus
Warehouse --origin--> Shipment
Inventory --stock evidence--> Shipment
```

Shipment controla su estado y tracking. Order conserva la transacción; Warehouse e Inventory controlan preparación y stock.

### Ciclo de vida relevante

```text
SCHEDULED --> IN_PREPARATION --> IN_TRANSIT --> DELIVERED
     |              |                |
     +------------> RETAINED <-------+---- FAILED
                         |
                         +--resolve--> IN_PREPARATION / IN_TRANSIT
```

El tracking debe ser único, las transiciones ordenadas y un fallo debe abrir resolución logística.

## 4. Numbered Services

## 1. Create Shipment

### Description
Crea un envío planificado para una orden validada.

### Responsibility
Establecer Order, Warehouse, destino y estado `SCHEDULED` coherentes.

### Input
- **Primary Input (Domain Model):** `CreateShipmentContext` con Order, Warehouse y destino.
- **Secondary Input (Value Objects):** `DeliveryAddress`, `WarehouseLocation`, `OrderStatus`.
- **Domain Constraints:** orden validada, stock disponible y almacén operativo.

### Processing & Validations
1. Validar Order. 2. Validar Warehouse. 3. Copiar dirección. 4. Crear Shipment.

### Persistence & Output
- **Output (Domain Model):** `ShipmentCreationResult`.
- **Persisted Aggregates:** `Shipment`, `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentCreatedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_CREATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 2. Validate Shipment Eligibility

### Description
Comprueba que una orden, stock, dirección y almacén permiten generar el envío.

### Responsibility
Impedir shipments prematuros o sin fulfillment válido.

### Input
- **Primary Input (Domain Model):** `ShipmentEligibilityContext` con Order, Inventory y Warehouse.
- **Secondary Input (Value Objects):** `OrderStatus`, `PaymentStatus`, `WarehouseStatus`.
- **Domain Constraints:** orden validada, pago autorizado cuando aplique y stock disponible.

### Processing & Validations
1. Validar Order. 2. Confirmar Inventory. 3. Revisar Warehouse. 4. Emitir decisión.

### Persistence & Output
- **Output (Domain Model):** `ShipmentEligibilityDecision`.
- **Persisted Aggregates:** ninguno; decisión auditable.
- **Generated Events:** `ShipmentEligibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_ELIGIBILITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 3. Prepare Shipment

### Description
Pasa un Shipment programado a preparación en almacén.

### Responsibility
Abrir preparación solo con Warehouse e Inventory listos.

### Input
- **Primary Input (Domain Model):** `ShipmentPreparationContext` con Shipment, Order y Warehouse.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `WarehouseStatus`, `Quantity`.
- **Domain Constraints:** reserva vigente y almacén operativo.

### Processing & Validations
1. Validar reserva. 2. Confirmar almacén. 3. Cambiar a `IN_PREPARATION`. 4. Solicitar picking.

### Persistence & Output
- **Output (Domain Model):** `ShipmentPreparationResult`.
- **Persisted Aggregates:** `Shipment`, `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentPreparationStartedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_PREPARATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 4. Select Carrier

### Description
Selecciona carrier y servicio según destino, costo, SLA, capacidad y restricciones.

### Responsibility
Proponer el transporte más adecuado y explicable.

### Input
- **Primary Input (Domain Model):** `CarrierSelectionContext` con Shipment, ruta y requisitos.
- **Secondary Input (Value Objects):** `DeliveryAddress`, `WarehouseLocation`, `Currency`.
- **Domain Constraints:** carrier disponible, cobertura, costo y SLA válidos.

### Processing & Validations
1. Consultar opciones. 2. Filtrar cobertura. 3. Comparar costos y SLA. 4. Seleccionar servicio.

### Persistence & Output
- **Output (Domain Model):** `CarrierSelectionResult`.
- **Persisted Aggregates:** Shipment tras aceptación, `Operation`.
- **Generated Events:** `CarrierSelectedEvent`.

### Operation & Audit
- **Operation Type:** `CARRIER_SELECTION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Calculate Shipping Cost

### Description
Calcula el costo estimado o confirmado del envío en una moneda soportada.

### Responsibility
Entregar desglose reproducible de tarifa, recargos y descuentos.

### Input
- **Primary Input (Domain Model):** `ShippingCostContext` con Shipment, Carrier y ruta.
- **Secondary Input (Value Objects):** `Currency`, `WarehouseLocation`, `DeliveryAddress`.
- **Domain Constraints:** tarifa vigente, ruta válida y moneda explícita.

### Processing & Validations
1. Calcular distancia. 2. Aplicar tarifa. 3. Añadir recargos. 4. Sellar cotización.

### Persistence & Output
- **Output (Domain Model):** `ShippingCostResult`.
- **Persisted Aggregates:** cotización y `Operation`.
- **Generated Events:** `ShippingCostCalculatedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPPING_COST_CALCULATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 6. Generate Shipment Tracking

### Description
Obtiene un código único y crea el value object de tracking del Shipment.

### Responsibility
Establecer identificación interoperable y trazable del envío.

### Input
- **Primary Input (Domain Model):** `TrackingCreationContext` con Shipment y Carrier.
- **Secondary Input (Value Objects):** `ShipmentTracking`, `ShipmentStatus`.
- **Domain Constraints:** código único, carrier confirmado y formato válido.

### Processing & Validations
1. Solicitar código. 2. Validar unicidad. 3. Asociar carrier. 4. Guardar tracking.

### Persistence & Output
- **Output (Domain Model):** `ShipmentTrackingResult`.
- **Persisted Aggregates:** `Shipment`, `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentTrackingGeneratedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_TRACKING_CREATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 7. Dispatch Shipment

### Description
Despacha un Shipment preparado y lo cambia a `IN_TRANSIT`.

### Responsibility
No declarar movimiento sin pago, stock, tracking y carrier válidos.

### Input
- **Primary Input (Domain Model):** `ShipmentDispatchContext` con Shipment, Order, Inventory y Carrier.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `PaymentStatus`, `ShipmentTracking`.
- **Domain Constraints:** Order validada, pago autorizado, reserva/deducción válida y tracking único.

### Processing & Validations
1. Confirmar preparación. 2. Validar tracking. 3. Solicitar dispatch. 4. Cambiar estado.

### Persistence & Output
- **Output (Domain Model):** `ShipmentDispatchResult`.
- **Persisted Aggregates:** `Shipment`, Inventory por su servicio, `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentDispatchedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_DISPATCH`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 8. Track Shipment

### Description
Obtiene y registra actualizaciones cronológicas del carrier.

### Responsibility
Mantener el progreso del Shipment sin aceptar eventos inválidos.

### Input
- **Primary Input (Domain Model):** `ShipmentTrackingContext` con Shipment y tracking.
- **Secondary Input (Value Objects):** `ShipmentTracking`, `ShipmentStatus`.
- **Domain Constraints:** evento correlacionado, orden temporal y carrier reconocido.

### Processing & Validations
1. Consultar carrier. 2. Validar evento. 3. Ordenar actualizaciones. 4. Proponer estado.

### Persistence & Output
- **Output (Domain Model):** `ShipmentTrackingResult`.
- **Persisted Aggregates:** `Shipment`, `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentTrackingUpdatedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_TRACKING_UPDATE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 9. Change Shipment Status

### Description
Aplica una transición logística válida a partir de evidencia de tracking u operación.

### Responsibility
Proteger el ciclo de vida del Shipment.

### Input
- **Primary Input (Domain Model):** `ShipmentStatusContext` con Shipment y evento.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `ShipmentTracking`.
- **Domain Constraints:** transición permitida y evidencia suficiente.

### Processing & Validations
1. Validar estado actual. 2. Confirmar evento. 3. Cambiar estado. 4. Auditar.

### Persistence & Output
- **Output (Domain Model):** `ShipmentStatusChangeResult`.
- **Persisted Aggregates:** `Shipment`, `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentStatusChangedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_STATUS_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 10. Confirm Delivery

### Description
Confirma entrega con evidencia de carrier y destinatario permitido.

### Responsibility
Cambiar Shipment a `DELIVERED` solo con prueba válida.

### Input
- **Primary Input (Domain Model):** `DeliveryConfirmationContext` con Shipment y confirmación.
- **Secondary Input (Value Objects):** `ShipmentTracking`, `DeliveryAddress`, `ShipmentStatus`.
- **Domain Constraints:** tracking, ubicación, fecha y evidencia verificables.

### Processing & Validations
1. Validar carrier. 2. Verificar evidencia. 3. Confirmar destinatario. 4. Cambiar estado.

### Persistence & Output
- **Output (Domain Model):** `DeliveryConfirmationResult`.
- **Persisted Aggregates:** `Shipment`, `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentDeliveredEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_DELIVERY`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 11. Predict Delivery

### Description
Estima fecha e intervalo de entrega usando ruta, carrier e historial.

### Responsibility
Proporcionar predicción con confianza sin crear una promesa contractual.

### Input
- **Primary Input (Domain Model):** `DeliveryPredictionContext` con Shipment, ruta y evidencia.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `DeliveryAddress`, `Currency`.
- **Domain Constraints:** datos suficientes, modelo versionado y fecha de cálculo.

### Processing & Validations
1. Reunir historial. 2. Considerar SLA. 3. Calcular intervalo. 4. Registrar confianza.

### Persistence & Output
- **Output (Domain Model):** `DeliveryPrediction`.
- **Persisted Aggregates:** predicción y `Operation`; no cambia estado logístico.
- **Generated Events:** `DeliveryPredictedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_PREDICTION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 12. Optimize Delivery Route

### Description
Propone una ruta considerando ubicación, SLA, restricciones y costos.

### Responsibility
Mejorar tiempo y costo sin alterar automáticamente el carrier confirmado.

### Input
- **Primary Input (Domain Model):** `RouteOptimizationContext` con Shipment, Warehouse y DeliveryAddress.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `DeliveryAddress`, `Currency`.
- **Domain Constraints:** puntos válidos, restricciones conocidas y versión de mapa.

### Processing & Validations
1. Validar puntos. 2. Calcular alternativas. 3. Comparar SLA. 4. Proponer ruta.

### Persistence & Output
- **Output (Domain Model):** `DeliveryRoutePlan`.
- **Persisted Aggregates:** plan versionado y `Operation`.
- **Generated Events:** `DeliveryRouteOptimizedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_ROUTE_OPTIMIZATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 13. Apply Carrier Fallback

### Description
Selecciona un carrier alternativo cuando el principal no puede cumplir el despacho o SLA.

### Responsibility
Mantener continuidad sin perder tracking ni duplicar despachos.

### Input
- **Primary Input (Domain Model):** `CarrierFallbackContext` con Shipment, selección y evidencia de fallo.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `Currency`, `DeliveryAddress`.
- **Domain Constraints:** no existe dispatch duplicado; carrier alternativo cubre destino.

### Processing & Validations
1. Confirmar fallo. 2. Evaluar alternativas. 3. Cancelar intento anterior. 4. Asignar carrier nuevo.

### Persistence & Output
- **Output (Domain Model):** `CarrierFallbackResult`.
- **Persisted Aggregates:** `Shipment`, `Operation`, `AuditLog`.
- **Generated Events:** `CarrierFallbackAppliedEvent`.

### Operation & Audit
- **Operation Type:** `CARRIER_FALLBACK`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 14. Handle Delivery Exception

### Description
Clasifica fallas, retrasos, dirección incorrecta, daño o intento fallido.

### Responsibility
Abrir una resolución logística trazable y proporcional.

### Input
- **Primary Input (Domain Model):** `DeliveryExceptionContext` con Shipment y evidencia.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `DeliveryAddress`, `ShipmentTracking`.
- **Domain Constraints:** causa codificada, evidencia fechada y actor identificado.

### Processing & Validations
1. Clasificar excepción. 2. Evaluar impacto. 3. Cambiar a `FAILED` o `RETAINED`. 4. Crear resolución.

### Persistence & Output
- **Output (Domain Model):** `DeliveryExceptionResolution`.
- **Persisted Aggregates:** `Shipment`, caso, `Operation`, `AuditLog`.
- **Generated Events:** `DeliveryExceptionDetectedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_EXCEPTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 15. Resolve Delivery Exception

### Description
Ejecuta reintento, redirección, devolución a origen o escalamiento.

### Responsibility
Resolver la excepción sin ocultar el historial del intento fallido.

### Input
- **Primary Input (Domain Model):** `ExceptionResolutionContext` con Shipment, caso y decisión.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `DeliveryAddress`, `ShipmentTracking`.
- **Domain Constraints:** decisión aprobada, destino válido y carrier disponible.

### Processing & Validations
1. Validar decisión. 2. Comprobar costo y ruta. 3. Ejecutar acción. 4. Actualizar estado.

### Persistence & Output
- **Output (Domain Model):** `ExceptionResolutionResult`.
- **Persisted Aggregates:** `Shipment`, caso, `Operation`, `AuditLog`.
- **Generated Events:** `DeliveryExceptionResolvedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_EXCEPTION_RESOLUTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 16. Notify Shipment Progress

### Description
Envía al Buyer o Seller una actualización autorizada de preparación, tránsito o entrega.

### Responsibility
Comunicar datos útiles sin revelar información de terceros.

### Input
- **Primary Input (Domain Model):** `ShipmentNotificationContext` con Shipment y audiencia.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `ShipmentTracking`, `DeliveryAddress`.
- **Domain Constraints:** consentimiento, canal permitido y mensaje minimizado.

### Processing & Validations
1. Autorizar audiencia. 2. Construir mensaje. 3. Notificar. 4. Registrar entrega.

### Persistence & Output
- **Output (Domain Model):** `ShipmentNotificationResult`.
- **Persisted Aggregates:** `Operation`, `AuditLog`.
- **Generated Events:** `ShipmentProgressNotifiedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_PROGRESS_NOTIFICATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 17. Validate Delivery Address Coverage

### Description
Comprueba que carrier y ruta puedan entregar en la dirección capturada.

### Responsibility
Evitar despachos a destinos fuera de cobertura o ambiguos.

### Input
- **Primary Input (Domain Model):** `DeliveryCoverageContext` con Shipment y `DeliveryAddress`.
- **Secondary Input (Value Objects):** `DeliveryAddress`, `WarehouseLocation`, `Currency`.
- **Domain Constraints:** dirección validada, carrier disponible y cobertura vigente.

### Processing & Validations
1. Normalizar dirección. 2. Consultar cobertura. 3. Comparar restricciones. 4. Emitir decisión.

### Persistence & Output
- **Output (Domain Model):** `DeliveryCoverageResult`.
- **Persisted Aggregates:** ninguno; decisión auditable.
- **Generated Events:** `DeliveryCoverageValidatedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_COVERAGE_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 18. Reconcile Shipment Tracking

### Description
Compara tracking local y eventos del carrier para detectar inconsistencias.

### Responsibility
Mantener una timeline única y confiable del Shipment.

### Input
- **Primary Input (Domain Model):** `TrackingReconciliationContext` con Shipment y evidencia externa.
- **Secondary Input (Value Objects):** `ShipmentTracking`, `ShipmentStatus`.
- **Domain Constraints:** eventos correlacionados y timestamps ordenables.

### Processing & Validations
1. Consultar carrier. 2. Comparar eventos. 3. Clasificar divergencia. 4. Abrir investigación.

### Persistence & Output
- **Output (Domain Model):** `TrackingReconciliationReport`.
- **Persisted Aggregates:** reporte, `Operation`, `AuditLog`.
- **Generated Events:** `TrackingDiscrepancyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `SHIPMENT_TRACKING_RECONCILIATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 19. Audit Logistics Lifecycle

### Description
Construye una timeline de creación, selección, despacho, tracking, entrega y excepciones.

### Responsibility
Reconstruir el ciclo logístico y sus decisiones.

### Input
- **Primary Input (Domain Model):** `ShipmentAuditQuery` con Shipment, Order y periodo.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `ShipmentTracking`, `AuditSeverity`.
- **Domain Constraints:** fuentes append-only y actor autorizado.

### Processing & Validations
1. Autorizar consulta. 2. Leer eventos. 3. Ordenar timeline. 4. Identificar anomalías.

### Persistence & Output
- **Output (Domain Model):** `ShipmentLifecycleTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `LogisticsLifecycleAuditedEvent`.

### Operation & Audit
- **Operation Type:** `LOGISTICS_LIFECYCLE_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### ShipmentRepositoryPort
```text
interface ShipmentRepositoryPort {
    Shipment save(Shipment shipment)
    Optional<Shipment> findByIdentifier(Shipment shipment)
    List<Shipment> findByOrder(Order order)
    Optional<Shipment> findByTrackingCode(TrackingCode code)
    List<Shipment> findByStatus(ShipmentStatus status)
}
```

#### RoutePlanRepositoryPort
```text
interface RoutePlanRepositoryPort {
    RoutePlan save(RoutePlan plan)
    List<RoutePlan> findByShipment(Shipment shipment)
}
```

#### DeliveryExceptionRepositoryPort
```text
interface DeliveryExceptionRepositoryPort {
    DeliveryException save(DeliveryException exception)
    Optional<DeliveryException> findOpenByShipment(Shipment shipment)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByShipment(Shipment shipment, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByShipment(Shipment shipment, AuditQuery query)
}
```

### External Service Contracts

#### LogisticsIntegrationPort
```text
interface LogisticsIntegrationPort {
    DispatchResult dispatch(Shipment shipment)
    ShipmentTracking getTracking(Shipment shipment)
    DeliveryConfirmation confirmDelivery(Shipment shipment)
    LogisticsException resolveException(Shipment shipment)
}
```

#### CarrierSelectionPort
```text
interface CarrierSelectionPort {
    CarrierOptions findOptions(CarrierSelectionContext context)
    CarrierSelectionResult select(CarrierSelectionContext context)
}
```

#### ShippingCostPort
```text
interface ShippingCostPort {
    ShippingCostResult quote(ShippingCostContext context)
}
```

#### RouteOptimizationPort
```text
interface RouteOptimizationPort {
    DeliveryRoutePlan optimize(RouteOptimizationContext context)
}
```

#### DeliveryPredictionPort
```text
interface DeliveryPredictionPort {
    DeliveryPrediction predict(DeliveryPredictionContext context)
}
```

#### WarehouseReadinessPort
```text
interface WarehouseReadinessPort {
    WarehouseReadinessResult validate(Warehouse warehouse, Shipment shipment)
}
```

#### InventoryEvidencePort
```text
interface InventoryEvidencePort {
    InventoryFulfillmentEvidence retrieve(Order order, Shipment shipment)
}
```

#### OrderFulfillmentPort
```text
interface OrderFulfillmentPort {
    OrderFulfillmentContext retrieve(Order order)
    OrderStatusUpdate updateProgress(Order order, Shipment shipment)
}
```

#### NotificationPort
```text
interface NotificationPort {
    NotificationReceipt notify(Shipment shipment, DomainNotification notification)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(LogisticsOperationContext context)
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
interface CreateShipmentUseCase {
    ShipmentCreationResult execute(CreateShipmentContext context)
}
interface SelectCarrierUseCase {
    CarrierSelectionResult execute(CarrierSelectionContext context)
}
interface DispatchShipmentUseCase {
    ShipmentDispatchResult execute(ShipmentDispatchContext context)
}
interface TrackShipmentUseCase {
    ShipmentTrackingResult execute(ShipmentTrackingContext context)
}
interface ConfirmDeliveryUseCase {
    DeliveryConfirmationResult execute(DeliveryConfirmationContext context)
}
interface HandleDeliveryExceptionUseCase {
    DeliveryExceptionResolution execute(DeliveryExceptionContext context)
}
interface PredictDeliveryUseCase {
    DeliveryPrediction execute(DeliveryPredictionContext context)
}
interface OptimizeDeliveryRouteUseCase {
    DeliveryRoutePlan execute(RouteOptimizationContext context)
}
```

### Ejemplos de invocación

```text
const shipment = await createShipmentUseCase.execute({
    order: validatedOrder,
    warehouse: operationalWarehouse,
    deliveryAddress: order.deliveryAddress,
    inventoryEvidence: reservedInventory
})
```

```text
const carrier = await selectCarrierUseCase.execute({
    shipment: scheduledShipment,
    route: optimizedRoute,
    carrierPolicy: activeCarrierPolicy,
    currency: Currency.COP
})
```

## 7. Data Flow Diagram

```text
[Order + Inventory + Warehouse]
              |
              v
[Logistics Use Case / Input Port]
              |
              v
[Shipment Domain Service]
   |          |          |           |
   |          |          |           +--> Carrier / Tracking Integration
   |          |          +--------------> Route / Cost / Prediction Ports
   |          +-------------------------> Order / Inventory Readiness Ports
   +------------------------------------> Shipment Repository
              |
              +--> Operation + AuditLog
              v
     [Shipment Result / Domain Event]
              v
       Buyer, Seller, Order, Admin
```

Logistics posee el estado del envío; Order conserva la compra, Inventory el stock y el carrier la ejecución física externa.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Shipment.shipmentId` debe ser único y estable.
2. Cada Shipment debe referenciar una Order válida.
3. El Warehouse de origen debe existir y pertenecer al contexto autorizado.
4. `DeliveryAddress` debe ser completo y validado.
5. `ShipmentTracking.trackingCode` debe ser único.
6. Cada tracking debe identificar un carrier.
7. `ShipmentStatus` solo usa valores del catálogo.
8. `statusUpdates` debe conservar orden cronológico.
9. `departureDate` solo existe después del despacho.
10. `deliveryDate` solo existe tras evidencia de entrega.

### Transactional Constraints

11. Crear Shipment requiere Order validada y stock disponible.
12. Despachar requiere pago autorizado cuando la política lo exige.
13. Dispatch y transición a `IN_TRANSIT` deben ser idempotentes.
14. Un timeout del carrier no confirma despacho ni entrega.
15. Tracking externo debe correlacionarse antes de cambiar estado.
16. Eventos se publican después de confirmar Shipment.
17. Fallback no puede crear dos despachos activos.
18. Una excepción debe abrir una resolución antes de cerrar el caso.
19. Confirmar entrega requiere evidencia verificable.
20. Las compensaciones de carrier se registran como nuevas operaciones.

### Authorization & Access Constraints

21. Solo operadores autorizados ejecutan despacho o resolución.
22. Buyer puede consultar su tracking, no modificarlo.
23. Seller consulta sus envíos, no los de otro vendedor.
24. Supervisor consulta logística, pero no confirma entregas sin autoridad.
25. Cambiar dirección requiere estado y autorización compatibles.
26. Carrier recibe solo datos necesarios para entregar.
27. La ruta propuesta no puede saltar restricciones de cobertura.
28. Predicciones no son garantías contractuales.
29. Excepciones críticas requieren escalamiento definido.
30. Las notificaciones minimizan datos personales y de terceros.

### Persistence & State Constraints

31. Shipment respeta `SCHEDULED`, `IN_PREPARATION`, `IN_TRANSIT`, `DELIVERED`, `FAILED` y `RETAINED`.
32. No se permiten saltos de estado sin evidencia y política.
33. Tracking histórico es append-only.
34. `AuditLog` es inmutable y append-only.
35. `Operation` conserva actor, entidad, tipo y tiempo.
36. Repositorios reciben modelos de dominio, no DTOs ni ORM.
37. Timestamps proceden de `ClockPort`.
38. Adaptadores no filtran HTTP, credenciales o detalles del carrier.
39. Una dirección usada por una orden histórica no se sobrescribe.
40. Un shipment entregado no vuelve a preparación por actualización ordinaria.

### Cross-Aggregate Constraints

41. Logistics no modifica directamente Order, Inventory, Payment o Warehouse.
42. Order conserva la fuente de verdad del compromiso comercial.
43. Inventory conserva la fuente de verdad de stock y reserva.
44. Warehouse conserva la fuente de verdad de operación física.
45. Payment conserva la fuente de verdad de autorización.
46. Carrier ejecuta transporte; Shipment conserva la decisión y evidencia de dominio.
47. Una deducción de inventario ocurre mediante Inventory Services.
48. Un cambio de estado de Order se coordina mediante Order Services.

### Audit, Performance & Business Rules

49. Creación, despacho, tracking, entrega, fallback, excepciones y cambios de carrier generan auditoría.
50. Auditoría no contiene credenciales, tokens ni datos innecesarios; predicciones y rutas incluyen versión, fecha y confianza.
