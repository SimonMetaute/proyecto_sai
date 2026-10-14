# Post-Sale Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para devoluciones, reclamos, disputas, reembolsos y cierre postventa de NexusMarket.

### Introducción

`Return` es el agregado raíz del caso postventa. Se vincula a `Order` e `Invoice`, conserva razón, estado, fecha y monto aprobado. El ciclo es `REQUESTED -> IN_REVIEW -> APPROVED -> COMPLETED`, con transición alternativa a `REJECTED`. Los servicios validan ventana de devolución, evidencia, estado de la orden, condición del producto y realidad del pago original. La decisión de devolución pertenece a este subdominio; Payment ejecuta el reembolso, Inventory decide la reincorporación del stock y Order mantiene la historia comercial. Se permiten automatizaciones para casos simples, pero las decisiones de fraude y disputa deben ser explicables y escalables a revisión humana. Todo cambio crítico genera `Operation` y `AuditLog`.

### Responsabilidades principales

- Recibir y validar solicitudes de devolución.
- Evaluar elegibilidad, evidencia y ventana temporal.
- Aprobar o rechazar devoluciones con razones.
- Resolver casos simples automáticamente bajo política.
- Detectar patrones de fraude en devoluciones.
- Mediar disputas entre Buyer, Seller y plataforma.
- Coordinar reembolso, retorno de stock y cierre.
- Medir satisfacción y auditar el ciclo postventa.

### Relación con Domain Model

Entidades: `Return`, `Order`, `OrderLine`, `Invoice`, `Payment`, `Buyer`, `Seller`, `DisputeResolution`, `Operation` y `AuditLog`. Value objects: `ReturnReason`, `ReturnStatus`, `Currency`, `ProductPrice`, `PaymentStatus`, `OrderStatus` y `Quantity`. `Return` es aggregate root; Payment, Order, Invoice e Inventory son agregados externos coordinados por puertos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
requestReturn(UUID orderId, String reason, Decimal amount)
```

Correcto:
```text
requestReturn(RequestReturnContext context)
// context.buyer, context.order, returnReason and evidence are domain concepts
```

### Principio 2: Validación de datos externos

Evidencia fotográfica, tracking, inspección, pago y políticas externas se validan por origen, integridad, fecha y correlación. La ausencia de evidencia no equivale a aprobación.

### Principio 3: Inmutabilidad de Value Objects

`ReturnReason`, `ReturnStatus`, `Currency`, `ProductPrice` y montos aprobados no se mutan. Una corrección genera decisión, versión o evento nuevo.

### Principio 4: Traceabilidad operacional

Solicitud, evaluación, aprobación, rechazo, disputa, fraude, refund y cierre generan `Operation` y `AuditLog` según impacto. Los detalles excluyen secretos y datos innecesarios.

### Principio 5: Transaccionalidad y consistencia

El caso `Return` conserva su transición de forma atómica. Payment, Inventory y Order se coordinan mediante eventos, idempotencia y compensaciones, sin modificar agregados directamente.

## 3. Domain Model Context

### Entidades principales involucradas

- `Return`: caso, razón, evidencia, estado y monto de refund.
- `Order` y `OrderLine`: compra, productos y elegibilidad.
- `Invoice` y `Payment`: soporte financiero del reembolso.
- `Buyer` y `Seller`: participantes y respuestas.
- `DisputeResolution`: decisión sobre un caso controvertido.
- `Operation` / `AuditLog`: trazabilidad.

### Value Objects utilizados

`ReturnReason` (`DAMAGE`, `SHIPPING_ERROR`, `DISAGREEMENT`, `OTHER`), `ReturnStatus`, `Currency`, `ProductPrice`, `PaymentStatus`, `OrderStatus` y `Quantity`.

### Aggregates y boundaries

```text
Buyer --> Return (root) --> Order / Invoice references
                             |-- ReturnReason
                             |-- ReturnStatus
                             +-- refundAmount
