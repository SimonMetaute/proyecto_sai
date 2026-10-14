# Vendor Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios del subdominio de vendedores de NexusMarket: registro, verificación, perfil comercial, tiendas, cuentas de settlement y cumplimiento.

### Introducción

`Seller` representa la identidad comercial de un vendedor vinculado a `User` mediante `userId`. `Store` controla su presencia visible y `CommercialAccount` coordina comisiones y liquidaciones. Los servicios validan identidad, documentos, fiscalidad y autorización antes de habilitar publicaciones. OCR, registros comerciales, bancos y notificaciones se consumen mediante output ports. Las decisiones críticas se registran como `Operation` y `AuditLog`; los agregados externos como `Product`, `Inventory`, `Order` y `Payment` conservan sus propias invariantes.

### Responsabilidades principales

- Registrar y verificar vendedores.
- Validar identidad, documentos y fiscalidad.
- Aprobar, rechazar o restringir vendedores.
- Gestionar perfil y tienda comercial.
- Mantener elegibilidad de publicación.
- Configurar cuentas y settlement.
- Simular comisiones y liquidaciones.
- Auditar cumplimiento y operaciones.

### Relación con Domain Model

Entidades: `Seller`, `Store`, `CommercialAccount`, `User`, `Operation` y `AuditLog`. Value objects: `IdentityDocument`, `Currency`, `SellerVerificationStatus`, `StoreStatus`, `PersonType`, `UserRole` y `UserStatus`. Aggregates: `Seller` y `Store`; la cuenta comercial y los agregados de catálogo, inventario, órdenes y pagos se coordinan mediante puertos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
approveSeller(UUID sellerId, String status)
```

Correcto:
```text
approveSeller(ApproveSellerContext context)
// context.seller and context.verificationDecision are domain concepts
```

### Principio 2: Validación de datos externos

OCR, registros fiscales, identidad y bancos producen evidencia no confiable hasta validar proveedor, vigencia, coincidencia y política. Un timeout nunca equivale a aprobación.

### Principio 3: Inmutabilidad de Value Objects

`IdentityDocument`, `Currency`, estados y `PersonType` se crean mediante fábricas y no se mutan. Un cambio genera un nuevo valor y una transición explícita.

### Principio 4: Traceabilidad operacional

Registro, verificación, aprobación, rechazo, perfil, cuenta, suspensión y cumplimiento generan `Operation` y, si son críticos, `AuditLog`, sin secretos ni documentos completos.

### Principio 5: Transaccionalidad y consistencia

Los cambios propios se confirman con control de versión. Tienda, cuenta, productos e inventario se coordinan por eventos o servicios propios, sin mutaciones cruzadas.

## 3. Domain Model Context

### Entidades principales involucradas

- `Seller`: identidad, tipo de persona, verificación, reputación y referencias.
- `Store`: presencia visible, categoría y estado operativo.
- `CommercialAccount`: comisiones y settlement.
- `User`: identidad propietaria y autorización.
- `Operation` y `AuditLog`: trazabilidad.

### Value Objects utilizados

`IdentityDocument`, `Currency`, `SellerVerificationStatus` (`PENDING`, `VERIFIED`, `REJECTED`), `StoreStatus` (`ACTIVE`, `INACTIVE`, `SUSPENDED`) y `PersonType`.

### Aggregates y boundaries

```text
User (root) --userId--> Seller (root)
Seller --sellerId--> Store (root)
Seller --sellerId--> CommercialAccount (financial root)
Seller --eligibility--> Product / Inventory / Order contexts
```

`Seller` decide verificación; `Store` decide operación visible; Billing decide settlement; Catalog decide publicación.

### Ciclo de vida relevante

```text
Seller: PENDING --approve--> VERIFIED --restrict--> REJECTED
           |                       |
           +------reject-----------+--review--> PENDING
