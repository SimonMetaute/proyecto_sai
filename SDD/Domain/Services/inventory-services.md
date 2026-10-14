# Inventory Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios del subdominio de inventario y almacenes de NexusMarket. Formaliza recepción, movimientos, reservas, disponibilidad, ajustes, discrepancias y coordinación distribuida.

### Introducción

`Warehouse` representa la capacidad física y su estado operativo; `Inventory` relaciona un `Product` con un almacén y conserva unidades disponibles, reservadas y totales. El subdominio garantiza que `availableStock + reservedStock = totalStock`, que toda reserva tenga una orden válida y que cada movimiento sea transaccional y trazable. `WarehouseLocation` expresa la ubicación como value object inmutable. Las decisiones de disponibilidad, predicción y rebalanceo se calculan con evidencia histórica, pero no cambian stock sin un movimiento autorizado. Order, Catalog, Logistics y Seller se coordinan mediante puertos y eventos.

### Responsabilidades principales

- Registrar y administrar almacenes.
- Controlar estados y capacidad operativa.
- Crear inventarios por producto y almacén.
- Registrar entradas, salidas, devoluciones y ajustes.
- Reservar y liberar stock para órdenes.
- Validar disponibilidad y preparación de despachos.
- Predecir disponibilidad y detectar discrepancias.
- Rebalancear stock distribuido de forma controlada.

### Relación con Domain Model

Entidades: `Warehouse`, `Inventory`, `Product`, `Seller`, `Order`, `Operation` y `AuditLog`. Value objects: `WarehouseLocation`, `WarehouseStatus`, `InventoryMovementType`, `ProductStatus` y `Currency` cuando se proyecta valor. Aggregates: `Warehouse` e `Inventory` como raíces independientes. Order y Shipment proveen contexto de reserva y despacho; Catalog provee producto elegible.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
reserveStock(UUID productId, UUID warehouseId, int quantity)
```

Correcto:
```text
reserveInventory(ReserveInventoryContext context)
// context.product, context.warehouse, context.order and context.quantity are domain concepts
```

### Principio 2: Validación de datos externos

Órdenes, productos, escaneos de almacén, transportistas y datos históricos se validan antes de mover stock. Una señal desactualizada no habilita una reserva.

### Principio 3: Inmutabilidad de Value Objects

`WarehouseLocation`, `WarehouseStatus`, `InventoryMovementType` y cantidades validadas no se mutan en sitio. Todo cambio crea un valor y movimiento de dominio nuevo.

### Principio 4: Traceabilidad operacional

Cada entrada, reserva, liberación, deducción, devolución, ajuste, discrepancia o rebalanceo genera `Operation` y `AuditLog` según impacto.

### Principio 5: Transaccionalidad y consistencia

Las modificaciones de `Inventory` son atómicas y preservan el invariante de existencias. La coordinación con Order, Shipment y Product ocurre por puertos y eventos, no por mutaciones directas.

## 3. Domain Model Context

### Entidades principales involucradas

- **Warehouse:** ubicación, capacidad, Seller responsable y estado.
- **Inventory:** producto, almacén, stock disponible, reservado y total.
- **Product:** identidad y elegibilidad de catálogo.
- **Order:** referencia válida para reservas y deducciones.
- **Operation / AuditLog:** movimientos y decisiones trazables.

### Value Objects utilizados

`WarehouseLocation`, `WarehouseStatus` (`OPERATIONAL`, `CLOSED`, `MAINTENANCE`), `InventoryMovementType` (`ENTRY`, `RESERVATION`, `DEDUCTION`, `ADJUSTMENT`, `RELEASE`, `RETURN`), `ProductStatus`, `Currency` y `Quantity`.

### Aggregates y boundaries

```text
Seller (root) --> Warehouse (root)
                    |-- WarehouseLocation
                    |-- WarehouseStatus
                    +-- capacity

Product (root) --> Inventory (root)
                    |-- availableStock
                    |-- reservedStock
                    +-- totalStock