Return --requests--> Payment refund
Return --requests--> Inventory return inspection
Return --resolves--> DisputeResolution
```

Return decide elegibilidad y monto aprobado. Payment ejecuta refund, Inventory decide stock recuperable y Order conserva el estado comercial histórico.

### Ciclo de vida relevante

```text
REQUESTED --> IN_REVIEW --> APPROVED --> COMPLETED
    |                         |
    +------------------------> REJECTED
             rejected case --> DISPUTE_REVIEW --> RESOLVED
```

Una devolución aprobada usa el pago original, no puede superar el total de compra y requiere evidencia o validación de caso antes de aprobación automática.

## 4. Numbered Services

## 1. Request Return

### Description
Inicia un caso de devolución para una orden o línea elegible.

### Responsibility
Registrar razón, evidencia y relación con la transacción original.

### Input
- **Primary Input (Domain Model):** `RequestReturnContext` con Buyer, Order y líneas.
- **Secondary Input (Value Objects):** `ReturnReason`, `Currency`, `Quantity`.
- **Domain Constraints:** Order elegible, ventana vigente, razón y evidencia requeridas.

### Processing & Validations
1. Verificar Buyer. 2. Validar Order y plazo. 3. Detectar devolución duplicada. 4. Crear `REQUESTED`.

### Persistence & Output
- **Output (Domain Model):** `ReturnRequestResult`.
- **Persisted Aggregates:** `Return`, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnRequestedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_REQUEST`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 2. Validate Return Eligibility

### Description
Evalúa estado de Order, plazo, razón, línea, comprador y política de devolución.

### Responsibility
Determinar si el caso puede entrar a revisión formal.

### Input
- **Primary Input (Domain Model):** `ReturnEligibilityContext` con Return, Order y OrderLine.
- **Secondary Input (Value Objects):** `ReturnReason`, `OrderStatus`, `ReturnStatus`.
- **Domain Constraints:** línea pertenece a Order y no existe caso activo duplicado.

### Processing & Validations
1. Validar estado. 2. Comprobar ventana. 3. Evaluar razón. 4. Devolver requisitos.

### Persistence & Output
- **Output (Domain Model):** `ReturnEligibilityResult`.
- **Persisted Aggregates:** evidencia de evaluación, `Operation`.
- **Generated Events:** `ReturnEligibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_ELIGIBILITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 3. Review Return Evidence

### Description
Analiza fotos, documentos, tracking, condición y comunicación aportada al caso.

### Responsibility
Convertir evidencia postventa en hallazgos verificables.

### Input
- **Primary Input (Domain Model):** `ReturnEvidenceContext` con Return y evidencia.
- **Secondary Input (Value Objects):** `ReturnReason`, `ReturnStatus`.
- **Domain Constraints:** evidencia íntegra, fechada y vinculada al caso.

### Processing & Validations
1. Validar origen. 2. Comprobar integridad. 3. Comparar razón. 4. Clasificar suficiencia.

### Persistence & Output
- **Output (Domain Model):** `ReturnEvidenceReview`.
- **Persisted Aggregates:** caso de evidencia, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnEvidenceReviewedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_EVIDENCE_REVIEW`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 4. Evaluate Return

### Description
Pasa el caso a `IN_REVIEW` y consolida elegibilidad, evidencia y monto potencial.

### Responsibility
Abrir una revisión completa sin aprobar anticipadamente.

### Input
- **Primary Input (Domain Model):** `ReturnReviewContext` con Return, Order, Invoice y evidencia.
- **Secondary Input (Value Objects):** `ReturnStatus`, `Currency`, `ProductPrice`.
- **Domain Constraints:** caso `REQUESTED`, orden elegible y datos financieros coherentes.

### Processing & Validations
1. Cambiar a `IN_REVIEW`. 2. Revisar productos. 3. Calcular monto elegible. 4. Solicitar decisión.

### Persistence & Output
- **Output (Domain Model):** `ReturnEvaluationResult`.
- **Persisted Aggregates:** `Return`, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnReviewStartedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_EVALUATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Auto-Resolve Simple Return

### Description
Resuelve automáticamente una devolución simple cuando reglas y evidencia tienen alta confianza.

### Responsibility
Acelerar casos de bajo riesgo sin eliminar controles ni revisión excepcional.

