# Billing Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para facturas, pagos, impuestos, comisiones, settlement y reembolsos de NexusMarket.

### Introducción

`Invoice` representa la obligación financiera de una `Order` confirmada y conserva número, importes, moneda y estado. `Payment` registra intentos, método, importe, moneda, estado y transacción externa. Billing Services coordina autorización, captura, facturación, comisiones, liquidaciones y reembolsos sin depender de un gateway o proveedor tributario concreto. La autorización debe coincidir exactamente con el total de la orden; el pago autorizado precede a la preparación del envío; y todo reembolso debe reflejar la transacción original. El cálculo de impuestos puede depender de la jurisdicción del comprador. Las cuentas de Seller se consultan para settlement y los cambios críticos generan `Operation` y `AuditLog`.

### Responsabilidades principales

- Generar y actualizar facturas válidas.
- Calcular impuestos por jurisdicción.
- Validar, autorizar y capturar pagos.
- Coordinar múltiples métodos de pago.
- Calcular comisiones y deducciones.
- Simular y ejecutar settlement de Seller.
- Autorizar, procesar y reconciliar reembolsos.
- Auditar todas las operaciones financieras.

### Relación con Domain Model

Entidades: `Invoice`, `Payment`, `Order`, `Buyer`, `Seller`, `CommercialAccount`, `Return`, `Operation` y `AuditLog`. Value objects: `Currency`, `ProductPrice`, `PaymentStatus`, `InvoiceStatus`, `PaymentMethod`, `PaymentMethodType`, `Tax` y `RefundAmount`. Aggregates principales: `Invoice` y `Payment`; Order, Return y CommercialAccount se coordinan por puertos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
authorizePayment(UUID orderId, Decimal amount, String currency)
```

Correcto:
```text
authorizePayment(AuthorizePaymentContext context)
// context.order, context.payment and context.money are domain concepts
```

### Principio 2: Validación de datos externos

Gateway, impuestos, bancos y métodos tokenizados producen resultados externos que se validan por importe, moneda, correlación, firma y estado antes de persistir.

### Principio 3: Inmutabilidad de Value Objects

`Currency`, `ProductPrice`, `Tax`, `PaymentStatus`, `InvoiceStatus` y montos reembolsados son valores controlados; una corrección genera nueva versión o evento.

### Principio 4: Traceabilidad operacional

Autorización, captura, factura, comisión, settlement y refund generan `Operation` y `AuditLog` crítico cuando afectan dinero o cumplimiento. Nunca se registran secretos.

### Principio 5: Transaccionalidad y consistencia

Payment e Invoice conservan invariantes dentro de sus agregados. Las llamadas al gateway usan idempotencia, reconciliación y compensación; no se mantienen transacciones abiertas durante llamadas externas.

## 3. Domain Model Context

### Entidades principales involucradas

- `Invoice`: factura de una Order confirmada.
- `Payment`: importe, método, moneda y resultado del gateway.
- `Order`: origen comercial y total confirmado.
- `CommercialAccount`: destino de comisiones y settlement.
- `Return`: causa y monto elegible para reembolso.
- `Operation` / `AuditLog`: evidencia financiera.

### Value Objects utilizados

`Currency` (`COP`, `USD`, `EUR`), `ProductPrice`, `Tax`, `PaymentStatus` (`PENDING`, `AUTHORIZED`, `REJECTED`, `FAILED`, `REFUNDED`), `InvoiceStatus` (`ISSUED`, `PAID`, `CANCELLED`) y `PaymentMethod`.

### Aggregates y boundaries

```text
Order (root) --> Invoice (root)
             --> Payment (root)
             --> Return
Seller ------> CommercialAccount
Payment --> PaymentGateway
Invoice --> Tax / Currency / ProductPrice
```

Billing decide estados financieros propios. Order confirma el total comercial, PaymentGateway ejecuta la transacción externa y Return decide elegibilidad de devolución.

### Ciclo de vida relevante

```text
Payment: PENDING --> AUTHORIZED --> REFUNDED
             |             |
             +--> REJECTED +--> FAILED