Store: INACTIVE --> ACTIVE --> SUSPENDED --> ACTIVE
Account: DRAFT --> VALIDATING --> ENABLED --> SUSPENDED
```

Solo un vendedor `VERIFIED` con tienda `ACTIVE` puede habilitar publicación.

## 4. Numbered Services

## 1. Register Vendor

### Description
Crea un `Seller` vinculado a un `User` y abre su caso de verificación.

### Responsibility
Garantizar identidad comercial única y estado inicial consistente.

### Input
- **Primary Input (Domain Model):** `VendorRegistrationContext` con `User` y `SellerDraft`.
- **Secondary Input (Value Objects):** `IdentityDocument`, `PersonType`, `Currency`.
- **Domain Constraints:** usuario autorizado, nombre único y documento no duplicado.

### Processing & Validations
1. Validar usuario y rol. 2. Validar identidad y tipo. 3. Comprobar duplicados. 4. Crear `Seller` en `PENDING`.

### Persistence & Output
- **Output (Domain Model):** `VendorRegistrationResult`.
- **Persisted Aggregates:** `Seller`, `Operation`, `AuditLog`.
- **Generated Events:** `VendorRegisteredEvent`, `VendorVerificationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `VENDOR_REGISTRATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 2. Validate Seller Identity

### Description
Compara `User`, `IdentityDocument` y `PersonType` mediante un proveedor de identidad.

### Responsibility
Convertir evidencia de identidad en una decisión verificable.

### Input
- **Primary Input (Domain Model):** `SellerIdentityContext` con `Seller` y `User`.
- **Secondary Input (Value Objects):** `IdentityDocument`, `PersonType`.
- **Domain Constraints:** documento vigente, único y verificable.

### Processing & Validations
1. Validar estructura. 2. Consultar `IdentityVerificationPort`. 3. Comparar titularidad. 4. Clasificar resultado.

### Persistence & Output
- **Output (Domain Model):** `SellerIdentityVerificationResult`.
- **Persisted Aggregates:** `Seller`, `Operation`, `AuditLog`.
- **Generated Events:** `SellerIdentityVerifiedEvent` o `SellerIdentityVerificationFailedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_IDENTITY_VERIFICATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 3. Validate Commercial Documents

### Description
Valida documentos fiscales y mercantiles según persona natural o jurídica.

### Responsibility
Garantizar evidencia comercial legible, vigente y coherente.

### Input
- **Primary Input (Domain Model):** `CommercialDocumentContext` con `Seller` y documentos.
- **Secondary Input (Value Objects):** `PersonType`, `IdentityDocument`.
- **Domain Constraints:** documentos completos, protegidos y rastreables.

### Processing & Validations
1. Resolver requisitos. 2. Validar formato y vigencia. 3. Consultar registro. 4. Marcar discrepancias.

### Persistence & Output
- **Output (Domain Model):** `CommercialDocumentValidationResult`.
- **Persisted Aggregates:** `Seller`, `Operation`, `AuditLog`.
- **Generated Events:** `CommercialDocumentsValidatedEvent` o `CommercialDocumentReviewRequestedEvent`.