### Input
- **Primary Input (Domain Model):** `SimpleReturnContext` con Return, Order y evaluación.
- **Secondary Input (Value Objects):** `ReturnReason`, `ReturnStatus`, `Currency`.
- **Domain Constraints:** política explícita, evidencia suficiente y riesgo bajo.

### Processing & Validations
1. Verificar reglas. 2. Confirmar monto. 3. Aprobar o escalar. 4. Auditar decisión automática.

### Persistence & Output
- **Output (Domain Model):** `AutomatedReturnDecision`.
- **Persisted Aggregates:** `Return`, `Operation`, `AuditLog` si aprueba.
- **Generated Events:** `ReturnAutoApprovedEvent` o `ReturnManualReviewRequestedEvent`.

### Operation & Audit
- **Operation Type:** `AUTOMATED_RETURN_RESOLUTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 6. Approve Return

### Description
Aprueba un caso revisado y define monto, condición y próximos pasos.

### Responsibility
Cambiar Return a `APPROVED` con decisión explicable.

### Input
- **Primary Input (Domain Model):** `ReturnApprovalContext` con Return, evidencia y decisor.
- **Secondary Input (Value Objects):** `ReturnStatus`, `Currency`, `ProductPrice`.
- **Domain Constraints:** evidencia suficiente, monto no mayor al total y autoridad válida.

### Processing & Validations
1. Confirmar `IN_REVIEW`. 2. Validar monto. 3. Aprobar. 4. Solicitar refund y logística.

### Persistence & Output
- **Output (Domain Model):** `ReturnApprovalResult`.
- **Persisted Aggregates:** `Return`, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnApprovedEvent`, `RefundProcessingRequestedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_APPROVAL`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 7. Reject Return

### Description
Rechaza la devolución cuando está fuera de política o carece de evidencia suficiente.

### Responsibility
Cerrar el caso con razón de rechazo y posibilidad de disputa.

### Input
- **Primary Input (Domain Model):** `ReturnRejectionContext` con Return, evidencia y motivo.
- **Secondary Input (Value Objects):** `ReturnStatus`, `ReturnReason`.
- **Domain Constraints:** motivo obligatorio y autoridad identificada.

### Processing & Validations
1. Confirmar revisión. 2. Codificar razón. 3. Cambiar a `REJECTED`. 4. Informar apelación.

### Persistence & Output
- **Output (Domain Model):** `ReturnRejectionResult`.
- **Persisted Aggregates:** `Return`, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnRejectedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_REJECTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 8. Calculate Refund Amount

### Description
Calcula el monto reembolsable según líneas, impuestos, envío y política aprobada.

### Responsibility
Evitar reembolsos superiores al pago original o incoherentes con la devolución.

### Input
- **Primary Input (Domain Model):** `RefundCalculationContext` con Return, Order, Invoice y Payment.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`, `Tax`, `RefundAmount`.
- **Domain Constraints:** moneda coincidente, monto pagado suficiente y deducciones justificadas.

### Processing & Validations
1. Validar transacción. 2. Seleccionar líneas. 3. Calcular impuestos y deducciones. 4. Sellar monto.

### Persistence & Output
- **Output (Domain Model):** `RefundAmountResult`.
- **Persisted Aggregates:** cálculo versionado, `Operation`.
- **Generated Events:** `RefundAmountCalculatedEvent`.

### Operation & Audit
- **Operation Type:** `REFUND_AMOUNT_CALCULATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 9. Request Refund Processing

### Description
Solicita a Billing la ejecución del reembolso aprobado.

### Responsibility
Coordinar refund sin modificar Payment internamente.

### Input
- **Primary Input (Domain Model):** `RefundProcessingContext` con Return, Payment e Invoice.
- **Secondary Input (Value Objects):** `RefundAmount`, `Currency`, `PaymentStatus`.
- **Domain Constraints:** Return `APPROVED`, pago original identificable y monto validado.

### Processing & Validations
1. Confirmar aprobación. 2. Comparar importe. 3. Emitir solicitud idempotente. 4. Esperar resultado.

### Persistence & Output
- **Output (Domain Model):** `RefundProcessingRequest`.
- **Persisted Aggregates:** caso y referencia de refund, `Operation`, `AuditLog`.
- **Generated Events:** `RefundProcessingRequestedEvent`.