Invoice:        ISSUED --> PAID --> CANCELLED
Settlement:     PREVIEW --> ELIGIBLE --> PROCESSING --> SETTLED
```

Un pago autorizado no cambia importe ni moneda. Una factura corresponde exactamente a una orden confirmada.

## 4. Numbered Services

## 1. Generate Invoice

### Description
Crea una factura para una orden confirmada con importes, impuestos y moneda consistentes.

### Responsibility
Representar legal y financieramente una Order sin inventar condiciones.

### Input
- **Primary Input (Domain Model):** `InvoiceGenerationContext` con Order confirmada.
- **Secondary Input (Value Objects):** `ProductPrice`, `Tax`, `Currency`.
- **Domain Constraints:** Order confirmada y número de factura único.

### Processing & Validations
1. Validar Order. 2. Calcular base e impuestos. 3. Asignar número. 4. Crear `ISSUED`.

### Persistence & Output
- **Output (Domain Model):** `InvoiceGenerationResult`.
- **Persisted Aggregates:** `Invoice`, `Operation`, `AuditLog`.
- **Generated Events:** `InvoiceIssuedEvent`.

### Operation & Audit
- **Operation Type:** `INVOICE_ISSUANCE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 2. Calculate Jurisdiction Taxes

### Description
Calcula impuestos según comprador, destino, categoría y jurisdicción aplicable.

### Responsibility
Producir un desglose tributario reproducible y versionado.

### Input
- **Primary Input (Domain Model):** `TaxCalculationContext` con Order y Buyer.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `Tax`, `DeliveryAddress`.
- **Domain Constraints:** jurisdicción identificable y reglas vigentes.

### Processing & Validations
1. Determinar jurisdicción. 2. Resolver reglas. 3. Calcular impuesto. 4. Devolver evidencia.

### Persistence & Output
- **Output (Domain Model):** `TaxCalculationResult`.
- **Persisted Aggregates:** snapshot tributario y `Operation`.
- **Generated Events:** `OrderTaxesCalculatedEvent`.

### Operation & Audit
- **Operation Type:** `TAX_CALCULATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 3. Update Invoice

### Description
Corrige una factura mediante un cambio válido, fiscalmente permitido y trazable.

### Responsibility
Preservar la integridad y el historial de Invoice.

### Input
- **Primary Input (Domain Model):** `InvoiceCorrectionContext` con Invoice y evidencia.
- **Secondary Input (Value Objects):** `InvoiceStatus`, `Tax`, `Currency`.
- **Domain Constraints:** no reescribir factura pagada; causa y autoridad explícitas.

### Processing & Validations
1. Verificar estado. 2. Validar corrección. 3. Crear versión o nota. 4. Auditar.

### Persistence & Output
- **Output (Domain Model):** `InvoiceCorrectionResult`.
- **Persisted Aggregates:** `Invoice`, `Operation`, `AuditLog`.
- **Generated Events:** `InvoiceCorrectedEvent`.

### Operation & Audit
- **Operation Type:** `INVOICE_CORRECTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 4. Validate Payment

### Description
Comprueba método, importe, moneda, Order y elegibilidad antes de llamar al gateway.

### Responsibility
Rechazar pagos incompletos o incompatibles de forma explicable.

### Input
- **Primary Input (Domain Model):** `PaymentValidationContext` con Payment y Order.
- **Secondary Input (Value Objects):** `PaymentMethod`, `PaymentMethodType`, `Currency`, `ProductPrice`.
- **Domain Constraints:** método habilitado e importe exacto.

### Processing & Validations
1. Validar Order. 2. Comparar total. 3. Validar método y moneda. 4. Emitir decisión.

### Persistence & Output
- **Output (Domain Model):** `PaymentValidationResult`.
- **Persisted Aggregates:** Payment si se registra intento, `Operation`.
- **Generated Events:** `PaymentValidatedEvent`.