### Operation & Audit
- **Operation Type:** `COMMERCIAL_DOCUMENT_VALIDATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 4. Extract Commercial Data

### Description
Extrae datos de documentos mediante OCR como apoyo, nunca como aprobación automática.

### Responsibility
Normalizar evidencia documental y señalar baja confianza.

### Input
- **Primary Input (Domain Model):** `DocumentExtractionContext` con `Seller` y documento protegido.
- **Secondary Input (Value Objects):** `PersonType`, `DocumentType`.
- **Domain Constraints:** proveedor autorizado y confianza mínima.

### Processing & Validations
1. Enviar al OCR. 2. Validar respuesta. 3. Marcar campos inciertos. 4. Guardar hash de evidencia.

### Persistence & Output
- **Output (Domain Model):** `CommercialDataExtractionResult`.
- **Persisted Aggregates:** caso de revisión, `Operation`, `AuditLog`.
- **Generated Events:** `CommercialDataExtractedEvent`, `ManualDocumentReviewRequestedEvent`.

### Operation & Audit
- **Operation Type:** `COMMERCIAL_DOCUMENT_OCR`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Approve Vendor

### Description
Aprueba un vendedor con identidad, documentos y cumplimiento satisfactorios.

### Responsibility
Cambiar el estado a `VERIFIED` con autoridad y evidencia.

### Input
- **Primary Input (Domain Model):** `ApproveSellerContext` con `Seller` y caso de verificación.
- **Secondary Input (Value Objects):** `SellerVerificationStatus`, `IdentityDocument`.
- **Domain Constraints:** caso completo y decisor autorizado.

### Processing & Validations
1. Confirmar `PENDING`. 2. Revisar evidencias. 3. Cambiar a `VERIFIED`. 4. Publicar elegibilidad.

### Persistence & Output
- **Output (Domain Model):** `VendorApprovalResult`.
- **Persisted Aggregates:** `Seller`, `Operation`, `AuditLog`.
- **Generated Events:** `VendorApprovedEvent`, `SellerCommercialEligibilityGrantedEvent`.

### Operation & Audit
- **Operation Type:** `VENDOR_APPROVAL`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 6. Reject Vendor

### Description
Rechaza la solicitud cuando la evidencia incumple las reglas y conserva razones para corrección.

### Responsibility
Cerrar la evaluación de forma explicable y auditable.

### Input
- **Primary Input (Domain Model):** `RejectSellerContext` con `Seller`, evaluación y razones.
- **Secondary Input (Value Objects):** `SellerVerificationStatus`, `OperationType`.
- **Domain Constraints:** motivo, evidencia y actor obligatorios.

### Processing & Validations
1. Confirmar caso pendiente. 2. Clasificar motivos. 3. Cambiar a `REJECTED`. 4. Notificar requisitos.

### Persistence & Output
- **Output (Domain Model):** `VendorRejectionResult`.
- **Persisted Aggregates:** `Seller`, `Operation`, `AuditLog`.
- **Generated Events:** `VendorRejectedEvent`.

### Operation & Audit
- **Operation Type:** `VENDOR_REJECTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 7. Revoke Vendor Access

### Description
Retira la elegibilidad comercial por incumplimiento, riesgo o decisión administrativa.

### Responsibility
Restringir nuevas operaciones sin borrar historia.

### Input
- **Primary Input (Domain Model):** `SellerAccessRestrictionContext` con `Seller` y evidencia.
- **Secondary Input (Value Objects):** `SellerVerificationStatus`, `StoreStatus`.
- **Domain Constraints:** causa, alcance y autoridad definidos.

### Processing & Validations
1. Validar evidencia. 2. Restringir capacidades. 3. Notificar a Catalog y Billing. 4. Registrar revisión.

### Persistence & Output
- **Output (Domain Model):** `SellerAccessRevocationResult`.
- **Persisted Aggregates:** `Seller`, `Store`, `Operation`, `AuditLog`.
- **Generated Events:** `VendorAccessRevokedEvent`, `StoreSuspensionRequestedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_ACCESS_REVOCATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 8. Manage Seller Profile

### Description
Actualiza información comercial permitida y solicita reverificación para cambios críticos.

### Responsibility
Preservar consistencia y versionado del perfil.

### Input
- **Primary Input (Domain Model):** `SellerProfileContext` con `Seller` y cambios.
- **Secondary Input (Value Objects):** `PersonType`, `Currency`, `IdentityDocument`.
- **Domain Constraints:** nombre único y campos sensibles controlados.

### Processing & Validations
1. Cargar versión. 2. Validar cambios. 3. Solicitar revisión si aplica. 4. Guardar nueva versión.

### Persistence & Output
- **Output (Domain Model):** `SellerProfileUpdateResult`.
- **Persisted Aggregates:** `Seller`, `Operation`, `AuditLog`.
- **Generated Events:** `SellerProfileUpdatedEvent`, `SellerReverificationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_PROFILE_UPDATE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 9. Manage Store