### Operation & Audit
- **Operation Type:** `REFUND_PROCESSING`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 10. Confirm Refund Outcome

### Description
Integra el resultado de Billing y determina si el caso puede completarse.

### Responsibility
No cerrar Return antes de que Payment confirme el reembolso.

### Input
- **Primary Input (Domain Model):** `RefundOutcomeContext` con Return, Payment y resultado externo.
- **Secondary Input (Value Objects):** `PaymentStatus`, `Currency`, `RefundAmount`.
- **Domain Constraints:** transacción correlacionada y monto coincidente.

### Processing & Validations
1. Validar resultado. 2. Comparar importe. 3. Marcar refund. 4. Solicitar stock o cierre.

### Persistence & Output
- **Output (Domain Model):** `RefundOutcomeResult`.
- **Persisted Aggregates:** `Return`, referencias de Payment, `Operation`, `AuditLog`.
- **Generated Events:** `RefundConfirmedEvent` o `RefundDiscrepancyEvent`.

### Operation & Audit
- **Operation Type:** `REFUND_OUTCOME_CONFIRMATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 11. Coordinate Returned Stock

### Description
Solicita inspección y reincorporación de productos devueltos al inventario.

### Responsibility
Separar devolución financiera de clasificación física del producto.

### Input
- **Primary Input (Domain Model):** `ReturnedStockContext` con Return, OrderLine e Inventory.
- **Secondary Input (Value Objects):** `Quantity`, `Currency`, `ReturnStatus`.
- **Domain Constraints:** devolución aprobada, recepción e inspección registradas.

### Processing & Validations
1. Confirmar Return. 2. Solicitar inspección. 3. Clasificar aptitud. 4. Emitir movimiento.

### Persistence & Output
- **Output (Domain Model):** `ReturnedStockDecision`.
- **Persisted Aggregates:** Return y movimiento por Inventory Services, `Operation`.
- **Generated Events:** `ReturnedStockInspectionRequestedEvent`.

### Operation & Audit
- **Operation Type:** `RETURNED_STOCK_COORDINATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 12. Detect Return Fraud Pattern

### Description
Analiza frecuencia, motivos, montos, evidencias y resultados para detectar patrones sospechosos.

### Responsibility
Producir una señal explicable sin convertirla automáticamente en rechazo.

### Input
- **Primary Input (Domain Model):** `ReturnRiskContext` con Buyer, Return y comportamiento agregado.
- **Secondary Input (Value Objects):** `ReturnReason`, `Currency`, `BuyerTrustLevel`.
- **Domain Constraints:** datos autorizados, reglas versionadas y no discriminación.

### Processing & Validations
1. Reunir evidencia. 2. Aplicar reglas. 3. Calcular riesgo. 4. Escalar cuando corresponda.

### Persistence & Output
- **Output (Domain Model):** `ReturnFraudAssessment`.
- **Persisted Aggregates:** assessment, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnFraudSignalDetectedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_FRAUD_ANALYSIS`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 13. Open Dispute

### Description
Abre una disputa cuando Buyer o Seller desafían una decisión postventa.

### Responsibility
Separar apelación y mediación de la decisión original.

### Input
- **Primary Input (Domain Model):** `DisputeOpeningContext` con Return, actor y nueva evidencia.
- **Secondary Input (Value Objects):** `ReturnStatus`, `ReturnReason`, `Currency`.
- **Domain Constraints:** caso rechazado o controvertido; evidencia adicional identificada.

### Processing & Validations
1. Verificar derecho a disputar. 2. Registrar evidencia. 3. Crear caso. 4. Notificar partes.

### Persistence & Output
- **Output (Domain Model):** `DisputeOpeningResult`.
- **Persisted Aggregates:** `DisputeResolution`, `Operation`, `AuditLog`.
- **Generated Events:** `DisputeOpenedEvent`.

### Operation & Audit
- **Operation Type:** `DISPUTE_OPENING`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 14. Mediate Post-Sale Dispute

### Description
Aplica reglas de mediación para proponer una resolución entre Buyer, Seller y plataforma.

### Responsibility
Balancear evidencia y obligaciones sin decisión opaca.

### Input
- **Primary Input (Domain Model):** `DisputeMediationContext` con disputa y evidencia de partes.
- **Secondary Input (Value Objects):** `Currency`, `ReturnReason`, `ReturnStatus`.
- **Domain Constraints:** reglas vigentes, conflicto identificado y revisión humana cuando aplique.

### Processing & Validations
1. Comparar evidencias. 2. Aplicar política. 3. Proponer resolución. 4. Solicitar aceptación o escalamiento.

### Persistence & Output
- **Output (Domain Model):** `DisputeMediationResult`.
- **Persisted Aggregates:** `DisputeResolution`, `Operation`, `AuditLog`.
- **Generated Events:** `DisputeResolutionProposedEvent`.

### Operation & Audit
- **Operation Type:** `DISPUTE_RESOLUTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 15. Resolve Dispute