### Operation & Audit
- **Operation Type:** `PAYMENT_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Authorize Payment

### Description
Solicita autorización externa por el total exacto de una Order.

### Responsibility
Cambiar Payment a `AUTHORIZED` solo con respuesta correlacionada y válida.

### Input
- **Primary Input (Domain Model):** `PaymentAuthorizationContext` con Payment y Order.
- **Secondary Input (Value Objects):** `Currency`, `PaymentStatus`, `PaymentMethod`.
- **Domain Constraints:** método habilitado, importe exacto e idempotency key.

### Processing & Validations
1. Validar Payment. 2. Llamar gateway. 3. Verificar respuesta. 4. Persistir estado.

### Persistence & Output
- **Output (Domain Model):** `PaymentAuthorizationResult`.
- **Persisted Aggregates:** `Payment`, `Operation`, `AuditLog`.
- **Generated Events:** `PaymentAuthorizedEvent` o `PaymentRejectedEvent`.

### Operation & Audit
- **Operation Type:** `PAYMENT_AUTHORIZATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 6. Capture Payment

### Description
Captura un pago autorizado cuando la Order puede continuar a fulfillment.

### Responsibility
Evitar capturas duplicadas o sobre importes autorizados.

### Input
- **Primary Input (Domain Model):** `PaymentCaptureContext` con Payment autorizado y Order.
- **Secondary Input (Value Objects):** `PaymentStatus`, `Currency`, `ProductPrice`.
- **Domain Constraints:** autorización vigente y captura no ejecutada.

### Processing & Validations
1. Confirmar autorización. 2. Validar importe. 3. Capturar gateway. 4. Persistir resultado.

### Persistence & Output
- **Output (Domain Model):** `PaymentCaptureResult`.
- **Persisted Aggregates:** `Payment`, `Invoice`, `Operation`, `AuditLog`.
- **Generated Events:** `PaymentCapturedEvent`.

### Operation & Audit
- **Operation Type:** `PAYMENT_CAPTURE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 7. Manage Multiple Payment Methods

### Description
Distribuye un total entre varios métodos habilitados y conserva la suma de autorizaciones.

### Responsibility
Garantizar que la combinación cubra exactamente la Order sin duplicar cobros.

### Input
- **Primary Input (Domain Model):** `MultiPaymentContext` con Order y Payment[] .
- **Secondary Input (Value Objects):** `PaymentMethod`, `Currency`, `ProductPrice`.
- **Domain Constraints:** métodos habilitados, moneda compatible y suma exacta.

### Processing & Validations
1. Validar distribución. 2. Autorizar cada parte. 3. Compensar fallos. 4. Devolver resultado.

### Persistence & Output
- **Output (Domain Model):** `MultiPaymentResult`.
- **Persisted Aggregates:** Payments, `Operation`, `AuditLog`.
- **Generated Events:** `MultiplePaymentsAuthorizedEvent`.

### Operation & Audit
- **Operation Type:** `MULTIPLE_PAYMENT_AUTHORIZATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 8. Reject Payment

### Description
Registra rechazo de gateway o de regla de negocio sin permitir fulfillment.

### Responsibility
Mantener Payment en estado rechazado y comunicar la imposibilidad de continuar.

### Input
- **Primary Input (Domain Model):** `PaymentRejectionContext` con Payment y rechazo.
- **Secondary Input (Value Objects):** `PaymentStatus`, `OperationType`.
- **Domain Constraints:** rechazo correlacionado y causa codificada.

### Processing & Validations
1. Validar intento. 2. Clasificar causa. 3. Cambiar a `REJECTED` o `FAILED`. 4. Notificar.

### Persistence & Output
- **Output (Domain Model):** `PaymentRejectionResult`.
- **Persisted Aggregates:** `Payment`, `Operation`, `AuditLog`.
- **Generated Events:** `PaymentRejectedEvent`.

