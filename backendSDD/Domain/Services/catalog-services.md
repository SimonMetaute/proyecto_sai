# Catalog Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para gestionar productos, variantes, categorías, precios, publicación, búsqueda y conformidad del catálogo de NexusMarket.

### Introducción

El agregado `Product` representa la oferta comercial publicada por un `Seller`. Contiene nombre, descripción, categoría, SKU, precio base, marca, variantes y `ProductStatus`. Los servicios de catálogo validan que el vendedor esté verificado, que el SKU sea único, que los precios sean compatibles y que los datos cumplan las reglas de categoría. `ProductVariant` mantiene opciones como color, talla o capacidad sin duplicar combinaciones. La disponibilidad se consulta en Inventory, pero el catálogo no modifica stock. Versionado, rollback, búsqueda y análisis competitivo se expresan como modelos de dominio y se integran mediante puertos. Todo cambio crítico genera `Operation` y `AuditLog`.

### Responsabilidades principales

- Crear, actualizar y retirar productos.
- Publicar productos elegibles.
- Gestionar categorías, atributos y variantes.
- Validar SKU, precios y metadatos.
- Evaluar conformidad por categoría.
- Versionar productos y ejecutar rollback controlado.
- Consultar búsqueda y disponibilidad proyectada.
- Analizar competencia y posición de precios.

### Relación con Domain Model

Entidades: `Product`, `ProductVariant`, `ProductCategory`, `Seller`, `Store`, `Operation` y `AuditLog`. Value objects: `ProductPrice`, `Currency`, `ProductStatus`, `ProductCategory` y catálogos asociados. Aggregates: `Product` como root; `ProductVariant` pertenece a su producto. Seller e Inventory son límites externos consultados mediante puertos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
publishProduct(UUID productId, String sku, Decimal price)
```

Correcto:
```text
publishProduct(PublishProductContext context)
// context.product, context.seller and context.catalogPolicy are domain concepts
```

### Principio 2: Validación de datos externos

Datos del vendedor, reglas de categoría, disponibilidad, competencia y búsquedas externas se validan antes de afectar el catálogo. Una respuesta incompleta no habilita publicación.

### Principio 3: Inmutabilidad de Value Objects

`ProductPrice`, `Currency`, `ProductCategory` y `ProductStatus` no se modifican en sitio. Cada cambio crea un valor válido y una transición explícita.

### Principio 4: Traceabilidad operacional

Publicaciones, suspensiones, cambios de precio, variantes, categoría, rollback y cumplimiento generan `Operation` y `AuditLog` según su severidad. Se conserva evidencia sin secretos.

### Principio 5: Transaccionalidad y consistencia

El producto y sus variantes se actualizan dentro del límite del agregado `Product`. Inventario, Seller y órdenes se coordinan por eventos y puertos, sin mutaciones compartidas.

## 3. Domain Model Context

### Entidades principales involucradas

- **Product:** identidad, SKU, contenido, categoría, precio y estado.
- **ProductVariant:** opción del producto, atributo, valor, precio adicional y SKU variante.
- **Seller / Store:** autorización comercial y origen de la oferta.
- **Inventory:** disponibilidad consultada, no administrada por Catalog.
- **Operation / AuditLog:** trazabilidad de cambios.

### Value Objects utilizados

`ProductPrice`, `Currency`, `ProductCategory`, `ProductStatus` (`DRAFT`, `PUBLISHED`, `INACTIVE`, `SUSPENDED`, `OUT_OF_STOCK`), `SellerVerificationStatus` y `StoreStatus`.

### Aggregates y boundaries

```text
Seller (root) --> Product (root)
                    |-- ProductVariant[]
                    |-- ProductCategory
                    |-- ProductPrice
                    |-- ProductStatus
                    +-- SKU
Product --availability query--> Inventory
Product --commercial snapshot--> Order / ShoppingCart
```

Product conserva sus invariantes. Seller decide verificación; Inventory decide stock; Order y Cart conservan precios históricos.

### Ciclo de vida relevante

```text
DRAFT --> PUBLISHED --> INACTIVE
  |          |  ^
  |          +-> SUSPENDED --review--> PUBLISHED
  |          +-> OUT_OF_STOCK -------> PUBLISHED
  +--validation failure--> DRAFT