### Description
Aplica la decisión final de una disputa aprobada por autoridad competente.

### Responsibility
Convertir resolución en acciones postventa coordinadas.

### Input
- **Primary Input (Domain Model):** `DisputeResolutionContext` con disputa, Return y decisión.
- **Secondary Input (Value Objects):** `ReturnStatus`, `Currency`, `RefundAmount`.
- **Domain Constraints:** decisión final, autoridad y acciones explícitas.

### Processing & Validations
1. Validar decisión. 2. Actualizar caso. 3. Solicitar refund o rechazo. 4. Notificar partes.

### Persistence & Output
- **Output (Domain Model):** `DisputeResolutionResult`.
- **Persisted Aggregates:** `DisputeResolution`, `Return`, `Operation`, `AuditLog`.
- **Generated Events:** `DisputeResolvedEvent`.

### Operation & Audit
- **Operation Type:** `DISPUTE_RESOLUTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 16. Confirm Return Receipt

### Description
Confirma recepción física del producto devuelto con evidencia logística e inspección.

### Responsibility
Habilitar cierre o stock devuelto solo tras recepción verificable.

### Input
- **Primary Input (Domain Model):** `ReturnReceiptContext` con Return, Shipment y Warehouse evidence.
- **Secondary Input (Value Objects):** `ShipmentStatus`, `ReturnStatus`, `Quantity`.
- **Domain Constraints:** tracking entregado y cantidad recibida conciliada.

### Processing & Validations
1. Validar Shipment. 2. Comparar cantidades. 3. Registrar recepción. 4. Solicitar inspección.

### Persistence & Output
- **Output (Domain Model):** `ReturnReceiptResult`.
- **Persisted Aggregates:** Return y evidencia, `Operation`, `AuditLog`.
- **Generated Events:** `ReturnReceivedEvent`.

### Operation & Audit
- **Operation Type:** `RETURN_RECEIPT_CONFIRMATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 17. Measure Post-Sale Satisfaction

### Description
Registra satisfacción del Buyer después de resolver devolución o disputa.

### Responsibility
Medir resultado del servicio sin cambiar decisiones financieras cerradas.

### Input
- **Primary Input (Domain Model):** `PostSaleSatisfactionContext` con Return, Buyer y respuesta.
- **Secondary Input (Value Objects):** `ReturnStatus`, `Currency`.
- **Domain Constraints:** caso identificado, respuesta voluntaria y datos minimizados.

### Processing & Validations
1. Validar caso. 2. Registrar respuesta. 3. Clasificar señal. 4. Publicar métrica.

### Persistence & Output
- **Output (Domain Model):** `PostSaleSatisfactionResult`.
- **Persisted Aggregates:** métrica, `Operation`; no modifica Return cerrado.
- **Generated Events:** `PostSaleSatisfactionRecordedEvent`.