### Operation & Audit
- **Operation Type:** `PAYMENT_REJECTION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 9. Reconcile Payment

### Description
Compara Payment local con transacciones externas para detectar diferencias.

### Responsibility
Resolver estados inciertos sin inventar autorización o reembolso.

### Input
- **Primary Input (Domain Model):** `PaymentReconciliationContext` con Payment y evidencia externa.
- **Secondary Input (Value Objects):** `PaymentStatus`, `Currency`.
- **Domain Constraints:** transacción externa correlacionada y fuente fechada.

### Processing & Validations
1. Consultar gateway. 2. Comparar importe y moneda. 3. Clasificar diferencia. 4. Solicitar resolución.

### Persistence & Output
- **Output (Domain Model):** `PaymentReconciliationResult`.
- **Persisted Aggregates:** `Payment`, reporte, `Operation`, `AuditLog`.
- **Generated Events:** `PaymentReconciledEvent` o `PaymentDiscrepancyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `PAYMENT_RECONCILIATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 10. Calculate Marketplace Commission

### Description
Calcula la comisión de marketplace sobre ventas elegibles y condiciones versionadas.

### Responsibility
Separar bruto, comisión, deducciones y neto del Seller.

### Input
- **Primary Input (Domain Model):** `CommissionCalculationContext` con Order, Seller y periodo.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `Tax`.
- **Domain Constraints:** política vigente, ventas confirmadas y moneda definida.

### Processing & Validations
1. Resolver política. 2. Calcular base. 3. Aplicar tasa y excepciones. 4. Crear desglose.

### Persistence & Output
- **Output (Domain Model):** `CommissionCalculationResult`.
- **Persisted Aggregates:** cálculo versionado, `Operation`, `AuditLog`.
- **Generated Events:** `CommissionCalculatedEvent`.

### Operation & Audit
- **Operation Type:** `MARKETPLACE_COMMISSION_CALCULATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 11. Apply Seller Deductions

### Description
Aplica retenciones, ajustes, disputas y cargos permitidos al balance del Seller.

### Responsibility
Mantener deducciones justificadas y separadas de la venta bruta.

### Input
- **Primary Input (Domain Model):** `SellerDeductionsContext` con Seller, ventas y obligaciones.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`, `Tax`.
- **Domain Constraints:** deducción codificada, aprobada y no duplicada.

### Processing & Validations
1. Validar obligación. 2. Calcular importe. 3. Comparar balance. 4. Registrar deducción.

### Persistence & Output
- **Output (Domain Model):** `SellerDeductionsResult`.
- **Persisted Aggregates:** ledger de Seller, `Operation`, `AuditLog`.
- **Generated Events:** `SellerDeductionAppliedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_DEDUCTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 12. Preview Seller Settlement

### Description
Previsualiza bruto, comisión, deducciones, impuestos y neto antes de liquidar.

### Responsibility
Ofrecer un settlement explicable sin transferir fondos.

### Input
- **Primary Input (Domain Model):** `SettlementPreviewContext` con Seller y periodo.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`, `Tax`.
- **Domain Constraints:** reglas versionadas y ventas consolidadas.

### Processing & Validations
1. Reunir ventas. 2. Calcular comisión. 3. Aplicar deducciones. 4. Mostrar neto.

### Persistence & Output
- **Output (Domain Model):** `SellerSettlementPreview`.
- **Persisted Aggregates:** preview y `Operation`; no Payment.
- **Generated Events:** `SettlementPreviewGeneratedEvent`.

### Operation & Audit
- **Operation Type:** `SETTLEMENT_PREVIEW`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 13. Validate Seller Settlement

### Description
Determina si el Seller y su cuenta pueden recibir la liquidación.

### Responsibility
Bloquear settlement cuando falten verificación, cuenta o cumplimiento.

### Input
- **Primary Input (Domain Model):** `SettlementValidationContext` con Seller, cuenta y periodo.
- **Secondary Input (Value Objects):** `Currency`, `SellerVerificationStatus`.
- **Domain Constraints:** cuenta habilitada, titularidad y datos fiscales coherentes.

### Processing & Validations
1. Validar Seller. 2. Consultar cuenta. 3. Revisar retenciones. 4. Emitir decisión.

### Persistence & Output
- **Output (Domain Model):** `SettlementEligibilityResult`.
- **Persisted Aggregates:** decisión y `Operation`.
- **Generated Events:** `SettlementEligibilityValidatedEvent`.

### Operation & Audit
- **Operation Type:** `SETTLEMENT_ELIGIBILITY`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 14. Process Seller Settlement

### Description
Ejecuta una liquidación aprobada y registra el resultado financiero externo.

### Responsibility
Transferir únicamente el neto validado y evitar duplicados.

### Input
- **Primary Input (Domain Model):** `SellerSettlementContext` con Seller, cuenta y preview aprobado.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`.
- **Domain Constraints:** elegibilidad aprobada, balance estable y referencia idempotente.

