# Administration Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para reportería, consolidación, monitoreo, dashboards, auditoría y análisis de riesgo de NexusMarket.

### Introducción

Administration Services ofrece vistas transversales para administradores y supervisores sin convertirse en fuente de verdad de usuarios, productos, inventario, órdenes, pagos o logística. Consolida eventos y proyecciones de los subdominios, construye reportes y dashboards, audita operaciones y evalúa señales de riesgo. `Operation` representa hechos atribuibles y `AuditLog` conserva registros críticos inmutables y append-only. Las métricas deben incluir periodo, versión de reglas, origen y nivel de frescura. Los administradores pueden ejecutar controles autorizados; los supervisores tienen acceso de consulta sin mutaciones críticas. Los análisis predictivos y alertas orientan decisiones humanas y no deben reemplazar las reglas de negocio de cada subdominio.

### Responsabilidades principales

- Consolidar información operativa y comercial.
- Generar reportes en formatos autorizados.
- Monitorear salud, SLA, fallos y excepciones.
- Proporcionar dashboards KPI casi en tiempo real.
- Auditar eventos y reconstruir timelines.
- Evaluar desempeño de Sellers.
- Evaluar riesgo de Buyers y anomalías.
- Generar alertas y análisis predictivo.

### Relación con Domain Model

Entidades: `AuditLog`, `Operation`, `User`, `Report`, `OperativeDashboard`, `Order`, `Product`, `Inventory`, `Shipment`, `Payment` y `Return`. Value objects principales: `OperationType`, `UserRole`, `AuditSeverity`, `Currency`, `OrderStatus`, `PaymentStatus` y `ShipmentStatus`. `AuditLog` y `Operation` son aggregates raíz de lectura y registro; los demás agregados se consultan mediante puertos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
generateReport(String type, String from, String to)
```

Correcto:
```text
generateReport(AdministrativeReportContext context)
// context.reportDefinition, period and actor are domain concepts
```

### Principio 2: Validación de datos externos

Los eventos y proyecciones de otros subdominios deben validarse por origen, versión, fecha y esquema. Un dato atrasado se marca como stale y no se presenta como actual.

### Principio 3: Inmutabilidad de Value Objects

`OperationType`, `AuditSeverity`, `Currency`, periodos y definiciones versionadas de reporte se tratan como valores inmutables.

### Principio 4: Traceabilidad operacional

Toda consulta sensible, exportación, alerta, decisión de riesgo y cambio de configuración genera una operación trazable. `AuditLog` no almacena secretos ni se modifica después de creado.

### Principio 5: Transaccionalidad y consistencia

Los reportes y dashboards usan snapshots o proyecciones identificadas. La publicación de un reporte debe ser atómica respecto a su metadata; la ingesta de eventos debe ser idempotente.

## 3. Domain Model Context

### Entidades principales involucradas

- `Operation`: acción ejecutada, actor, tipo y entidad afectada.
- `AuditLog`: evidencia crítica inmutable.
- `User`: actor y rol de consulta o administración.
- `Report`: definición, periodo, filtros y resultado.
- `OperativeDashboard`: indicadores, frescura y alertas.
- Proyecciones de Order, Payment, Inventory, Shipment, Product y Return.

### Value Objects utilizados

`OperationType`, `AuditSeverity`, `UserRole`, `Currency`, `OrderStatus`, `PaymentStatus`, `ShipmentStatus`, `DateRange`, `KpiDefinition`, `RiskScore` y `ReportFormat`.

### Aggregates y boundaries

```text
Operation (root) ----> AuditLog (root)
     |
     +--> affected entity reference

Report (read model) --> projections from User/Product/Order/Payment/Shipment
Dashboard (read model) --> KPI + alerts + freshness
RiskAssessment (read model) --> Buyer/Seller behavioral evidence
```

Administration consulta y proyecta; no modifica el estado interno de los agregados operativos.

### Ciclo de vida relevante

```text
Domain Event --> Validated --> Projected --> Aggregated
                                      |           |
                                      v           v
                                  Reported     Alerted