### Description
Crea o actualiza la tienda asociada al vendedor y su información visible.

### Responsibility
Mantener una tienda perteneciente a un único vendedor.

### Input
- **Primary Input (Domain Model):** `StoreManagementContext` con `Seller` y `Store`.
- **Secondary Input (Value Objects):** `StoreStatus`, `StoreCategory`.
- **Domain Constraints:** propietario único y vendedor autorizado.

### Processing & Validations
1. Verificar relación. 2. Validar nombre y categoría. 3. Aplicar transición explícita. 4. Guardar versión.

### Persistence & Output
- **Output (Domain Model):** `StoreManagementResult`.
- **Persisted Aggregates:** `Store`, `Operation`, `AuditLog`.
- **Generated Events:** `StoreCreatedEvent` o `StoreUpdatedEvent`.

### Operation & Audit
- **Operation Type:** `STORE_MANAGEMENT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 10. Change Store Status

### Description
Cambia la tienda entre `ACTIVE`, `INACTIVE` y `SUSPENDED`.

### Responsibility
Proteger el ciclo de vida operativo y comunicar efectos a Catalog.

### Input
- **Primary Input (Domain Model):** `StoreStatusContext` con `Store`, estado y motivo.
- **Secondary Input (Value Objects):** `StoreStatus`, `SellerVerificationStatus`.
- **Domain Constraints:** transición válida y motivo para suspensión.

### Processing & Validations
1. Validar autoridad. 2. Comprobar transición. 3. Guardar estado. 4. Emitir bloqueo o habilitación.

### Persistence & Output
- **Output (Domain Model):** `StoreStatusChangeResult`.
- **Persisted Aggregates:** `Store`, `Operation`, `AuditLog`.
- **Generated Events:** `StoreSuspendedEvent` o `StoreActivatedEvent`.

### Operation & Audit
- **Operation Type:** `STORE_STATUS_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 11. Version Seller Profile

### Description
Conserva versiones inmutables del perfil para comparación y rollback controlado.

### Responsibility
Hacer reconstruible la evolución del vendedor.

### Input
- **Primary Input (Domain Model):** `SellerProfileVersionContext` con `Seller` y versión.
- **Secondary Input (Value Objects):** `IdentityDocument`, `PersonType`, `Currency`.
- **Domain Constraints:** autor, versión secuencial y rollback autorizado.

### Processing & Validations
1. Comparar versiones. 2. Validar campos. 3. Crear snapshot. 4. Activar solo con autorización.

### Persistence & Output
- **Output (Domain Model):** `SellerProfileVersionResult`.
- **Persisted Aggregates:** historial, `Operation`, `AuditLog`.
- **Generated Events:** `SellerProfileVersionedEvent`, `SellerProfileRollbackRequestedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_PROFILE_VERSIONING`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 12. Register Commercial Account

### Description
Solicita una cuenta para comisiones y settlement vinculada al vendedor.

### Responsibility
Asegurar identidad, fiscalidad y moneda consistentes.

### Input
- **Primary Input (Domain Model):** `CommercialAccountContext` con `Seller` y cuenta.
- **Secondary Input (Value Objects):** `Currency`, `PersonType`, `IdentityDocument`.
- **Domain Constraints:** datos fiscales completos y moneda soportada.

### Processing & Validations
1. Confirmar vendedor. 2. Validar titularidad. 3. Crear solicitud pendiente. 4. Enviar al proveedor.

### Persistence & Output
- **Output (Domain Model):** `CommercialAccountRegistrationResult`.
- **Persisted Aggregates:** `CommercialAccount`, `Operation`, `AuditLog`.
- **Generated Events:** `CommercialAccountRegistrationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `COMMERCIAL_ACCOUNT_REGISTRATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 13. Validate Settlement Eligibility

### Description
Comprueba si una cuenta y vendedor pueden recibir una liquidación.

### Responsibility
Evitar transferencias a cuentas inválidas o no verificadas.