### Processing & Validations
1. Confirmar preview. 2. Validar cuenta. 3. Ejecutar transferencia. 4. Persistir resultado.

### Persistence & Output
- **Output (Domain Model):** `SellerSettlementResult`.
- **Persisted Aggregates:** ledger y cuenta por Billing, `Operation`, `AuditLog`.
- **Generated Events:** `SellerSettlementProcessedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_SETTLEMENT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 15. Request Refund

### Description
Inicia un reembolso vinculado a Return, Order, Invoice y Payment originales.

### Responsibility
Asegurar que el reclamo tenga causa y monto elegible.

### Input
- **Primary Input (Domain Model):** `RefundRequestContext` con Return, Order, Invoice y Payment.
- **Secondary Input (Value Objects):** `Currency`, `RefundAmount`, `ReturnStatus`.
- **Domain Constraints:** Return elegible y monto no superior al pagado.

### Processing & Validations
1. Validar Return. 2. Comparar transacción. 3. Calcular monto. 4. Crear solicitud.

### Persistence & Output
- **Output (Domain Model):** `RefundRequestResult`.
- **Persisted Aggregates:** solicitud, `Operation`, `AuditLog`.
- **Generated Events:** `RefundRequestedEvent`.

### Operation & Audit
- **Operation Type:** `REFUND_REQUEST`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 16. Authorize Refund

### Description
Aprueba un refund después de revisar evidencia, política y transacción original.

### Responsibility
Separar decisión de reembolso de su ejecución externa.

### Input
- **Primary Input (Domain Model):** `RefundAuthorizationContext` con solicitud y evidencia.
- **Secondary Input (Value Objects):** `RefundAmount`, `Currency`, `ReturnStatus`.
- **Domain Constraints:** caso aprobado, importe calculado y autoridad suficiente.

### Processing & Validations
1. Revisar evidencia. 2. Validar monto. 3. Aprobar o rechazar. 4. Auditar.

### Persistence & Output
- **Output (Domain Model):** `RefundAuthorizationResult`.
- **Persisted Aggregates:** caso, `Operation`, `AuditLog`.
- **Generated Events:** `RefundAuthorizedEvent` o `RefundRejectedEvent`.

### Operation & Audit
- **Operation Type:** `REFUND_AUTHORIZATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 17. Execute Refund

### Description
Ejecuta en el gateway un refund autorizado por el monto permitido.

### Responsibility
Revertir la transacción original sin excederla ni duplicarla.

### Input
- **Primary Input (Domain Model):** `RefundExecutionContext` con Payment autorizado y refund.
- **Secondary Input (Value Objects):** `RefundAmount`, `Currency`, `PaymentStatus`.
- **Domain Constraints:** autorización vigente e idempotency key.

### Processing & Validations
1. Confirmar autorización. 2. Comparar monto original. 3. Llamar gateway. 4. Cambiar Payment a `REFUNDED`.