```

Publicar requiere vendedor verificado, SKU único, precio válido, variantes consistentes y cumplimiento de categoría.

## 4. Numbered Services

## 1. Create Product

### Description
Crea un producto en estado `DRAFT` con identidad, SKU, categoría y precio inicial.

### Responsibility
Establecer un `Product` internamente consistente antes de publicarlo.

### Input
- **Primary Input (Domain Model):** `ProductCreationContext` con `Seller` y `ProductDraft`.
- **Secondary Input (Value Objects):** `ProductCategory`, `ProductPrice`, `Currency`.
- **Domain Constraints:** vendedor autorizado, SKU disponible y precio positivo.

### Processing & Validations
1. Validar Seller y Store. 2. Comprobar SKU. 3. Validar contenido y precio. 4. Crear `DRAFT`.

### Persistence & Output
- **Output (Domain Model):** `ProductCreationResult`.
- **Persisted Aggregates:** `Product`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductCreatedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_CREATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 2. Update Product

### Description
Actualiza contenido, marca, categoría o precio permitido sin perder la identidad del producto.

### Responsibility
Mantener integridad del producto y exigir nueva validación cuando cambia una condición crítica.

### Input
- **Primary Input (Domain Model):** `ProductUpdateContext` con `Product` y cambios versionados.
- **Secondary Input (Value Objects):** `ProductCategory`, `ProductPrice`, `Currency`.
- **Domain Constraints:** propietario autorizado, SKU protegido y precio compatible.

### Processing & Validations
1. Cargar versión. 2. Validar campos. 3. Revisar impacto de publicación. 4. Guardar cambio.

### Persistence & Output
- **Output (Domain Model):** `ProductUpdateResult`.
- **Persisted Aggregates:** `Product`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductUpdatedEvent`, `ProductRevalidationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_UPDATE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 3. Publish Product

### Description
Transiciona un producto elegible de `DRAFT` a `PUBLISHED`.

### Responsibility
Garantizar todas las condiciones comerciales, técnicas y de cumplimiento previas a publicación.

### Input
- **Primary Input (Domain Model):** `PublishProductContext` con `Product`, `Seller` y `Store`.
- **Secondary Input (Value Objects):** `ProductStatus`, `ProductPrice`, `ProductCategory`.
- **Domain Constraints:** Seller verificado, Store activa, SKU, precio y categoría válidos.

### Processing & Validations
1. Validar elegibilidad del vendedor. 2. Validar producto y variantes. 3. Ejecutar compliance. 4. Cambiar a `PUBLISHED`.

### Persistence & Output
- **Output (Domain Model):** `ProductPublicationResult`.
- **Persisted Aggregates:** `Product`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductPublishedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_PUBLICATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 4. Remove Product

### Description
Retira un producto de nuevas ventas mediante estado `INACTIVE`, conservando su historia.

### Responsibility
Cerrar la disponibilidad comercial sin borrar referencias de órdenes o auditoría.

### Input
- **Primary Input (Domain Model):** `ProductRemovalContext` con `Product`, Seller y motivo.
- **Secondary Input (Value Objects):** `ProductStatus`, `OperationType`.
- **Domain Constraints:** actor autorizado y productos históricos inmutables.

### Processing & Validations
1. Validar propietario. 2. Comprobar operaciones activas. 3. Cambiar a `INACTIVE`. 4. Notificar consumidores.

### Persistence & Output
- **Output (Domain Model):** `ProductRemovalResult`.
- **Persisted Aggregates:** `Product`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductRemovedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_REMOVAL`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Suspend Product

### Description
Suspende temporalmente un producto por incumplimiento, riesgo o revisión pendiente.

### Responsibility
Impedir nuevas compras mientras se conserva evidencia y opción de reactivación.

### Input
- **Primary Input (Domain Model):** `ProductRestrictionContext` con `Product`, caso y motivo.
- **Secondary Input (Value Objects):** `ProductStatus`, `AuditSeverity`.
- **Domain Constraints:** causa, alcance y autoridad documentados.

### Processing & Validations
1. Validar evidencia. 2. Cambiar a `SUSPENDED`. 3. Notificar a Cart y Search. 4. Abrir revisión.