### Input
- **Primary Input (Domain Model):** `SettlementEligibilityContext` con `Seller`, cuenta y periodo.
- **Secondary Input (Value Objects):** `Currency`, `SellerVerificationStatus`.
- **Domain Constraints:** vendedor verificado, cuenta habilitada y fiscalidad consistente.

### Processing & Validations
1. Consultar cuenta. 2. Comparar titularidad. 3. Validar moneda y riesgos. 4. Devolver bloqueos.

### Persistence & Output
- **Output (Domain Model):** `SettlementEligibilityDecision`.
- **Persisted Aggregates:** ninguno; auditoría de decisión.
- **Generated Events:** `SettlementEligibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `SETTLEMENT_ELIGIBILITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 14. Simulate Seller Settlement

### Description
Calcula una previsualización de ventas, comisiones, deducciones, impuestos y neto.

### Responsibility
Ofrecer un cálculo reproducible sin mover fondos.

### Input
- **Primary Input (Domain Model):** `SettlementSimulationContext` con `Seller`, periodo y ventas.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`, `Tax`.
- **Domain Constraints:** reglas de comisión versionadas y moneda explícita.

### Processing & Validations
1. Validar periodo. 2. Aplicar política. 3. Calcular bruto y neto. 4. Explicar diferencias.

### Persistence & Output
- **Output (Domain Model):** `SettlementSimulation`.
- **Persisted Aggregates:** snapshot opcional y `Operation`; nunca transferencia.
- **Generated Events:** `SettlementSimulationGeneratedEvent`.

### Operation & Audit
- **Operation Type:** `SETTLEMENT_SIMULATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 15. Reconcile Seller Financial Data

### Description
Compara ventas, comisiones, cuenta y liquidaciones para detectar discrepancias.

### Responsibility
Identificar diferencias sin reescribir movimientos históricos.

### Input
- **Primary Input (Domain Model):** `FinancialReconciliationContext` con `Seller` y periodo.
- **Secondary Input (Value Objects):** `Currency`, `ProductPrice`, `Tax`.
- **Domain Constraints:** fuentes versionadas y movimientos cerrados inmutables.

### Processing & Validations
1. Obtener evidencia. 2. Normalizar moneda. 3. Comparar totales. 4. Solicitar investigación.