### Persistence & Output
- **Output (Domain Model):** `RefundExecutionResult`.
- **Persisted Aggregates:** `Payment`, Return/Order por sus servicios, `Operation`, `AuditLog`.
- **Generated Events:** `RefundExecutedEvent`.

### Operation & Audit
- **Operation Type:** `REFUND_EXECUTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 18. Reconcile Refund

### Description
Compara refund local y gateway para resolver pagos inciertos o parciales.

### Responsibility
Garantizar que el estado refleje el resultado externo verificable.

### Input
- **Primary Input (Domain Model):** `RefundReconciliationContext` con refund y Payment.
- **Secondary Input (Value Objects):** `RefundAmount`, `PaymentStatus`, `Currency`.
- **Domain Constraints:** transacción correlacionada y monto identificable.

### Processing & Validations
1. Consultar gateway. 2. Comparar monto. 3. Clasificar estado. 4. Abrir resolución si difiere.

### Persistence & Output
- **Output (Domain Model):** `RefundReconciliationResult`.
- **Persisted Aggregates:** Payment y reporte, `Operation`, `AuditLog`.
- **Generated Events:** `RefundReconciledEvent` o `RefundDiscrepancyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `REFUND_RECONCILIATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 19. Mark Invoice Paid

### Description
Marca una Invoice como `PAID` después de confirmarse la captura correspondiente.

### Responsibility
Evitar que una factura figure pagada sin Payment capturado.

### Input
- **Primary Input (Domain Model):** `InvoicePaymentContext` con Invoice y Payment.
- **Secondary Input (Value Objects):** `InvoiceStatus`, `PaymentStatus`, `Currency`.
- **Domain Constraints:** importes y moneda coincidentes.

### Processing & Validations
1. Confirmar captura. 2. Comparar total. 3. Cambiar a `PAID`. 4. Auditar.

### Persistence & Output
- **Output (Domain Model):** `InvoicePaidResult`.
- **Persisted Aggregates:** `Invoice`, `Operation`, `AuditLog`.
- **Generated Events:** `InvoicePaidEvent`.

### Operation & Audit
- **Operation Type:** `INVOICE_PAYMENT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 20. Cancel Invoice

### Description
Cancela una factura solo cuando una causa fiscal u operativa válida lo permite.

### Responsibility
Preservar la trazabilidad de la factura y su relación con Order.

### Input
- **Primary Input (Domain Model):** `InvoiceCancellationContext` con Invoice, Order y causa.
- **Secondary Input (Value Objects):** `InvoiceStatus`, `Currency`.
- **Domain Constraints:** autoridad, causa y no existencia de pago incompatible.

### Processing & Validations
1. Validar estado. 2. Revisar Payment. 3. Emitir cancelación fiscal. 4. Cambiar estado.

### Persistence & Output
- **Output (Domain Model):** `InvoiceCancellationResult`.
- **Persisted Aggregates:** `Invoice`, `Operation`, `AuditLog`.
- **Generated Events:** `InvoiceCancelledEvent`.

### Operation & Audit
- **Operation Type:** `INVOICE_CANCELLATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 21. Audit Financial Operations

### Description
Construye una timeline de facturas, pagos, comisiones, settlements y reembolsos.

### Responsibility
Reconstruir el ciclo financiero sin alterar estados históricos.

### Input
- **Primary Input (Domain Model):** `FinancialAuditQuery` con Order, Seller o periodo.
- **Secondary Input (Value Objects):** `Currency`, `PaymentStatus`, `InvoiceStatus`, `AuditSeverity`.
- **Domain Constraints:** fuentes append-only y actor autorizado.

### Processing & Validations
1. Autorizar consulta. 2. Leer operaciones. 3. Correlacionar transacciones. 4. Detectar anomalías.

### Persistence & Output
- **Output (Domain Model):** `FinancialOperationTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `FinancialOperationsAuditedEvent`.