### Persistence & Output
- **Output (Domain Model):** `ProductSuspensionResult`.
- **Persisted Aggregates:** `Product`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductSuspendedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_SUSPENSION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 6. Manage Product Attributes

### Description
Gestiona atributos descriptivos y estructurados del producto sin duplicar variantes.

### Responsibility
Mantener metadatos completos y compatibles con la categoría.

### Input
- **Primary Input (Domain Model):** `ProductAttributeContext` con `Product` y atributos.
- **Secondary Input (Value Objects):** `ProductCategory`, `ProductStatus`.
- **Domain Constraints:** nombres y valores válidos; atributos requeridos por categoría.

### Processing & Validations
1. Resolver esquema de categoría. 2. Validar valores. 3. Detectar duplicados. 4. Guardar cambios.

### Persistence & Output
- **Output (Domain Model):** `ProductAttributeResult`.
- **Persisted Aggregates:** `Product`, `Operation`.
- **Generated Events:** `ProductAttributesChangedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_ATTRIBUTE_MANAGEMENT`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 7. Manage Product Variants

### Description
Añade, actualiza o retira opciones como talla, color o capacidad.

### Responsibility
Garantizar que cada combinación y SKU variante sea única y compatible con el producto.

### Input
- **Primary Input (Domain Model):** `ProductVariantContext` con `Product` y `ProductVariant`.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`.
- **Domain Constraints:** asociación correcta, combinación no duplicada y precio compatible.

### Processing & Validations
1. Validar atributo y valor. 2. Comprobar combinación. 3. Validar SKU variante. 4. Guardar agregado.

### Persistence & Output
- **Output (Domain Model):** `ProductVariantResult`.
- **Persisted Aggregates:** `Product`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductVariantAddedEvent` o `ProductVariantUpdatedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_VARIANT_MANAGEMENT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 8. Classify Product

### Description
Asigna una categoría controlada para navegación, políticas y reportes.

### Responsibility
Asegurar que la categoría represente el producto y habilite sus reglas.

### Input
- **Primary Input (Domain Model):** `ProductClassificationContext` con `Product` y evidencia.
- **Secondary Input (Value Objects):** `ProductCategory`, `ProductStatus`.
- **Domain Constraints:** categoría del catálogo; clasificación explicable.

### Processing & Validations
1. Validar categoría. 2. Evaluar evidencia. 3. Detectar incompatibilidad. 4. Persistir asignación.

### Persistence & Output
- **Output (Domain Model):** `ProductClassificationResult`.
- **Persisted Aggregates:** `Product`, `Operation`.
- **Generated Events:** `ProductClassifiedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_CLASSIFICATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 9. Validate Catalog Compliance

### Description
Comprueba producto, contenido, categoría, precio y vendedor contra políticas de marketplace.

### Responsibility
Evitar publicaciones inválidas o prohibidas mediante reglas versionadas.

### Input
- **Primary Input (Domain Model):** `CatalogComplianceContext` con `Product`, Seller y política.
- **Secondary Input (Value Objects):** `ProductCategory`, `ProductPrice`, `ProductStatus`.
- **Domain Constraints:** política vigente, evidencia suficiente y Seller verificado.

### Processing & Validations
1. Validar categoría. 2. Revisar contenido y precio. 3. Evaluar restricciones. 4. Emitir hallazgos.

### Persistence & Output
- **Output (Domain Model):** `CatalogComplianceResult`.
- **Persisted Aggregates:** caso de cumplimiento, `Operation`, `AuditLog`.
- **Generated Events:** `CatalogComplianceValidatedEvent` o `ProductReviewRequestedEvent`.

### Operation & Audit
- **Operation Type:** `CATALOG_COMPLIANCE_VALIDATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 10. Validate Product Price

### Description
Valida monto, moneda, rango, precio de variante y política comercial.

### Responsibility
Garantizar que todo precio sea representable y consistente antes de su uso.

### Input
- **Primary Input (Domain Model):** `ProductPriceContext` con `Product` o `ProductVariant`.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`.
- **Domain Constraints:** monto no negativo, moneda soportada y variante compatible.

### Processing & Validations
1. Validar escala monetaria. 2. Comparar precio base. 3. Revisar límites. 4. Devolver decisión.