Inventory --reservation--> Order
Inventory --dispatch------> Shipment
```

Warehouse controla operación física; Inventory controla cantidades del producto en ese almacén. Order conserva la identidad de la reserva y Shipment confirma la deducción operativa.

### Ciclos de vida relevantes

```text
Warehouse: OPERATIONAL <--> MAINTENANCE --> CLOSED
Inventory: NoStock --> Available --> Reserved --> Deducted
                         ^            |
                         +-- Release-+
Movement: Requested --> Validated --> Applied --> Audited
```

Un almacén no operativo no recibe, reserva ni despacha stock. Toda reserva debe estar vinculada a una orden abierta.

## 4. Numbered Services

## 1. Register Warehouse

### Description
Crea un almacén para un Seller o para la operación marketplace.

### Responsibility
Establecer ubicación, capacidad y estado inicial válidos.

### Input
- **Primary Input (Domain Model):** `WarehouseRegistrationContext` con `Seller` y `WarehouseDraft`.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `WarehouseStatus`.
- **Domain Constraints:** ubicación válida, capacidad positiva y responsable autorizado.

### Processing & Validations
1. Validar Seller. 2. Validar ubicación. 3. Comprobar nombre único. 4. Crear almacén `OPERATIONAL` o `MAINTENANCE`.

### Persistence & Output
- **Output (Domain Model):** `WarehouseRegistrationResult`.
- **Persisted Aggregates:** `Warehouse`, `Operation`, `AuditLog`.
- **Generated Events:** `WarehouseRegisteredEvent`.

### Operation & Audit
- **Operation Type:** `WAREHOUSE_REGISTRATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 2. Consult Warehouse

### Description
Devuelve la vista operativa de un almacén, su ubicación, capacidad y existencias asociadas.

### Responsibility
Exponer datos autorizados sin mutar Warehouse o Inventory.

### Input
- **Primary Input (Domain Model):** `WarehouseQueryContext` con `Warehouse` y actor.
- **Secondary Input (Value Objects):** `WarehouseStatus`, `WarehouseLocation`.
- **Domain Constraints:** alcance del actor y visibilidad por rol.

### Processing & Validations
1. Autorizar consulta. 2. Cargar Warehouse. 3. Consultar resumen de Inventory. 4. Ocultar datos restringidos.

### Persistence & Output
- **Output (Domain Model):** `WarehouseOperationalView`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `WarehouseConsultedEvent`.

### Operation & Audit
- **Operation Type:** `WAREHOUSE_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 3. Change Warehouse State

### Description
Cambia el almacén entre operación, mantenimiento y cierre.

### Responsibility
Controlar transiciones que afectan recepción, reserva y despacho.

### Input
- **Primary Input (Domain Model):** `WarehouseStateContext` con `Warehouse`, estado y motivo.
- **Secondary Input (Value Objects):** `WarehouseStatus`, `OperationType`.
- **Domain Constraints:** transición válida y plan para stock activo.

### Processing & Validations
1. Validar autoridad. 2. Revisar stock reservado. 3. Cambiar estado. 4. Notificar a Logistics y Order.

### Persistence & Output
- **Output (Domain Model):** `WarehouseStateChangeResult`.
- **Persisted Aggregates:** `Warehouse`, `Operation`, `AuditLog`.
- **Generated Events:** `WarehouseStateChangedEvent`.

### Operation & Audit
- **Operation Type:** `WAREHOUSE_STATE_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 4. Validate Warehouse Capacity

### Description
Comprueba si la capacidad estimada permite recibir una cantidad de producto.

### Responsibility
Evitar sobreasignación física del almacén.

### Input
- **Primary Input (Domain Model):** `WarehouseCapacityContext` con `Warehouse`, Inventory y recepción.
- **Secondary Input (Value Objects):** `WarehouseStatus`, `Quantity`.
- **Domain Constraints:** almacén operativo y capacidad no excedida.