### Persistence & Output
- **Output (Domain Model):** `FinancialReconciliationReport`.
- **Persisted Aggregates:** reporte, `Operation`, `AuditLog`.
- **Generated Events:** `SellerFinancialDiscrepancyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_FINANCIAL_RECONCILIATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 16. Review Seller Compliance

### Description
Evalúa periódicamente identidad, documentos, tienda, cuenta y actividad del vendedor.

### Responsibility
Mantener elegibilidad comercial alineada con políticas vigentes.

### Input
- **Primary Input (Domain Model):** `SellerComplianceContext` con `Seller` y evidencia.
- **Secondary Input (Value Objects):** `SellerVerificationStatus`, `StoreStatus`, `PersonType`.
- **Domain Constraints:** reglas versionadas y revisión proporcional.

### Processing & Validations
1. Revisar vigencia. 2. Comparar perfil y cuenta. 3. Clasificar riesgos. 4. Crear remediación.

### Persistence & Output
- **Output (Domain Model):** `SellerComplianceReview`.
- **Persisted Aggregates:** reporte, `Operation`, `AuditLog`.
- **Generated Events:** `SellerComplianceReviewedEvent`, `SellerReverificationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_COMPLIANCE_REVIEW`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 17. Validate Product Publication Eligibility

### Description
Determina si el vendedor y tienda cumplen condiciones para publicar productos.

### Responsibility
Proporcionar una decisión a Catalog sin publicar el producto.

### Input
- **Primary Input (Domain Model):** `PublicationEligibilityContext` con `Seller`, `Store` y `ProductDraft`.
- **Secondary Input (Value Objects):** `SellerVerificationStatus`, `StoreStatus`, `ProductStatus`.
- **Domain Constraints:** vendedor `VERIFIED`, tienda `ACTIVE` y políticas cumplidas.

### Processing & Validations
1. Validar estados. 2. Consultar políticas. 3. Confirmar propiedad. 4. Devolver razones.

### Persistence & Output
- **Output (Domain Model):** `ProductPublicationEligibility`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `SellerPublicationEligibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_PUBLICATION_ELIGIBILITY`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 18. Audit Seller Operations

### Description
Construye una timeline de verificaciones, cambios, restricciones, cuentas y decisiones.

### Responsibility
Reconstruir la historia del vendedor para cumplimiento y soporte.

### Input
- **Primary Input (Domain Model):** `SellerAuditQuery` con `Seller`, actor y periodo.
- **Secondary Input (Value Objects):** `OperationType`, `AuditSeverity`, `Currency`.
- **Domain Constraints:** fuentes append-only y sin secretos.

### Processing & Validations
1. Autorizar consulta. 2. Leer operaciones. 3. Ordenar eventos. 4. Identificar cambios críticos.

### Persistence & Output
- **Output (Domain Model):** `SellerOperationTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `SellerOperationsAuditedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_OPERATION_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### SellerRepositoryPort
```text
interface SellerRepositoryPort {
    Seller save(Seller seller)
    Optional<Seller> findByIdentifier(Seller seller)
    Optional<Seller> findByUser(User user)
    Optional<Seller> findByCommercialName(CommercialName name)
    List<Seller> findByVerificationStatus(SellerVerificationStatus status)
}
```

#### StoreRepositoryPort
```text
interface StoreRepositoryPort {
    Store save(Store store)
    Optional<Store> findBySeller(Seller seller)
    boolean existsByCommercialName(CommercialName name)
}
```

#### CommercialAccountRepositoryPort
```text
interface CommercialAccountRepositoryPort {
    CommercialAccount save(CommercialAccount account)
    Optional<CommercialAccount> findBySeller(Seller seller)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findBySeller(Seller seller, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findBySeller(Seller seller, AuditQuery query)
}
```

### External Service Contracts

#### IdentityVerificationPort
```text
interface IdentityVerificationPort {
    IdentityVerificationResult verify(SellerIdentityContext context)
}
```

#### DocumentRecognitionPort
```text
interface DocumentRecognitionPort {
    CommercialDocumentExtraction extract(CommercialDocumentSet documents)
}
```

#### ComplianceVerificationPort
```text
interface ComplianceVerificationPort {
    ComplianceEvidence verify(SellerComplianceContext context)
}
```

#### SettlementAccountPort
```text
interface SettlementAccountPort {
    SettlementAccountValidationResult validate(CommercialAccount account)
}
```

#### FinancialEvidencePort
```text
interface FinancialEvidencePort {
    SellerFinancialEvidence collect(Seller seller, SettlementPeriod period)
}
```

#### NotificationPort
```text
interface NotificationPort {
    NotificationReceipt notify(Seller seller, DomainNotification notification)
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
interface RegisterVendorUseCase {
    VendorRegistrationResult execute(VendorRegistrationContext context)
}
interface ApproveVendorUseCase {
    VendorApprovalResult execute(ApproveSellerContext context)
}
interface ManageSellerProfileUseCase {
    SellerProfileUpdateResult execute(SellerProfileContext context)
}
interface SimulateSellerSettlementUseCase {
    SettlementSimulation execute(SettlementSimulationContext context)
}
interface ReviewSellerComplianceUseCase {
    SellerComplianceReview execute(SellerComplianceContext context)
}
interface ValidatePublicationEligibilityUseCase {
    ProductPublicationEligibility execute(PublicationEligibilityContext context)
}
```

### Ejemplos de invocación

```text
const approval = await approveVendorUseCase.execute({
    seller: seller,
    identityEvidence: verifiedIdentityEvidence,
    commercialEvidence: validatedCommercialDocuments,
    decision: ApprovalDecision.approve(),
    actor: complianceAdministrator
})
```

```text
const simulation = await simulateSellerSettlementUseCase.execute({
    seller: seller,
    period: SettlementPeriod.month(currentMonth),
    sales: confirmedSellerSales,
    commissionPolicy: activeCommissionPolicy,
    currency: Currency.COP
})
```

## 7. Data Flow Diagram

```text
[Input Adapter] -> [Vendor Use Case] -> [Seller Domain Service]
                                      |-> Seller / Store / Account Ports
                                      |-> Identity / OCR / Compliance Ports
                                      |-> Settlement / Financial Ports
                                      |-> OperationRepositoryPort
                                      |-> AuditLogRepositoryPort
                                      v
                             [Domain Result / Event]
                                      v
                    Catalog, Inventory, Order, Billing, Administration
```

Las respuestas externas se traducen a modelos de dominio antes de decidir. Catalog publica, Billing liquida y Administration supervisa.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Seller.sellerId` debe ser único y estable.
2. `Seller.userId` debe referenciar un `User` existente.
3. El nombre comercial debe ser único en marketplace.
4. Un `IdentityDocument` no puede pertenecer a dos vendedores activos.
5. El estado de verificación solo usa valores del catálogo.
6. `PersonType` debe coincidir con la evidencia.
7. Una tienda activa pertenece a un único vendedor.
8. Una cuenta comercial pertenece a un único vendedor.
9. `Currency` debe ser una moneda soportada.
10. Documentos y cuentas conservan vigencia y referencia de validación.

### Transactional Constraints

11. Registro y solicitud de verificación deben ser atómicos.
12. Aprobar requiere identidad y documentos aprobados.
13. Cambios críticos de perfil usan control de versión.
14. Suspensión de tienda y efectos de publicación se coordinan por evento.
15. Proveedores externos tienen timeout y resultado explícito.
16. Un timeout nunca equivale a aprobación.
17. Eventos se publican después de confirmar el agregado.
18. Repetir una operación no duplica tiendas, cuentas ni casos.
19. Simular settlement no crea pagos ni transfiere fondos.
20. Conciliar no reescribe movimientos cerrados.

### Authorization & Access Constraints

21. Solo cumplimiento autorizado aprueba o rechaza.
22. El vendedor no puede autoaprobarse.
23. El supervisor no ejecuta cambios críticos.
24. El vendedor no puede asignarse privilegios administrativos.
25. Datos bancarios completos requieren autorización financiera.
26. Publicación requiere `VERIFIED` y tienda `ACTIVE`.
27. Suspensión restringe capacidades sin borrar historia.
28. Riesgo automatizado permite revisión humana cuando aplique.
29. Documentos requieren propósito y autorización.
30. Vistas externas omiten secretos y documentos completos.

### Persistence & State Constraints

31. `AuditLog` es inmutable y append-only.
32. `Operation` conserva actor, tipo, entidad y tiempo.
33. Verificación respeta `PENDING`, `VERIFIED` y `REJECTED`.
34. Cuenta suspendida no recibe settlement nuevo.
35. Tienda suspendida no publica productos nuevos.
36. Versiones de perfil son inmutables.
37. Puertos usan modelos y value objects, no DTOs ni ORM.
38. Timestamps proceden de `ClockPort`.
39. Adaptadores no filtran SQL, HTTP ni credenciales.
40. Documentos históricos no se borran al cambiar estado.

### Cross-Aggregate and Business Rules

41. Vendor Services no modifica `User`, `Product`, `Inventory`, `Order` o `Payment`.
42. Elegibilidad se comunica a Catalog por decisión o evento.
43. Billing conserva la fuente de verdad del settlement.
44. User Services conserva la fuente de verdad de estado de usuario.
45. Cambios críticos generan `AuditLog`.
46. Auditoría no contiene secretos bancarios ni tokens.
47. Simulaciones incluyen periodo, moneda y política versionada.
48. Cumplimiento conserva la versión de sus reglas.
49. Reputación no sustituye verificación legal.
50. Un vendedor rechazado requiere nueva revisión explícita.