### Persistence & Output
- **Output (Domain Model):** `ProductPriceValidationResult`.
- **Persisted Aggregates:** `Product` si es cambio aprobado, `Operation`.
- **Generated Events:** `ProductPriceValidatedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_PRICE_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 11. Version Product

### Description
Crea una versión inmutable del producto para comparar contenido, precio, categoría y variantes.

### Responsibility
Permitir reconstrucción histórica y cambios controlados.

### Input
- **Primary Input (Domain Model):** `ProductVersionContext` con `Product` y snapshot.
- **Secondary Input (Value Objects):** `ProductPrice`, `ProductCategory`, `ProductStatus`.
- **Domain Constraints:** versión secuencial, autor y motivo identificados.

### Processing & Validations
1. Comparar snapshot. 2. Validar cambios. 3. Crear versión append-only. 4. Publicar evento.

### Persistence & Output
- **Output (Domain Model):** `ProductVersionResult`.
- **Persisted Aggregates:** `ProductVersion`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductVersionCreatedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_VERSIONING`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 12. Rollback Product Version

### Description
Restaura una versión anterior después de validar sus condiciones actuales.

### Responsibility
Revertir de forma explícita sin borrar versiones posteriores ni saltar compliance.

### Input
- **Primary Input (Domain Model):** `ProductRollbackContext` con `Product` y versión objetivo.
- **Secondary Input (Value Objects):** `ProductStatus`, `ProductPrice`, `ProductCategory`.
- **Domain Constraints:** autorización, versión existente y reglas vigentes satisfechas.

### Processing & Validations
1. Cargar versión. 2. Comparar dependencias. 3. Ejecutar compliance. 4. Crear nueva versión restaurada.

### Persistence & Output
- **Output (Domain Model):** `ProductRollbackResult`.
- **Persisted Aggregates:** `Product`, `ProductVersion`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductRollbackCompletedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_ROLLBACK`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog + Operation`

## 13. Search Catalog

### Description
Busca productos elegibles mediante criterios de categoría, texto, precio, marca y estado.

### Responsibility
Exponer solo productos visibles y comercialmente elegibles.

### Input
- **Primary Input (Domain Model):** `CatalogSearchContext` con `CatalogCriteria` y actor.
- **Secondary Input (Value Objects):** `ProductCategory`, `ProductPrice`, `Currency`.
- **Domain Constraints:** `PUBLISHED`, visibilidad autorizada y precios consistentes.

### Processing & Validations
1. Validar criterios. 2. Consultar índice por puerto. 3. Filtrar estados no visibles. 4. Devolver resultados.

### Persistence & Output
- **Output (Domain Model):** `CatalogSearchResult`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `CatalogSearchedEvent` cuando la política lo requiere.

### Operation & Audit
- **Operation Type:** `CATALOG_SEARCH`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 14. Consult Product Availability

### Description
Combina el producto publicado con disponibilidad proyectada consultada en Inventory.

### Responsibility
No prometer disponibilidad cuando el catálogo o inventario están desactualizados.

### Input
- **Primary Input (Domain Model):** `ProductAvailabilityContext` con `Product` y contexto de fulfillment.
- **Secondary Input (Value Objects):** `ProductStatus`, `ProductVariant`.
- **Domain Constraints:** producto publicado y consulta con timestamp.

### Processing & Validations
1. Validar visibilidad. 2. Consultar `InventoryAvailabilityPort`. 3. Correlacionar variantes. 4. Marcar incertidumbre.