### Processing & Validations
1. Validar estado. 2. Calcular ocupación. 3. Comparar capacidad. 4. Emitir decisión.

### Persistence & Output
- **Output (Domain Model):** `WarehouseCapacityDecision`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `WarehouseCapacityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `WAREHOUSE_CAPACITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Create Inventory

### Description
Crea el inventario de un producto en un almacén válido.

### Responsibility
Inicializar existencias con invariantes y origen identificado.

### Input
- **Primary Input (Domain Model):** `InventoryCreationContext` con `Product` y `Warehouse`.
- **Secondary Input (Value Objects):** `ProductStatus`, `WarehouseStatus`, `Quantity`.
- **Domain Constraints:** relaciones válidas, producto elegible y no duplicar inventario.

### Processing & Validations
1. Validar Product y Warehouse. 2. Comprobar duplicado. 3. Inicializar cantidades. 4. Registrar origen.

### Persistence & Output
- **Output (Domain Model):** `InventoryCreationResult`.
- **Persisted Aggregates:** `Inventory`, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryCreatedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_CREATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 6. Register Stock Entry

### Description
Registra unidades recibidas físicamente en un almacén.

### Responsibility
Aumentar stock con evidencia de recepción y sin romper capacidad.

### Input
- **Primary Input (Domain Model):** `StockEntryContext` con `Inventory`, Warehouse y recepción.
- **Secondary Input (Value Objects):** `InventoryMovementType.ENTRY`, `Quantity`, `WarehouseStatus`.
- **Domain Constraints:** almacén operativo, cantidad positiva y capacidad disponible.

### Processing & Validations
1. Validar recepción. 2. Comprobar capacidad. 3. Aumentar disponible y total. 4. Aplicar movimiento.

### Persistence & Output
- **Output (Domain Model):** `StockEntryResult`.
- **Persisted Aggregates:** `Inventory`, `Operation`, `AuditLog`.
- **Generated Events:** `StockEntryRegisteredEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_ENTRY`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 7. Register Stock Movement

### Description
Registra un movimiento de entrada, reserva, deducción, ajuste, liberación o devolución.

### Responsibility
Centralizar la aplicación transaccional y trazable de movimientos.

### Input
- **Primary Input (Domain Model):** `StockMovementContext` con `Inventory`, movimiento y actor.
- **Secondary Input (Value Objects):** `InventoryMovementType`, `Quantity`.
- **Domain Constraints:** tipo permitido, cantidad positiva y precondiciones satisfechas.

### Processing & Validations
1. Validar tipo. 2. Comprobar invariantes. 3. Aplicar delta. 4. Auditar movimiento.

### Persistence & Output
- **Output (Domain Model):** `StockMovementResult`.
- **Persisted Aggregates:** `Inventory`, `InventoryMovement`, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryMovementAppliedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_MOVEMENT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 8. Reserve Inventory

### Description
Compromete unidades disponibles con una orden abierta para evitar overselling.

### Responsibility
Mover unidades de available a reserved de forma atómica.

### Input
- **Primary Input (Domain Model):** `ReserveInventoryContext` con `Inventory`, `Warehouse`, `Product` y `Order`.
- **Secondary Input (Value Objects):** `Quantity`, `WarehouseStatus`, `InventoryMovementType`.
- **Domain Constraints:** orden válida, almacén operativo y stock suficiente.

### Processing & Validations
1. Validar Order y línea. 2. Comprobar disponibilidad. 3. Mover cantidades. 4. Registrar reserva idempotente.

### Persistence & Output
- **Output (Domain Model):** `InventoryReservationResult`.
- **Persisted Aggregates:** `Inventory`, `InventoryReservation`, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryReservedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_RESERVATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 9. Release Inventory Reservation

### Description
Libera unidades reservadas cuando la orden se cancela o deja de ser válida.

### Responsibility
Devolver reserved a available sin liberar una reserva ajena o ya deducida.