Risk: Observed --> Assessed --> ReviewRequired --> Resolved
Audit: Captured --> AppendOnly --> Retained / Exported
```

Las métricas y riesgos tienen periodo, versión y frescura explícitos. Un dashboard no puede presentar una proyección como hecho transaccional.

## 4. Numbered Services

## 1. Consolidate Business Information

### Description
Agrega proyecciones operativas, comerciales y financieras en una vista administrativa.

### Responsibility
Crear una lectura coherente sin reescribir fuentes de verdad.

### Input
- **Primary Input (Domain Model):** `BusinessConsolidationContext` con periodo y fuentes.
- **Secondary Input (Value Objects):** `Currency`, `DateRange`, `UserRole`.
- **Domain Constraints:** fuentes versionadas, periodo definido y frescura conocida.

### Processing & Validations
1. Validar fuentes. 2. Normalizar moneda. 3. Correlacionar entidades. 4. Sellar snapshot.

### Persistence & Output
- **Output (Domain Model):** `BusinessConsolidatedView`.
- **Persisted Aggregates:** snapshot y `Operation`.
- **Generated Events:** `BusinessInformationConsolidatedEvent`.

### Operation & Audit
- **Operation Type:** `BUSINESS_INFORMATION_CONSOLIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 2. Generate Administrative Report

### Description
Produce un reporte operativo, comercial, financiero o de cumplimiento.

### Responsibility
Entregar datos reproducibles con definición, filtros, periodo y versión.

### Input
- **Primary Input (Domain Model):** `AdministrativeReportContext` con definición y snapshot.
- **Secondary Input (Value Objects):** `DateRange`, `Currency`, `ReportFormat`.
- **Domain Constraints:** actor autorizado, fuentes disponibles y formato permitido.

### Processing & Validations
1. Validar definición. 2. Seleccionar proyección. 3. Calcular métricas. 4. Publicar reporte.

### Persistence & Output
- **Output (Domain Model):** `AdministrativeReport`.
- **Persisted Aggregates:** `Report`, metadata, `Operation`, `AuditLog`.
- **Generated Events:** `AdministrativeReportGeneratedEvent`.

### Operation & Audit
- **Operation Type:** `ADMINISTRATIVE_REPORT_GENERATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 3. Export Report

### Description
Exporta un reporte a PDF, Excel, JSON u otro formato aprobado.

### Responsibility
Garantizar integridad, autorización y minimización durante la entrega.

### Input
- **Primary Input (Domain Model):** `ReportExportContext` con `AdministrativeReport` y solicitante.
- **Secondary Input (Value Objects):** `ReportFormat`, `UserRole`, `DateRange`.
- **Domain Constraints:** permisos, formato permitido y datos sensibles filtrados.

### Processing & Validations
1. Autorizar exportación. 2. Validar versión. 3. Serializar resultado. 4. Registrar entrega.

### Persistence & Output
- **Output (Domain Model):** `ReportExportResult`.
- **Persisted Aggregates:** metadata de exportación, `Operation`, `AuditLog`.
- **Generated Events:** `ReportExportedEvent`.

### Operation & Audit
- **Operation Type:** `REPORT_EXPORT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 4. Monitor Marketplace Operations

### Description
Supervisa operaciones, fallos, estados, latencias y excepciones del marketplace.

### Responsibility
Construir una lectura operacional actual y marcada por frescura.

### Input
- **Primary Input (Domain Model):** `MarketplaceMonitoringContext` con proyecciones y periodo.
- **Secondary Input (Value Objects):** `AuditSeverity`, `OperationType`, `DateRange`.
- **Domain Constraints:** eventos correlacionables y umbrales versionados.

### Processing & Validations
1. Leer proyecciones. 2. Calcular salud. 3. Comparar umbrales. 4. Generar hallazgos.

### Persistence & Output
- **Output (Domain Model):** `MarketplaceOperationalHealth`.
- **Persisted Aggregates:** snapshot y `Operation`.
- **Generated Events:** `MarketplaceAnomalyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `MARKETPLACE_OPERATION_MONITORING`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Consult Operational Dashboard

### Description
Presenta KPI, excepciones, rendimiento y estados relevantes para supervisión.

### Responsibility
Entregar una vista agregada con timestamp y calidad de datos.

### Input
- **Primary Input (Domain Model):** `OperationalDashboardContext` con dashboard y audiencia.
- **Secondary Input (Value Objects):** `UserRole`, `DateRange`, `Currency`.
- **Domain Constraints:** autorización, filtros permitidos y frescura visible.

### Processing & Validations
1. Autorizar audiencia. 2. Leer KPI. 3. Marcar stale data. 4. Componer vista.

### Persistence & Output
- **Output (Domain Model):** `OperativeDashboardView`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `OperationalDashboardConsultedEvent`.

### Operation & Audit
- **Operation Type:** `OPERATIONAL_DASHBOARD_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 6. Define KPI