### Persistence & Output
- **Output (Domain Model):** `ProductAvailabilityView`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `ProductAvailabilityConsultedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_AVAILABILITY_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 15. Analyze Competitive Pricing

### Description
Compara el precio del producto con referencias de mercado autorizadas y devuelve posicionamiento.

### Responsibility
Generar análisis informativo sin cambiar automáticamente el precio del vendedor.

### Input
- **Primary Input (Domain Model):** `CompetitivePricingContext` con `Product`, mercado y periodo.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `ProductCategory`.
- **Domain Constraints:** fuentes autorizadas, moneda normalizada y evidencia fechada.

### Processing & Validations
1. Seleccionar comparables. 2. Normalizar moneda. 3. Calcular rango y posición. 4. Explicar confianza.

### Persistence & Output
- **Output (Domain Model):** `CompetitivePricingAnalysis`.
- **Persisted Aggregates:** reporte y `Operation`; no cambia `Product`.
- **Generated Events:** `CompetitivePricingAnalyzedEvent`.

### Operation & Audit
- **Operation Type:** `COMPETITIVE_PRICING_ANALYSIS`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 16. Manage Product Availability Status

### Description
Actualiza `OUT_OF_STOCK` o solicita retorno a `PUBLISHED` según señales de Inventory.

### Responsibility
Reflejar disponibilidad sin apropiarse de movimientos de inventario.

### Input
- **Primary Input (Domain Model):** `ProductAvailabilityStatusContext` con `Product` y evidencia de Inventory.
- **Secondary Input (Value Objects):** `ProductStatus`.
- **Domain Constraints:** evidencia actual, transición permitida y no alterar precios.

### Processing & Validations
1. Validar origen. 2. Comprobar estado actual. 3. Aplicar transición. 4. Publicar actualización.

### Persistence & Output
- **Output (Domain Model):** `ProductAvailabilityStatusResult`.
- **Persisted Aggregates:** `Product`, `Operation`, `AuditLog`.
- **Generated Events:** `ProductOutOfStockEvent` o `ProductAvailabilityRestoredEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_AVAILABILITY_STATUS_CHANGE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 17. Validate Product Sku

### Description
Comprueba formato y unicidad global del SKU de producto y SKU de variante.

### Responsibility
Impedir colisiones que rompan pedidos, inventario o trazabilidad.

### Input
- **Primary Input (Domain Model):** `SkuValidationContext` con `Product` o `ProductVariant`.
- **Secondary Input (Value Objects):** `Sku`, `ProductCategory`.
- **Domain Constraints:** SKU no vacío, estable y globalmente único.

### Processing & Validations
1. Validar formato. 2. Consultar unicidad. 3. Comparar propietario. 4. Devolver decisión.

### Persistence & Output
- **Output (Domain Model):** `SkuValidationResult`.
- **Persisted Aggregates:** ninguno salvo cambio aprobado y auditado.
- **Generated Events:** `ProductSkuValidatedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_SKU_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 18. Validate Product Variant Matrix

### Description
Verifica que las combinaciones de atributos y valores formen una matriz navegable y no redundante.

### Responsibility
Evitar variantes imposibles, repetidas o incompatibles con el producto base.

### Input
- **Primary Input (Domain Model):** `VariantMatrixContext` con `Product` y variantes.
- **Secondary Input (Value Objects):** `ProductPrice`, `ProductCategory`.
- **Domain Constraints:** combinaciones únicas, precios compatibles y atributos permitidos.

### Processing & Validations
1. Agrupar atributos. 2. Detectar duplicados. 3. Validar precios. 4. Informar huecos o conflictos.

### Persistence & Output
- **Output (Domain Model):** `VariantMatrixValidationResult`.
- **Persisted Aggregates:** ninguno; cambios se aplican por Manage Product Variants.
- **Generated Events:** `ProductVariantMatrixValidatedEvent`.

### Operation & Audit
- **Operation Type:** `PRODUCT_VARIANT_MATRIX_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 19. Generate Catalog Snapshot

### Description
Genera una instantánea coherente de producto, precio, variantes y estado para búsqueda o checkout.

### Responsibility
Proporcionar una representación reproducible sin sustituir el precio histórico de una orden.

### Input
- **Primary Input (Domain Model):** `CatalogSnapshotContext` con `Product` y criterios de audiencia.
- **Secondary Input (Value Objects):** `ProductPrice`, `Currency`, `ProductStatus`.
- **Domain Constraints:** solo datos publicados y versión identificada.

### Processing & Validations
1. Cargar versión. 2. Filtrar datos no visibles. 3. Incluir variantes válidas. 4. Sellar snapshot.

### Persistence & Output
- **Output (Domain Model):** `CatalogSnapshot`.
- **Persisted Aggregates:** snapshot versionado y `Operation`.
- **Generated Events:** `CatalogSnapshotGeneratedEvent`.

### Operation & Audit
- **Operation Type:** `CATALOG_SNAPSHOT_GENERATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog + Operation`

## 20. Audit Catalog Operations

### Description
Construye una timeline de publicaciones, cambios, suspensiones, precios, variantes y rollbacks.