### Input
- **Primary Input (Domain Model):** `ReleaseReservationContext` con `Inventory`, reserva y `Order`.
- **Secondary Input (Value Objects):** `Quantity`, `InventoryMovementType.RELEASE`.
- **Domain Constraints:** reserva existente, orden elegible y cantidad no liberada previamente.

### Processing & Validations
1. Verificar reserva. 2. Comprobar propietario. 3. Aplicar release. 4. Auditar idempotencia.

### Persistence & Output
- **Output (Domain Model):** `ReservationReleaseResult`.
- **Persisted Aggregates:** `Inventory`, reserva, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryReservationReleasedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_RESERVATION_RELEASE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 10. Deduct Reserved Inventory

### Description
Deducir stock reservado después de preparación, despacho o cumplimiento confirmado.

### Responsibility
Reducir reserved y total solo con evidencia operativa válida.

### Input
- **Primary Input (Domain Model):** `InventoryDeductionContext` con `Inventory`, reserva, `Order` y `Shipment`.
- **Secondary Input (Value Objects):** `Quantity`, `InventoryMovementType.DEDUCTION`, `WarehouseStatus`.
- **Domain Constraints:** reserva vigente, orden confirmada y despacho autorizado.

### Processing & Validations
1. Validar Shipment. 2. Confirmar reserva. 3. Reducir reserved y total. 4. Aplicar movimiento.

### Persistence & Output
- **Output (Domain Model):** `InventoryDeductionResult`.
- **Persisted Aggregates:** `Inventory`, movimiento, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryDeductedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_DEDUCTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 11. Validate Inventory Availability

### Description
Determina si un producto y cantidad están disponibles en uno o varios almacenes.

### Responsibility
Entregar una decisión temporal sin reservar ni garantizar stock futuro.

### Input
- **Primary Input (Domain Model):** `InventoryAvailabilityContext` con `Product`, almacenes y cantidad.
- **Secondary Input (Value Objects):** `Quantity`, `ProductStatus`, `WarehouseStatus`.
- **Domain Constraints:** producto publicado, almacén operativo y datos recientes.

### Processing & Validations
1. Validar producto. 2. Consultar inventarios. 3. Excluir reservas. 4. Devolver asignación posible.

### Persistence & Output
- **Output (Domain Model):** `InventoryAvailabilityDecision`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `InventoryAvailabilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_AVAILABILITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 12. Allocate Inventory for Order

### Description
Selecciona almacenes y cantidades para cubrir una orden elegible.

### Responsibility
Proponer asignación distribuida sin sustituir la reserva transaccional.

### Input
- **Primary Input (Domain Model):** `OrderAllocationContext` con `Order`, líneas e inventarios.
- **Secondary Input (Value Objects):** `Quantity`, `WarehouseLocation`, `WarehouseStatus`.
- **Domain Constraints:** orden válida, producto disponible y almacenes operativos.

### Processing & Validations
1. Agrupar por producto. 2. Priorizar reglas logísticas. 3. Verificar cobertura. 4. Emitir plan.

### Persistence & Output
- **Output (Domain Model):** `InventoryAllocationPlan`.
- **Persisted Aggregates:** ninguno; plan puede versionarse.
- **Generated Events:** `InventoryAllocationProposedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_ALLOCATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 13. Rebalance Distributed Inventory

### Description
Propone mover stock entre almacenes para mejorar cobertura, capacidad o demanda.

### Responsibility
Optimizar distribución sin ejecutar transferencias implícitas.

### Input
- **Primary Input (Domain Model):** `InventoryRebalanceContext` con producto, almacenes y evidencia histórica.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `WarehouseStatus`, `Quantity`.
- **Domain Constraints:** almacenes compatibles, capacidad y movimientos autorizados.

### Processing & Validations
1. Analizar demanda y capacidad. 2. Calcular excedentes. 3. Proponer origen y destino. 4. Solicitar aprobación.