### Description
Registra una definición versionada de indicador y sus fuentes autorizadas.

### Responsibility
Evitar métricas ambiguas o incompatibles entre reportes.

### Input
- **Primary Input (Domain Model):** `KpiDefinitionContext` con `KpiDefinition` y actor.
- **Secondary Input (Value Objects):** `Currency`, `DateRange`, `UserRole`.
- **Domain Constraints:** fórmula, unidad, periodo y fuente obligatorios.

### Processing & Validations
1. Validar fórmula. 2. Verificar fuentes. 3. Versionar definición. 4. Activar política.

### Persistence & Output
- **Output (Domain Model):** `KpiDefinitionResult`.
- **Persisted Aggregates:** `KpiDefinition`, `Operation`, `AuditLog`.
- **Generated Events:** `KpiDefinitionVersionedEvent`.

### Operation & Audit
- **Operation Type:** `KPI_DEFINITION_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 7. Audit Business Events

### Description
Reconstruye la secuencia de operaciones significativas de una entidad o periodo.

### Responsibility
Proporcionar trazabilidad completa desde fuentes append-only.

### Input
- **Primary Input (Domain Model):** `BusinessAuditContext` con referencia y periodo.
- **Secondary Input (Value Objects):** `OperationType`, `AuditSeverity`, `DateRange`.
- **Domain Constraints:** actor autorizado, fuentes inmutables y correlación disponible.

### Processing & Validations
1. Leer operaciones. 2. Correlacionar auditorías. 3. Ordenar hechos. 4. Detectar huecos.

### Persistence & Output
- **Output (Domain Model):** `BusinessEventTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `BusinessEventsAuditedEvent`.

### Operation & Audit
- **Operation Type:** `BUSINESS_EVENT_AUDIT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 8. Reconcile Audit Records

### Description
Compara Operations y AuditLogs para detectar registros faltantes o inconsistentes.

### Responsibility
Proteger integridad de la trazabilidad sin modificar evidencias existentes.

### Input
- **Primary Input (Domain Model):** `AuditReconciliationContext` con entidad y periodo.
- **Secondary Input (Value Objects):** `OperationType`, `AuditSeverity`, `DateRange`.
- **Domain Constraints:** repositorios append-only y correlación estable.

### Processing & Validations
1. Leer ambos registros. 2. Comparar referencias. 3. Clasificar diferencias. 4. Abrir incidencia.

### Persistence & Output
- **Output (Domain Model):** `AuditReconciliationReport`.
- **Persisted Aggregates:** reporte, `Operation`, `AuditLog`.
- **Generated Events:** `AuditDiscrepancyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `AUDIT_RECONCILIATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 9. Evaluate Seller Performance

### Description
Calcula desempeño de Seller con entregas, cancelaciones, calidad y reputación.

### Responsibility
Ofrecer evaluación comparable y explicable para gobernanza.

### Input
- **Primary Input (Domain Model):** `SellerPerformanceContext` con Seller y periodo.
- **Secondary Input (Value Objects):** `Currency`, `DateRange`, `OrderStatus`, `ShipmentStatus`.
- **Domain Constraints:** métricas definidas y datos suficientes.

### Processing & Validations
1. Reunir eventos. 2. Normalizar periodo. 3. Calcular indicadores. 4. Explicar resultado.

### Persistence & Output
- **Output (Domain Model):** `SellerPerformanceAssessment`.
- **Persisted Aggregates:** proyección y `Operation`.
- **Generated Events:** `SellerPerformanceEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `SELLER_PERFORMANCE_EVALUATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 10. Evaluate Buyer Risk

### Description
Analiza patrones de compras, pagos, devoluciones y accesos para identificar riesgo.

### Responsibility
Generar una señal de riesgo sin bloquear automáticamente fuera de política.

### Input
- **Primary Input (Domain Model):** `BuyerRiskContext` con Buyer y evidencia agregada.
- **Secondary Input (Value Objects):** `Currency`, `AuditSeverity`, `DateRange`.
- **Domain Constraints:** evidencia autorizada, reglas versionadas y revisión humana.

### Processing & Validations
1. Reunir comportamiento. 2. Aplicar modelo. 3. Calcular RiskScore. 4. Escalar señales.

### Persistence & Output
- **Output (Domain Model):** `BuyerRiskAssessment`.
- **Persisted Aggregates:** assessment, `Operation`, `AuditLog`.
- **Generated Events:** `BuyerRiskSignalDetectedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_RISK_EVALUATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 11. Detect Operational Anomaly