### Operation & Audit
- **Operation Type:** `FINANCIAL_OPERATION_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### InvoiceRepositoryPort
```text
interface InvoiceRepositoryPort {
    Invoice save(Invoice invoice)
    Optional<Invoice> findByIdentifier(Invoice invoice)
    Optional<Invoice> findByOrder(Order order)
    Optional<Invoice> findByInvoiceNumber(InvoiceNumber number)
}
```

#### PaymentRepositoryPort
```text
interface PaymentRepositoryPort {
    Payment save(Payment payment)
    Optional<Payment> findByIdentifier(Payment payment)
    Optional<Payment> findByOrder(Order order)
    List<Payment> findByStatus(PaymentStatus status)
}
```

#### CommissionRepositoryPort
```text
interface CommissionRepositoryPort {
    Commission save(Commission commission)
    List<Commission> findBySeller(Seller seller, SettlementPeriod period)
}
```

#### SettlementRepositoryPort
```text
interface SettlementRepositoryPort {
    Settlement save(Settlement settlement)
    Optional<Settlement> findByReference(SettlementReference reference)
}
```

#### RefundRepositoryPort
```text
interface RefundRepositoryPort {
    Refund save(Refund refund)
    Optional<Refund> findByPayment(Payment payment)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByFinancialContext(FinancialContext context, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByFinancialContext(FinancialContext context, AuditQuery query)
}
```

### External Service Contracts

#### PaymentGatewayPort
```text
interface PaymentGatewayPort {
    PaymentAuthorization authorize(Payment payment)
    PaymentCapture capture(Payment payment)
    RefundResult refund(Payment payment, RefundAmount amount)
}
```

#### TaxCalculationPort
```text
interface TaxCalculationPort {
    TaxCalculationResult calculate(TaxCalculationContext context)
}
```

#### SellerAccountPort
```text
interface SellerAccountPort {
    SettlementAccountValidationResult validate(CommercialAccount account)
    SettlementTransferResult transfer(Settlement settlement)
}
```

#### CommissionPolicyPort
```text
interface CommissionPolicyPort {
    CommissionPolicy resolve(CommissionContext context)
}
```

#### PaymentMethodPort
```text
interface PaymentMethodPort {
    PaymentMethodValidationResult validate(PaymentMethod method)
}
```

#### OrderFinancialPort
```text
interface OrderFinancialPort {
    OrderFinancialSnapshot retrieve(Order order)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(FinancialOperationContext context)
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
interface GenerateInvoiceUseCase {
    InvoiceGenerationResult execute(InvoiceGenerationContext context)
}
interface AuthorizePaymentUseCase {
    PaymentAuthorizationResult execute(PaymentAuthorizationContext context)
}
interface CapturePaymentUseCase {
    PaymentCaptureResult execute(PaymentCaptureContext context)
}
interface PreviewSellerSettlementUseCase {
    SellerSettlementPreview execute(SettlementPreviewContext context)
}
interface ProcessSellerSettlementUseCase {
    SellerSettlementResult execute(SellerSettlementContext context)
}
interface AuthorizeRefundUseCase {
    RefundAuthorizationResult execute(RefundAuthorizationContext context)
}
interface ExecuteRefundUseCase {
    RefundExecutionResult execute(RefundExecutionContext context)
}
interface AuditFinancialOperationsUseCase {
    FinancialOperationTimeline execute(FinancialAuditQuery query)
}
```

### Ejemplos de invocación

```text
const authorization = await authorizePaymentUseCase.execute({
    order: confirmedOrder,
    payment: payment,
    exactAmount: confirmedOrder.total,
    currency: confirmedOrder.currency,
    idempotencyKey: paymentAttempt
})
```

```text
const settlement = await previewSellerSettlementUseCase.execute({
    seller: verifiedSeller,
    period: SettlementPeriod.closedMonth(),
    sales: confirmedSales,
    currency: Currency.COP,
    commissionPolicy: activePolicy
})
```

## 7. Data Flow Diagram

```text
[Order] -> [Billing Use Case] -> [Billing Domain Service]
                                  |-> Invoice / Payment Repositories
                                  |-> Tax / Gateway / Account Ports
                                  |-> Commission / Refund Policies
                                  |-> Operation + AuditLog Ports
                                  v
                         [Financial Result / Event]
                                  v
                     Order, Shipment, Seller, Return, Admin
```

Billing conserva estados financieros; el gateway ejecuta operaciones externas, Order conserva el total comercial y Return determina la causa de reembolso.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Invoice.invoiceId` debe ser único y estable.
2. El número de factura debe ser único.
3. Una Invoice debe corresponder a una Order confirmada.
4. `Payment.paymentId` debe ser único y estable.
5. Payment debe referenciar una Order válida.
6. Importe y moneda deben estar explícitos.
7. Payment autorizado debe coincidir exactamente con la Order.
8. `PaymentStatus` e `InvoiceStatus` solo usan catálogos controlados.
9. `Currency` debe ser soportada.
10. Un refund no puede exceder la transacción original.

### Transactional Constraints

11. Generar Invoice debe validar la Order antes de persistir.
12. Autorizar y capturar usan idempotencia.
13. Un timeout del gateway no equivale a rechazo definitivo ni autorización.
14. Una captura no puede superar el importe autorizado.
15. Los eventos se publican después de confirmar el agregado local.
16. Reintentos no duplican pagos, facturas, refunds ni settlements.
17. Settlement solo se ejecuta tras elegibilidad aprobada.
18. Una corrección fiscal crea versión o nota, no sobrescritura silenciosa.
19. Refund requiere autorización antes de ejecución.
20. Conciliación puede resolver estados, pero no inventar transacciones.

### Authorization & Access Constraints

21. Solo actores autorizados ejecutan refunds y settlements.
22. Seller no puede modificar el resultado de su propio settlement.
23. Supervisor consulta reportes, pero no mueve dinero.
24. Secretos de tarjeta, tokens y claves bancarias nunca cruzan el dominio.
25. Los métodos de pago deben estar habilitados.
26. Los datos financieros se exponen con mínimo privilegio.
27. Cambios de política de comisión requieren autoridad y versión.
28. La cancelación de Invoice requiere causa fiscal u operativa válida.
29. Las decisiones automatizadas de riesgo pueden requerir revisión humana.
30. Las consultas financieras registran actor y propósito.

### Persistence & State Constraints

31. Los precios e importes confirmados son inmutables.
32. Payment respeta `PENDING`, `AUTHORIZED`, `REJECTED`, `FAILED`, `REFUNDED`.
33. Invoice respeta `ISSUED`, `PAID`, `CANCELLED`.
34. `AuditLog` es inmutable y append-only.
35. `Operation` conserva actor, entidad, tipo y tiempo.
36. Pagos e invoices históricos no se eliminan.
37. Repositorios reciben modelos y value objects, no DTOs ni ORM.
38. Timestamps proceden de `ClockPort`.
39. Adaptadores no filtran HTTP, gateway, SQL ni secretos.
40. Settlement conserva desglose de bruto, comisión, deducciones y neto.

### Cross-Aggregate Constraints

41. Billing no modifica internamente Order, Seller, Return o CommercialAccount.
42. Order conserva la fuente de verdad del total comercial.
43. PaymentGateway conserva la ejecución externa, Billing la decisión de dominio.
44. Return conserva la elegibilidad de la devolución.
45. SellerAccount conserva la cuenta y transferencia del Seller.
46. Payment autorizado debe preceder a preparación de Shipment.
47. Invoice debe reflejar exactamente la Order confirmada.
48. El reembolso debe referenciar Payment e Invoice originales.

### Audit, Performance & Business Rules

49. Autorización, captura, refund, settlement, emisión y cancelación generan auditoría crítica.
50. Auditoría no contiene credenciales, números completos, claves bancarias ni secretos; cálculos incluyen versión, moneda y periodo.