### Persistence & Output
- **Output (Domain Model):** `InventoryRebalancePlan`.
- **Persisted Aggregates:** plan y `Operation`; no cambia stock automáticamente.
- **Generated Events:** `InventoryRebalanceProposedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_REBALANCE_PROPOSAL`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 14. Execute Inventory Transfer

### Description
Ejecuta una transferencia aprobada entre dos almacenes.

### Responsibility
Mantener consistencia entre salida de origen, tránsito y entrada de destino.

### Input
- **Primary Input (Domain Model):** `InventoryTransferContext` con plan, inventarios y operador.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `Quantity`, `InventoryMovementType`.
- **Domain Constraints:** plan aprobado, capacidad destino y almacenes compatibles.

### Processing & Validations
1. Validar plan. 2. Reservar salida de origen. 3. Registrar tránsito. 4. Confirmar entrada destino.

### Persistence & Output
- **Output (Domain Model):** `InventoryTransferResult`.
- **Persisted Aggregates:** inventarios origen/destino, movimientos, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryTransferStartedEvent`, `InventoryTransferCompletedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_TRANSFER`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 15. Adjust Inventory

### Description
Corrige cantidades después de una discrepancia física, conteo o incidente autorizado.

### Responsibility
Aplicar ajustes explicables sin ocultar el valor anterior.

### Input
- **Primary Input (Domain Model):** `InventoryAdjustmentContext` con Inventory, conteo y evidencia.
- **Secondary Input (Value Objects):** `InventoryMovementType.ADJUSTMENT`, `Quantity`.
- **Domain Constraints:** motivo, evidencia, actor autorizado y conteo fechado.

### Processing & Validations
1. Comparar conteo. 2. Validar motivo. 3. Calcular delta. 4. Aplicar ajuste y auditoría.

### Persistence & Output
- **Output (Domain Model):** `InventoryAdjustmentResult`.
- **Persisted Aggregates:** `Inventory`, movimiento, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryAdjustedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_ADJUSTMENT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 16. Register Returned Stock

### Description
Reincorpora unidades devueltas cuando una devolución ha sido aprobada e inspeccionada.

### Responsibility
Evitar que productos no aptos vuelvan a estar disponibles.

### Input
- **Primary Input (Domain Model):** `ReturnedStockContext` con `Return`, Product e Inventory.
- **Secondary Input (Value Objects):** `InventoryMovementType.RETURN`, `Quantity`, `ProductStatus`.
- **Domain Constraints:** devolución aprobada, inspección positiva y almacén operativo.

### Processing & Validations
1. Validar Return. 2. Inspeccionar condición. 3. Clasificar destino. 4. Registrar entrada.

### Persistence & Output
- **Output (Domain Model):** `ReturnedStockResult`.
- **Persisted Aggregates:** `Inventory`, movimiento, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnedStockRegisteredEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_RETURN`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 17. Detect Inventory Discrepancy

### Description
Compara existencias registradas, conteos físicos y movimientos para detectar diferencias.

### Responsibility
Emitir alertas explicables sin ajustar automáticamente cantidades.

### Input
- **Primary Input (Domain Model):** `InventoryDiscrepancyContext` con Inventory y evidencia física.
- **Secondary Input (Value Objects):** `Quantity`, `InventoryMovementType`.
- **Domain Constraints:** fuentes fechadas, conteo identificado y tolerancia definida.

### Processing & Validations
1. Reconstruir movimientos. 2. Comparar conteo. 3. Clasificar diferencia. 4. Abrir investigación.