### Operation & Audit
- **Operation Type:** `POST_SALE_SATISFACTION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 18. Confirm Post-Sale Closure

### Description
Cierra Return cuando refund, recepción, stock y comunicación requeridos están completos.

### Responsibility
Finalizar el caso sin dejar obligaciones pendientes.

### Input
- **Primary Input (Domain Model):** `PostSaleClosureContext` con Return, refund y recepción.
- **Secondary Input (Value Objects):** `ReturnStatus`, `PaymentStatus`, `Currency`.
- **Domain Constraints:** Return aprobada o resolución final, refund confirmado cuando aplica.

### Processing & Validations
1. Verificar acciones. 2. Confirmar Payment. 3. Confirmar recepción/stock. 4. Cambiar a `COMPLETED`.

### Persistence & Output
- **Output (Domain Model):** `PostSaleClosureResult`.
- **Persisted Aggregates:** `Return`, `DisputeResolution`, `Operation`, `AuditLog`.
- **Generated Events:** `PostSaleCaseClosedEvent`.

### Operation & Audit
- **Operation Type:** `POST_SALE_CLOSURE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### ReturnRepositoryPort
```text
interface ReturnRepositoryPort {
    Return save(Return returnCase)
    Optional<Return> findByIdentifier(Return returnCase)
    List<Return> findByOrder(Order order)
    List<Return> findByStatus(ReturnStatus status)
}
```

#### DisputeRepositoryPort
```text
interface DisputeRepositoryPort {
    DisputeResolution save(DisputeResolution dispute)
    Optional<DisputeResolution> findOpenByReturn(Return returnCase)
}
```

#### OrderQueryPort
```text
interface OrderQueryPort {
    OrderReturnEligibility retrieve(Order order)
    OrderLineSnapshot retrieveLine(OrderLine line)
}
```

#### PaymentQueryPort
```text
interface PaymentQueryPort {
    PaymentOriginalTransaction retrieve(Return returnCase)
    PaymentRefundStatus retrieveRefund(Payment payment)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByReturn(Return returnCase, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByReturn(Return returnCase, AuditQuery query)
}
```

### External Service Contracts

#### PaymentRefundPort
```text
interface PaymentRefundPort {
    RefundResult refund(Payment payment, RefundAmount amount)
}
```

#### InventoryReturnPort
```text
interface InventoryReturnPort {
    ReturnInspectionResult inspect(Return returnCase)
    ReturnedStockResult register(Return returnCase, InspectionResult result)
}
```

#### LogisticsEvidencePort
```text
interface LogisticsEvidencePort {
    ReturnReceiptEvidence retrieve(Return returnCase)
}
```

#### ReturnPolicyPort
```text
interface ReturnPolicyPort {
    ReturnPolicy resolve(ReturnPolicyContext context)
    ReturnEligibilityResult evaluate(ReturnEligibilityContext context)
}
```

#### FraudAnalysisPort
```text
interface FraudAnalysisPort {
    ReturnFraudAssessment assess(ReturnRiskContext context)
}
```

#### NotificationPort
```text
interface NotificationPort {
    NotificationReceipt notify(PostSaleParticipant participant, DomainNotification notification)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(PostSaleOperationContext context)
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
interface RequestReturnUseCase {
    ReturnRequestResult execute(RequestReturnContext context)
}
interface EvaluateReturnUseCase {
    ReturnEvaluationResult execute(ReturnReviewContext context)
}
interface ApproveReturnUseCase {
    ReturnApprovalResult execute(ReturnApprovalContext context)
}
interface RejectReturnUseCase {
    ReturnRejectionResult execute(ReturnRejectionContext context)
}
interface ProcessRefundUseCase {
    RefundProcessingRequest execute(RefundProcessingContext context)
}
interface ResolveDisputeUseCase {
    DisputeResolutionResult execute(DisputeResolutionContext context)
}
interface ConfirmPostSaleClosureUseCase {
    PostSaleClosureResult execute(PostSaleClosureContext context)
}
```

### Ejemplos de invocación

```text
const evaluation = await evaluateReturnUseCase.execute({
    returnCase: requestedReturn,
    order: deliveredOrder,
    evidence: returnEvidence,
    policy: activeReturnPolicy
})
```

```text
const refund = await processRefundUseCase.execute({
    returnCase: approvedReturn,
    payment: originalPayment,
    invoice: originalInvoice,
    amount: approvedRefundAmount,
    currency: originalPayment.currency
})
```

## 7. Data Flow Diagram