### Description
Detecta desviaciones en volumen, latencia, errores, inventario, pagos o entregas.

### Responsibility
Convertir anomalías estadísticas en alertas explicables.

### Input
- **Primary Input (Domain Model):** `AnomalyDetectionContext` con KPI y periodo.
- **Secondary Input (Value Objects):** `AuditSeverity`, `DateRange`, `Currency`.
- **Domain Constraints:** baseline versionado y umbral definido.

### Processing & Validations
1. Construir baseline. 2. Comparar observación. 3. Clasificar severidad. 4. Crear alerta.

### Persistence & Output
- **Output (Domain Model):** `OperationalAnomaly`.
- **Persisted Aggregates:** alerta y `Operation`, `AuditLog`.
- **Generated Events:** `OperationalAnomalyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `OPERATIONAL_ANOMALY_DETECTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 12. Generate Administrative Alert

### Description
Genera y enruta una alerta por riesgo, SLA, auditoría o excepción crítica.

### Responsibility
Asegurar destinatario, severidad, deduplicación y escalamiento.

### Input
- **Primary Input (Domain Model):** `AdministrativeAlertContext` con hallazgo y política.
- **Secondary Input (Value Objects):** `AuditSeverity`, `UserRole`, `OperationType`.
- **Domain Constraints:** regla vigente, destinatario autorizado y alerta no duplicada.

### Processing & Validations
1. Validar hallazgo. 2. Aplicar política. 3. Deduplicar. 4. Notificar y escalar.

### Persistence & Output
- **Output (Domain Model):** `AdministrativeAlert`.
- **Persisted Aggregates:** alerta, `Operation`, `AuditLog`.
- **Generated Events:** `AdministrativeAlertGeneratedEvent`.

### Operation & Audit
- **Operation Type:** `ADMINISTRATIVE_ALERT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 13. Predict Marketplace Trend

### Description
Proyecta tendencias de ventas, demanda, conversión, entregas o incidencias.

### Responsibility
Ofrecer predicción versionada y separada de hechos confirmados.

### Input
- **Primary Input (Domain Model):** `MarketplaceTrendContext` con series y periodo futuro.
- **Secondary Input (Value Objects):** `Currency`, `DateRange`, `KpiDefinition`.
- **Domain Constraints:** datos suficientes, modelo versionado y confianza calculada.

### Processing & Validations
1. Validar series. 2. Seleccionar modelo. 3. Calcular proyección. 4. Emitir intervalo.

### Persistence & Output
- **Output (Domain Model):** `MarketplaceTrendForecast`.
- **Persisted Aggregates:** forecast y `Operation`.
- **Generated Events:** `MarketplaceTrendPredictedEvent`.

### Operation & Audit
- **Operation Type:** `MARKETPLACE_TREND_PREDICTION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 14. Export Audit Timeline

### Description
Entrega una timeline de auditoría para investigación, soporte o cumplimiento regulatorio.

### Responsibility
Exportar evidencia íntegra, autorizada y minimizada.

### Input
- **Primary Input (Domain Model):** `AuditExportContext` con entidad, periodo y actor.
- **Secondary Input (Value Objects):** `DateRange`, `OperationType`, `ReportFormat`.
- **Domain Constraints:** acceso autorizado, retención vigente y secretos excluidos.

### Processing & Validations
1. Autorizar alcance. 2. Leer fuentes append-only. 3. Filtrar secretos. 4. Sellar exportación.

### Persistence & Output
- **Output (Domain Model):** `AuditTimelineExport`.
- **Persisted Aggregates:** metadata, `Operation`, `AuditLog`.
- **Generated Events:** `AuditTimelineExportedEvent`.

### Operation & Audit
- **Operation Type:** `AUDIT_TIMELINE_EXPORT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 15. Retain Compliance Evidence

### Description
Clasifica y conserva evidencia administrativa durante el periodo de retención aplicable.

### Responsibility
Mantener disponibilidad, integridad y política de expiración de evidencia.

### Input
- **Primary Input (Domain Model):** `ComplianceRetentionContext` con evidencia y regla.
- **Secondary Input (Value Objects):** `AuditSeverity`, `DateRange`, `OperationType`.
- **Domain Constraints:** regla vigente, integridad verificable y acceso restringido.

### Processing & Validations
1. Validar evidencia. 2. Determinar retención. 3. Sellar hash. 4. Registrar custodia.

### Persistence & Output
- **Output (Domain Model):** `ComplianceRetentionResult`.
- **Persisted Aggregates:** índice de evidencia, `Operation`, `AuditLog`.
- **Generated Events:** `ComplianceEvidenceRetainedEvent`.

### Operation & Audit
- **Operation Type:** `COMPLIANCE_EVIDENCE_RETENTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 16. Review Administrative Access