### Persistence & Output
- **Output (Domain Model):** `InventoryDiscrepancyReport`.
- **Persisted Aggregates:** reporte, `Operation`, `AuditLog`; no ajuste implícito.
- **Generated Events:** `InventoryDiscrepancyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_DISCREPANCY_DETECTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 18. Predict Inventory Availability

### Description
Proyecta disponibilidad futura usando movimientos históricos, reservas y demanda autorizada.

### Responsibility
Ofrecer una predicción con confianza y fecha, no una promesa de stock.

### Input
- **Primary Input (Domain Model):** `AvailabilityPredictionContext` con Product, Inventory y periodo.
- **Secondary Input (Value Objects):** `Quantity`, `WarehouseLocation`, `Currency` si se proyecta valor.
- **Domain Constraints:** datos suficientes, modelo versionado y límites de incertidumbre.

### Processing & Validations
1. Reunir historial. 2. Considerar reservas. 3. Calcular proyección. 4. Emitir intervalo de confianza.

### Persistence & Output
- **Output (Domain Model):** `InventoryAvailabilityPrediction`.
- **Persisted Aggregates:** predicción versionada y `Operation`; no cambia stock.
- **Generated Events:** `InventoryAvailabilityPredictedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_AVAILABILITY_PREDICTION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 19. Validate Dispatch Readiness

### Description
Comprueba que inventario, almacén, orden y reserva permiten preparar un despacho.

### Responsibility
Entregar una decisión previa a Logistics sin crear Shipment.

### Input
- **Primary Input (Domain Model):** `DispatchReadinessContext` con Order, Inventory y Warehouse.
- **Secondary Input (Value Objects):** `WarehouseStatus`, `Quantity`, `ProductStatus`.
- **Domain Constraints:** orden válida, stock reservado y almacén operativo.

### Processing & Validations
1. Validar orden. 2. Confirmar reservas. 3. Revisar almacén. 4. Devolver bloqueos.

### Persistence & Output
- **Output (Domain Model):** `DispatchReadinessDecision`.
- **Persisted Aggregates:** ninguno; decisión auditable.
- **Generated Events:** `DispatchReadinessEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `DISPATCH_READINESS_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 20. Forecast Warehouse Demand

### Description
Calcula demanda esperada por almacén, categoría y periodo para planificación.

### Responsibility
Apoyar capacidad y rebalanceo con datos históricos explicables.

### Input
- **Primary Input (Domain Model):** `WarehouseDemandContext` con Warehouse, productos y periodo.
- **Secondary Input (Value Objects):** `WarehouseLocation`, `Quantity`, `ProductCategory`.
- **Domain Constraints:** historial suficiente y fuentes autorizadas.

### Processing & Validations
1. Normalizar movimientos. 2. Identificar estacionalidad. 3. Proyectar demanda. 4. Devolver confianza.

### Persistence & Output
- **Output (Domain Model):** `WarehouseDemandForecast`.
- **Persisted Aggregates:** forecast versionado y `Operation`.
- **Generated Events:** `WarehouseDemandForecastedEvent`.

### Operation & Audit
- **Operation Type:** `WAREHOUSE_DEMAND_FORECAST`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 21. Reconcile Inventory Ledger

### Description
Reconstruye el libro de movimientos y verifica que saldos e historial coincidan.

### Responsibility
Detectar corrupción lógica antes de aplicar correcciones.

### Input
- **Primary Input (Domain Model):** `InventoryLedgerContext` con Inventory y rango.
- **Secondary Input (Value Objects):** `InventoryMovementType`, `Quantity`.
- **Domain Constraints:** movimientos append-only, rango explícito y fuentes completas.

### Processing & Validations
1. Leer movimientos. 2. Recalcular saldo. 3. Comparar agregado. 4. Crear informe.

### Persistence & Output
- **Output (Domain Model):** `InventoryLedgerReconciliation`.
- **Persisted Aggregates:** reporte, `Operation`, `AuditLog`.
- **Generated Events:** `InventoryLedgerReconciledEvent` o `InventoryLedgerMismatchEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_LEDGER_RECONCILIATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 22. Audit Inventory Operations

### Description
Construye una timeline de movimientos, reservas, transferencias, ajustes y discrepancias.

### Responsibility
Permitir reconstruir el estado de stock y las decisiones operativas.

### Input
- **Primary Input (Domain Model):** `InventoryAuditQuery` con producto, almacén y periodo.
- **Secondary Input (Value Objects):** `InventoryMovementType`, `WarehouseStatus`, `AuditSeverity`.
- **Domain Constraints:** fuentes append-only y actor autorizado.

### Processing & Validations
1. Autorizar consulta. 2. Leer operaciones. 3. Ordenar movimientos. 4. Identificar cambios críticos.

### Persistence & Output
- **Output (Domain Model):** `InventoryOperationTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `InventoryOperationsAuditedEvent`.