```text
[Buyer / Seller]
       |
       v
[Post-Sale Use Case] -> [Return Domain Service]
       |                    |-> Return / Dispute Repositories
       |                    |-> Order / Payment Query Ports
       |                    |-> Policy / Fraud / Logistics Ports
       |                    |-> Refund / Inventory Return Ports
       |                    +-> Operation + AuditLog
       v
[Return Result / Domain Event]
       |
       +--> Billing: refund
       +--> Inventory: inspection and stock
       +--> Order: lifecycle update
       +--> Notification and Administration
```

Return decide el caso; Billing ejecuta el dinero, Inventory clasifica stock, Order conserva la compra y Logistics prueba recepción.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Return.returnId` debe ser único y estable.
2. Cada Return debe referenciar una Order válida.
3. Invoice y Payment deben corresponder a la misma transacción.
4. `ReturnReason` solo usa valores del catálogo.
5. `ReturnStatus` solo usa valores del catálogo.
6. Una devolución activa no puede duplicarse para la misma línea.
7. `refundAmount` no puede superar el valor elegible ni pagado.
8. La moneda del refund debe coincidir con la transacción original.
9. Toda solicitud debe conservar fecha, actor y evidencia requerida.
10. Las líneas devueltas deben pertenecer a la Order original.

### Transactional Constraints

11. Solicitud y operación inicial deben ser atómicas.
12. Evaluación solo puede iniciar desde `REQUESTED`.
13. Aprobación requiere evidencia o validación de caso.
14. Rechazo requiere una razón trazable.
15. Refund requiere Return aprobada y Payment original identificable.
16. Reintentos de refund deben ser idempotentes.
17. Un fallo de gateway no cierra Return.
18. Confirmar cierre requiere resultado financiero cuando aplique.
19. Recepción y stock devuelto se coordinan sin duplicar movimientos.
20. Eventos se publican después de confirmar el agregado local.

### Authorization & Access Constraints

21. Buyer puede solicitar su devolución, pero no autoaprobarla.
22. Seller puede aportar evidencia, pero no alterar la decisión final.
23. Supervisor consulta casos, pero no ejecuta refunds críticos sin autoridad.
24. Casos de alto riesgo requieren revisión autorizada.
25. Los datos de Payment nunca se exponen completos a Buyer o Seller.
26. La mediación debe separar funciones y conservar actor decisor.
27. La automatización solo aplica a reglas y umbrales publicados.
28. Las respuestas de fraude son señales, no rechazos automáticos fuera de política.
29. Evidencia privada solo se comparte con participantes autorizados.
30. Toda consulta de caso registra propósito y alcance.

### Persistence & State Constraints

31. Return respeta `REQUESTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED`.
32. No se permiten saltos de estado no definidos.
33. `AuditLog` es inmutable y append-only.
34. `Operation` conserva actor, tipo, entidad y tiempo.
35. Evidencia y decisiones históricas no se sobrescriben.
36. Un caso rechazado conserva la posibilidad de disputa según política.
37. Repositorios reciben modelos y value objects, no DTOs ni ORM.
38. Timestamps proceden de `ClockPort`.
39. Adaptadores no filtran gateway, SQL ni secretos al dominio.
40. Una Return completada no se reabre mediante actualización ordinaria.

### Cross-Aggregate Constraints

41. Post-Sale no modifica directamente Order, Payment, Invoice o Inventory.
42. Order conserva la fuente de verdad de la compra y su estado.
43. Payment/Billing conserva la fuente de verdad del refund.
44. Inventory conserva la fuente de verdad del stock recibido.
45. Logistics conserva la evidencia de entrega y recepción.
46. El refund siempre referencia la transacción original.
47. Un refund no implica automáticamente reincorporación de stock.
48. DisputeResolution coordina acciones mediante eventos y decisiones explícitas.

### Audit, Performance & Business Rules

49. Solicitud, aprobación, rechazo, disputa, refund, fraude y cierre generan auditoría crítica o alta.
50. Auditoría no contiene credenciales, números completos, imágenes innecesarias ni secretos; fraude y mediación incluyen versión de reglas y razones.