### Description
Revisa accesos de administradores y supervisores para detectar privilegios o consultas anómalas.

### Responsibility
Verificar que el uso de capacidades administrativas corresponda al rol y propósito.

### Input
- **Primary Input (Domain Model):** `AdministrativeAccessReviewContext` con User y timeline.
- **Secondary Input (Value Objects):** `UserRole`, `AuditSeverity`, `OperationType`.
- **Domain Constraints:** registros completos, segregación de funciones y datos minimizados.

### Processing & Validations
1. Correlacionar accesos. 2. Comparar rol y acción. 3. Detectar exceso. 4. Escalar hallazgos.

### Persistence & Output
- **Output (Domain Model):** `AdministrativeAccessReview`.
- **Persisted Aggregates:** reporte, `Operation`, `AuditLog`.
- **Generated Events:** `AdministrativeAccessAnomalyDetectedEvent`.

### Operation & Audit
- **Operation Type:** `ADMINISTRATIVE_ACCESS_REVIEW`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByActor(User user)
    List<Operation> findByAffectedEntity(EntityReference entity)
    List<Operation> findByType(OperationType type)
    List<Operation> findByDateRange(DateRange range)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByEntity(EntityReference entity)
    List<AuditLog> findByActor(User user)
    List<AuditLog> findByDateRange(DateRange range)
}
```

#### ReportRepositoryPort
```text
interface ReportRepositoryPort {
    Report save(Report report)
    Optional<Report> findByIdentifier(Report report)
    List<Report> findByDefinition(ReportDefinition definition)
}
```

#### DashboardRepositoryPort
```text
interface DashboardRepositoryPort {
    OperativeDashboard save(OperativeDashboard dashboard)
    Optional<OperativeDashboard> findByAudience(DashboardAudience audience)
}
```

#### RiskAssessmentRepositoryPort
```text
interface RiskAssessmentRepositoryPort {
    RiskAssessment save(RiskAssessment assessment)
    List<RiskAssessment> findBySubject(EntityReference subject)
}
```

#### ProjectionRepositoryPort
```text
interface ProjectionRepositoryPort {
    DomainProjection retrieve(ProjectionDefinition definition, DateRange range)
    ProjectionFreshness freshness(ProjectionDefinition definition)
}
```

### External Service Contracts

#### DomainEventStreamPort
```text
interface DomainEventStreamPort {
    List<DomainEvent> read(EventQuery query)
}
```

#### ReportRendererPort
```text
interface ReportRendererPort {
    RenderedReport render(AdministrativeReport report, ReportFormat format)
}
```

#### NotificationPort
```text
interface NotificationPort {
    NotificationReceipt notify(AdministrativeAudience audience, DomainNotification notification)
}
```

#### RiskAnalysisPort
```text
interface RiskAnalysisPort {
    RiskAssessment assess(RiskAnalysisContext context)
}
```

#### ForecastingPort
```text
interface ForecastingPort {
    Forecast forecast(ForecastContext context)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(AdministrativeOperationContext context)
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
interface GenerateAdministrativeReportUseCase {
    AdministrativeReport execute(AdministrativeReportContext context)
}
interface ConsultOperationalDashboardUseCase {
    OperativeDashboardView execute(OperationalDashboardContext context)
}
interface AuditBusinessEventsUseCase {
    BusinessEventTimeline execute(BusinessAuditContext context)
}
interface EvaluateSellerPerformanceUseCase {
    SellerPerformanceAssessment execute(SellerPerformanceContext context)
}
interface EvaluateBuyerRiskUseCase {
    BuyerRiskAssessment execute(BuyerRiskContext context)
}
interface GenerateAdministrativeAlertUseCase {
    AdministrativeAlert execute(AdministrativeAlertContext context)
}
interface ExportAuditTimelineUseCase {
    AuditTimelineExport execute(AuditExportContext context)
}
```

### Ejemplos de invocación

```text
const report = await generateAdministrativeReportUseCase.execute({
    definition: marketplaceKpiReport,
    period: DateRange.month(currentMonth),
    currency: Currency.COP,
    actor: supervisor
})
```

```text
const risk = await evaluateBuyerRiskUseCase.execute({
    buyer: buyer,
    evidence: authorizedBuyerEvidence,
    policy: activeRiskPolicy,
    reviewContext: reviewContext
})
```

## 7. Data Flow Diagram

```text
[Domain Event Streams]
          |
          v
[Projection / Consolidation Services]
          |
          +--> Reports / KPI / Dashboards
          +--> Seller Performance / Buyer Risk
          +--> Anomalies / Alerts / Forecasts
          |
          v
[OperationRepositoryPort] + [AuditLogRepositoryPort]
          |
          v
[Admin / Supervisor Input Port]
```

Administration lee y proyecta información; cada subdominio mantiene la fuente de verdad de sus entidades y estados.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Operation.operationId` debe ser único y estable.
2. Cada Operation debe identificar actor, tipo, entidad afectada y fecha.
3. `operationType` debe pertenecer al catálogo vigente o a una extensión versionada aprobada.
4. `AuditLog` debe referenciar una operación o evento crítico válido.
5. Reportes deben identificar definición, periodo, fuentes y versión.
6. KPI deben declarar fórmula, unidad y frescura.
7. Riesgos deben incluir evidencia, modelo y versión de reglas.
8. Las monedas consolidadas deben ser explícitas y soportadas.
9. Los snapshots deben indicar timestamp y origen.
10. Los datos de una proyección no pueden presentarse como transacción confirmada.

### Transactional Constraints

11. `Operation` y `AuditLog` se agregan de forma idempotente.
12. Los registros append-only nunca se actualizan ni eliminan.
13. Una exportación debe guardar metadata antes de entregar el archivo.
14. La ingesta repetida de un evento no duplica métricas ni alertas.
15. Un dashboard debe publicar snapshot coherente y timestamp único.
16. Cambios de KPI requieren nueva versión, no edición histórica.
17. Un reporte fallido no se publica como completo.
18. Un riesgo no bloquea automáticamente operaciones fuera de una política explícita.
19. Alertas duplicadas se deduplican por regla, entidad y ventana.
20. Predicciones no cambian agregados operativos.

### Authorization & Access Constraints

21. Administrators pueden ejecutar controles solo dentro de su alcance.
22. Supervisors consultan información permitida, pero no mutan operaciones críticas.
23. Reportes sensibles requieren autorización y propósito.
24. Exportaciones de auditoría requieren actor autorizado y retención vigente.
25. Los datos personales y financieros se minimizan en dashboards.
26. Un Seller no puede consultar métricas privadas de otro Seller sin permiso.
27. Las evaluaciones de riesgo restringen acceso a evidencia detallada.
28. Separación de funciones impide que un actor apruebe su propia revisión.
29. Las alertas se enrutan solo a roles autorizados.
30. Ningún servicio administrativo expone credenciales, tokens o secretos.

### Persistence & State Constraints

31. `AuditLog` es inmutable y append-only.
32. `Operation` representa hechos y no sustituye el estado de una entidad.
33. Las definiciones de reporte y KPI son versionadas.
34. Las fuentes y proyecciones conservan su fecha de frescura.
35. La evidencia retenida debe conservar integridad verificable.
36. Reportes históricos no se recalculan silenciosamente con reglas nuevas.
37. Repositorios usan modelos de dominio, no DTOs ni ORM.
38. Timestamps proceden de `ClockPort`.
39. Adaptadores no filtran SQL, colas, formatos internos ni secretos.
40. La eliminación por retención produce un evento auditable de expiración.

### Cross-Aggregate Constraints

41. Administration no modifica User, Seller, Product, Inventory, Order, Payment o Shipment.
42. Cada subdominio conserva fuente de verdad de sus entidades.
43. Consolidación usa eventos o proyecciones, no consultas que rompan límites.
44. Un dashboard no autoriza pagos, reservas, publicaciones o envíos.
45. Riesgo informa a los servicios dueños mediante decisión o evento.
46. Auditoría puede consultar todos los contextos sin alterar sus registros.
47. Los reportes deben distinguir datos confirmados, estimados y predichos.
48. Una discrepancia entre proyección y fuente genera alerta, no corrección silenciosa.

### Audit, Performance & Business Rules

49. Generar, exportar, consultar reportes sensibles, evaluar riesgo y retener evidencia generan auditoría.
50. Auditoría no contiene credenciales ni datos innecesarios; métricas, alertas y predicciones incluyen periodo, versión, fuente y frescura.