### Operation & Audit
- **Operation Type:** `INVENTORY_OPERATION_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### WarehouseRepositoryPort
```text
interface WarehouseRepositoryPort {
    Warehouse save(Warehouse warehouse)
    Optional<Warehouse> findByIdentifier(Warehouse warehouse)
    List<Warehouse> findBySeller(Seller seller)
    List<Warehouse> findByStatus(WarehouseStatus status)
}
```

#### InventoryRepositoryPort
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

#### InventoryMovementRepositoryPort
```text
interface InventoryMovementRepositoryPort {
    InventoryMovement append(InventoryMovement movement)
    List<InventoryMovement> findByInventory(Inventory inventory, MovementQuery query)
}
```

#### InventoryForecastRepositoryPort
```text
interface InventoryForecastRepositoryPort {
    InventoryForecast save(InventoryForecast forecast)
    List<InventoryForecast> findByProduct(Product product, ForecastPeriod period)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByInventory(Inventory inventory, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByInventory(Inventory inventory, AuditQuery query)
}
```

### External Service Contracts

#### ProductEligibilityPort
```text
interface ProductEligibilityPort {
    ProductEligibility evaluate(Product product)
}
```

#### OrderReservationPort
```text
interface OrderReservationPort {
    ReservationContext validate(Order order)
}
```

#### ShipmentDispatchPort
```text
interface ShipmentDispatchPort {
    DispatchEvidence retrieve(Order order, Warehouse warehouse)
}
```

#### DemandForecastPort
```text
interface DemandForecastPort {
    DemandForecast forecast(WarehouseDemandContext context)
}
```

#### WarehouseScannerPort
```text
interface WarehouseScannerPort {
    PhysicalCount retrieve(Inventory inventory, CountSession session)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(InventoryOperationContext context)
}
```

#### NotificationPort
```text
interface NotificationPort {
    NotificationReceipt notify(InventoryActor actor, DomainNotification notification)
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
interface RegisterWarehouseUseCase {
    WarehouseRegistrationResult execute(WarehouseRegistrationContext context)
}
interface RegisterStockMovementUseCase {
    StockMovementResult execute(StockMovementContext context)
}
interface ReserveInventoryUseCase {
    InventoryReservationResult execute(ReserveInventoryContext context)
}
interface ValidateInventoryAvailabilityUseCase {
    InventoryAvailabilityDecision execute(InventoryAvailabilityContext context)
}
interface RebalanceInventoryUseCase {
    InventoryRebalancePlan execute(InventoryRebalanceContext context)
}
interface PredictInventoryAvailabilityUseCase {
    InventoryAvailabilityPrediction execute(AvailabilityPredictionContext context)
}
interface AdjustInventoryUseCase {
    InventoryAdjustmentResult execute(InventoryAdjustmentContext context)
}
interface ValidateDispatchReadinessUseCase {
    DispatchReadinessDecision execute(DispatchReadinessContext context)
}
```

### Ejemplos de invocación

```text
const reservation = await reserveInventoryUseCase.execute({
    product: publishedProduct,
    warehouse: operationalWarehouse,
    order: pendingOrder,
    quantity: Quantity.of(2),
    reservationReference: orderReservation
})
```

```text
const plan = await rebalanceInventoryUseCase.execute({
    product: product,
    warehouses: warehouseNetwork,
    demandForecast: demandForecast,
    approval: rebalanceApproval
})
```

## 7. Data Flow Diagram

```text
[Input Adapter] -> [Inventory Use Case] -> [Inventory Domain Service]
                                           |-> Warehouse / Inventory Repositories
                                           |-> Product / Order / Shipment Ports
                                           |-> Scanner / Forecast / Authorization Ports
                                           |-> Operation + AuditLog Ports
                                           v
                                  [Movement / Decision / Event]
                                           v
                         Cart, Order, Shipment, Catalog, Administration
```

Inventory es la fuente de verdad de cantidades. Order autoriza la reserva, Shipment aporta evidencia de despacho y Logistics coordina transporte.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Warehouse.warehouseId` debe ser único y estable.
2. `WarehouseLocation` debe ser válido y completo.
3. `Warehouse.capacity` debe ser positiva.
4. `Inventory.inventoryId` debe ser único.
5. Cada Inventory debe referenciar un Product y Warehouse existentes.
6. `availableStock + reservedStock = totalStock` siempre.
7. Las cantidades no pueden ser negativas.
8. Cada reserva debe referenciar una Order válida.
9. `InventoryMovementType` solo usa valores del catálogo.
10. Un Warehouse debe tener un Seller responsable cuando corresponda.

### Transactional Constraints

11. Cada movimiento de Inventory debe aplicarse en una transacción.
12. Reserva, liberación y deducción deben ser atómicas.
13. La reserva debe comprobar stock disponible bajo concurrencia.
14. Reintentos deben ser idempotentes por referencia de movimiento.
15. Un timeout de Order o scanner no autoriza movimiento.
16. Eventos se publican después de confirmar Inventory.
17. Una deducción requiere reserva y evidencia de despacho válida.
18. Un ajuste requiere autorización y evidencia física.
19. Transferencias deben mantener consistencia entre origen y destino.
20. Cambios de Warehouse no pueden dejar reservas sin plan de tratamiento.

### Authorization & Access Constraints

21. Solo actores autorizados pueden ajustar stock.
22. El Seller puede operar sus almacenes, no los de otro Seller.
23. El supervisor puede consultar, pero no ejecutar movimientos críticos.
24. Un almacén en `MAINTENANCE` no recibe ni despacha stock.
25. Un almacén `CLOSED` no puede reservar existencias.
26. La reserva solo puede originarse en una orden elegible.
27. Rebalanceo automático requiere política y aprobación configuradas.
28. Los conteos físicos requieren operador y sesión identificables.
29. Las predicciones no pueden usarse como autorización de reserva.
30. Las vistas deben ocultar datos de otros Sellers no autorizados.

### Persistence & State Constraints

31. `AuditLog` es inmutable y append-only.
32. `Operation` conserva actor, tipo, entidad y tiempo.
33. Los movimientos aplicados no se actualizan ni eliminan.
34. Los saldos deben poder reconstruirse desde movimientos.
35. Una reserva liberada no puede liberarse de nuevo.
36. Una reserva deducida no puede volver a estar disponible.
37. `WarehouseStatus` y estados de movimientos son catálogos controlados.
38. Los timestamps proceden de `ClockPort`.
39. Los repositorios reciben modelos y value objects, no DTOs ni ORM.
40. Adaptadores no filtran SQL, locks o detalles de almacenamiento al dominio.

### Cross-Aggregate and Business Rules

41. Inventory no modifica directamente Order, Product, Shipment o Seller.
42. Catalog conserva la fuente de verdad de elegibilidad del producto.
43. Order conserva la fuente de verdad de la orden y su cancelación.
44. Shipment aporta evidencia para deducción, no modifica saldo directamente.
45. Una orden cancelada debe liberar sus reservas mediante un flujo explícito.
46. Una devolución solo reincorpora stock tras aprobación e inspección.
47. Un producto agotado puede comunicarse a Catalog sin cambiar Inventory fuera de un movimiento.
48. Rebalanceo genera un plan antes de ejecutar transferencias.

### Audit, Performance & Business Rules

49. Entradas, reservas, liberaciones, deducciones, ajustes, transferencias y discrepancias generan auditoría.
50. Auditoría no contiene credenciales, secretos ni datos innecesarios; las predicciones incluyen versión, periodo y confianza.