### Responsibility
Permitir reconstruir decisiones y estado del catálogo.

### Input
- **Primary Input (Domain Model):** `CatalogAuditQuery` con producto, Seller y periodo.
- **Secondary Input (Value Objects):** `OperationType`, `AuditSeverity`, `ProductStatus`.
- **Domain Constraints:** fuentes append-only y sin datos prohibidos.

### Processing & Validations
1. Autorizar consulta. 2. Leer operaciones. 3. Ordenar por versión y fecha. 4. Clasificar cambios.

### Persistence & Output
- **Output (Domain Model):** `CatalogOperationTimeline`.
- **Persisted Aggregates:** ninguno; consulta auditable.
- **Generated Events:** `CatalogOperationsAuditedEvent`.

### Operation & Audit
- **Operation Type:** `CATALOG_OPERATION_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog + Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### ProductRepositoryPort
```text
interface ProductRepositoryPort {
    Product save(Product product)
    Optional<Product> findByIdentifier(Product product)
    Optional<Product> findBySku(Sku sku)
    List<Product> search(ProductCriteria criteria)
    List<Product> findBySeller(Seller seller)
}
```

#### ProductVariantRepositoryPort
```text
interface ProductVariantRepositoryPort {
    ProductVariant save(ProductVariant variant)
    Optional<ProductVariant> findByIdentifier(ProductVariant variant)
    List<ProductVariant> findByProduct(Product product)
    boolean existsDuplicateVariant(ProductVariant variant)
}
```

#### ProductVersionRepositoryPort
```text
interface ProductVersionRepositoryPort {
    ProductVersion append(ProductVersion version)
    Optional<ProductVersion> find(Product product, VersionNumber version)
    List<ProductVersion> findByProduct(Product product)
}
```

#### OperationRepositoryPort
```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByProduct(Product product, OperationQuery query)
}
```

#### AuditLogRepositoryPort
```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByProduct(Product product, AuditQuery query)
}
```

### External Service Contracts

#### SellerEligibilityPort
```text
interface SellerEligibilityPort {
    SellerPublicationEligibility evaluate(ProductPublicationEligibilityContext context)
}
```

#### InventoryAvailabilityPort
```text
interface InventoryAvailabilityPort {
    ProductAvailability collect(ProductAvailabilityContext context)
}
```

#### CatalogPolicyPort
```text
interface CatalogPolicyPort {
    CatalogPolicy resolve(ProductCategory category)
    CatalogComplianceResult validate(CatalogComplianceContext context)
}
```

#### SearchIndexPort
```text
interface SearchIndexPort {
    CatalogSearchResult search(CatalogSearchContext context)
    void publish(CatalogSnapshot snapshot)
    void remove(Product product)
}
```

#### CompetitivePricingPort
```text
interface CompetitivePricingPort {
    CompetitiveMarketEvidence collect(CompetitivePricingContext context)
}
```

#### AuthorizationPort
```text
interface AuthorizationPort {
    AuthorizationDecision authorize(CatalogOperationContext context)
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
interface CreateProductUseCase {
    ProductCreationResult execute(ProductCreationContext context)
}
interface PublishProductUseCase {
    ProductPublicationResult execute(PublishProductContext context)
}
interface ManageProductVariantsUseCase {
    ProductVariantResult execute(ProductVariantContext context)
}
interface ValidateCatalogComplianceUseCase {
    CatalogComplianceResult execute(CatalogComplianceContext context)
}
interface VersionProductUseCase {
    ProductVersionResult execute(ProductVersionContext context)
}
interface RollbackProductVersionUseCase {
    ProductRollbackResult execute(ProductRollbackContext context)
}
interface SearchCatalogUseCase {
    CatalogSearchResult execute(CatalogSearchContext context)
}
interface AnalyzeCompetitivePricingUseCase {
    CompetitivePricingAnalysis execute(CompetitivePricingContext context)
}
```

### Ejemplos de invocación

```text
const publication = await publishProductUseCase.execute({
    product: product,
    seller: verifiedSeller,
    store: activeStore,
    catalogPolicy: categoryPolicy
})
```

```text
const analysis = await analyzeCompetitivePricingUseCase.execute({
    product: publishedProduct,
    market: authorizedMarket,
    period: AnalysisPeriod.currentMonth(),
    currency: Currency.USD
})
```

Los adaptadores convierten comandos externos en contextos de dominio; no entregan strings de estado, DTOs ni entidades ORM a los servicios.

## 7. Data Flow Diagram

```text
[Input Adapter] -> [Catalog Use Case] -> [Product Domain Service]
                                      |-> Product / Variant Repository
                                      |-> Seller Eligibility / Policy Ports
                                      |-> Inventory Availability Port
                                      |-> Search / Competitive Pricing Ports
                                      |-> Operation + AuditLog Ports
                                      v
                              [Product Result / Event]
                                      v
                         Cart, Order, Inventory, Billing, Admin
```

Catalog decide la validez de la oferta. Inventory decide stock, Seller decide verificación y Order conserva precios históricos.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Product.productId` debe ser único y estable.
2. `Product.sku` debe ser globalmente único.
3. Cada producto debe pertenecer a un Seller válido.
4. Un Seller no verificado no puede publicar.
5. `ProductCategory` debe provenir del catálogo controlado.
6. `ProductStatus` debe provenir del catálogo controlado.
7. `ProductPrice` debe contener moneda soportada.
8. El precio base debe ser compatible con el tipo de producto.
9. Cada variante debe referenciar su Product padre.
10. Las combinaciones de variantes no pueden duplicarse.

### Transactional Constraints

11. Crear producto y su operación inicial debe ser atómico.
12. Publicar debe validar Seller, Store, SKU, precio, variantes y compliance.
13. Actualizaciones críticas deben usar control de versión.
14. Cambiar precio no debe modificar precios históricos de órdenes.
15. Rollback crea una nueva versión, no borra versiones existentes.
16. Un timeout de política o búsqueda no habilita publicación.
17. Reintentos idempotentes no duplican productos ni variantes.
18. Eventos se publican después de confirmar Product.
19. Cambios de disponibilidad deben originarse en evidencia de Inventory.
20. Suspender un producto no elimina sus referencias históricas.

### Authorization & Access Constraints

21. Solo Seller propietario o actor autorizado puede cambiar su producto.
22. Solo actores con permiso de catálogo pueden publicar o suspender.
23. Un supervisor puede consultar, pero no cambiar estados críticos.
24. Un vendedor no puede cambiar la verificación del Seller desde Catalog.
25. La búsqueda pública solo devuelve productos visibles y elegibles.
26. El análisis competitivo usa fuentes autorizadas y no expone datos privados.
27. La política de categoría debe estar versionada y ser aplicable al producto.
28. El rollback requiere autorización y revalidación.
29. La disponibilidad no puede ser presentada como garantía de reserva.
30. Las vistas deben ocultar datos internos del vendedor cuando no sean necesarios.

### Persistence & State Constraints

31. `AuditLog` es inmutable y append-only.
32. `Operation` conserva actor, tipo, entidad y tiempo.
33. El ciclo de Product no puede saltar transiciones inválidas.
34. `INACTIVE` no se restaura por actualización ordinaria sin autorización.
35. `SUSPENDED` requiere causa y revisión.
36. `OUT_OF_STOCK` solo se establece con evidencia de disponibilidad.
37. ProductVersion es inmutable después de crearla.
38. Repositorios reciben modelos y value objects, no DTOs ni ORM.
39. Timestamps proceden de `ClockPort`.
40. Adaptadores no filtran SQL, HTTP ni detalles de índices al dominio.

### Cross-Aggregate Constraints

41. Catalog no modifica Seller, Inventory, Cart, Order, Payment o Billing.
42. La verificación del vendedor es fuente de verdad de Vendor Services.
43. El stock es fuente de verdad de Inventory Services.
44. El precio confirmado es fuente histórica de Order Services.
45. Un evento de suspensión debe llegar a búsqueda y carrito según sus políticas.
46. La publicación no reserva inventario.
47. El SKU debe ser reutilizado por Inventory y Order mediante el mismo concepto de dominio.
48. Cambios de categoría pueden exigir reverificación de compliance.

### Audit, Performance & Business Rules

49. Publicación, suspensión, rollback y cambios de precio generan auditoría crítica o alta.
50. La auditoría no contiene credenciales, secretos, documentos completos ni datos privados innecesarios.
