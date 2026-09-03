# Prompt: Generador de Archivos de Servicios de Dominio - NexusMarket

## Contexto General

Eres un arquitecto de software especializado en Domain-Driven Design (DDD) y arquitectura en capas. Tu tarea es generar documentación profesional para cada subdomain de NexusMarket siguiendo una estructura coherente, innovadora y altamente especializada.

**Repositorio referencia:** SimonMetaute/proyecto_sai
**Dominio:** NexusMarket (Marketplace Digital)
**Patrón:** Domain-Driven Design con Architecture Hexagonal

---

## Instrucciones Generales

### 1. Contexto y Alineación

Todos los archivos DEBEN:
- Alinearse con el **Domain_model.md** existente (entidades, value objects, ciclos de vida)
- Respetar las relaciones y restricciones definidas en la sección 6 (Domain Design Rules)
- Mantener coherencia con la estructura de servicios definida en **Domain_services.md**
- Usar nomenclatura consistente: verbos imperativos en inglés (Register, Authorize, Create, etc.)

### 2. Estructura Obligatoria de Cada Archivo

Cada archivo de servicio (`{nombre}-services.md`) DEBE contener:

```
1. HEADER & CONTEXT
   └─ Título del subdomain
   └─ Propósito del documento
   └─ Introducción (max 150 palabras)
   └─ Responsabilidades principales (lista de 5-8 puntos)
   └─ Relación con Domain Model (qué entidades maneja)

2. DESIGN PRINCIPLES
   └─ Principio 1: Recibir Domain Models, NO primitivos
      └─ Ejemplo incorrecto (código pseudocódigo)
      └─ Ejemplo correcto (código pseudocódigo)
   └─ Principio 2: Validación de datos externos
   └─ Principio 3: Inmutabilidad de Value Objects
   └─ Principio 4: Traceabilidad operacional
   └─ Principio 5: Transaccionalidad y consistencia

3. DOMAIN MODEL CONTEXT
   └─ Entidades principales involucradas
   └─ Value Objects utilizados
   └─ Aggregates y boundaries
   └─ Ciclos de vida relevantes (diagrama ASCII)

4. NUMBERED SERVICES (15-25 servicios por archivo)
   └─ Cada servicio con estructura uniforme:

5. OUTPUT PORTS (Repositories & Interfaces)
   └─ Repository interfaces
   └─ External service contracts

6. INPUT PORTS (Use Cases)
   └─ Interfaces públicas del servicio
   └─ Ejemplos de invocación

7. DATA FLOW DIAGRAM
   └─ Diagrama ASCII mostrando interacción

8. ARCHITECTURAL CONSTRAINTS
   └─ 30-50 restricciones obligatorias numeradas
   └─ Justificación de cada restricción
```

---

## Estructura Detallada de Cada Servicio

### Template por Servicio

```markdown
## N. [NOMBRE DEL SERVICIO]

### Description
[Descripción en 2-3 líneas del propósito del servicio]

### Responsibility
[Una frase que indique qué parte del dominio es responsable de ejecutar]

### Input
- **Primary Input (Domain Model):** [Entidad o Aggregate + Atributos clave]
- **Secondary Input (Value Objects):** [Si aplica]
- **Domain Constraints:** [Qué se valida antes de procesar]

### Processing & Validations
1. [Validación 1]
2. [Validación 2]
3. [Procesamiento principal]
4. [Operación secundaria, si aplica]

### Persistence & Output
- **Output (Domain Model):** [Qué se retorna]
- **Persisted Aggregates:** [Qué se guarda en repositorio]
- **Generated Events:** [Eventos de dominio generados]

### Operation & Audit
- **Operation Type:** [Ej. PRODUCT_PUBLICATION]
- **Audit Severity:** [CRITICAL, HIGH, MEDIUM]
- **Tracked By:** AuditLog + Operation
```

---

## Especificaciones por Archivo de Servicio

### A) user-services.md
**Servicios totales:** 20

**Temáticas:**
1. Registro y autenticación (5-6 servicios)
2. Gestión de identidad y roles (5-6 servicios)
3. Validación y acceso (4-5 servicios)
4. Consultas y estado (4-5 servicios)

**Entidades clave:** User, IdentityDocument, UserStatus
**Value Objects:** IdentityDocument, Currency
**Aggregates:** User (Buyer, Seller, Administrator as sub-roots)

**Innovación esperada:**
- Incluir servicio de "Auditar acceso de usuario" con timeline
- Agregar "Validar elegibilidad para operación específica" con contexto de roles
- Incluir "Gestionar consentimiento y privacidad de datos"

---

### B) customer-services.md
**Servicios totales:** 15

**Temáticas:**
1. Consultas de perfil y preferencias (4-5 servicios)
2. Gestión de direcciones de entrega (4-5 servicios)
3. Restricciones y privacidad (3-4 servicios)
4. Métodos de pago y validación (3-4 servicios)

**Entidades clave:** Buyer, DeliveryAddress, PaymentMethod
**Value Objects:** DeliveryAddress, PaymentMethod, Currency
**Aggregates:** Buyer (root)

**Innovación esperada:**
- Servicio de "Perfil de confianza del comprador" basado en comportamiento
- Gestión de preferencias de privacidad por datos sensibles
- Validación de direcciones contra servicios externos (USPS, DHL, etc.)

---

### C) vendor-services.md
**Servicios totales:** 18

**Temáticas:**
1. Registro y verificación de vendedor (4-5 servicios)
2. Gestión de perfil comercial (4-5 servicios)
3. Cuentas bancarias y settlement (5-6 servicios)
4. Cumplimiento y auditoría (3-4 servicios)

**Entidades clave:** Seller, Store, CommercialAccount, VerificationStatus
**Value Objects:** Currency, IdentityDocument
**Aggregates:** Seller (root), Store (sub-root)

**Innovación esperada:**
- Incluir validación de documentos comerciales con OCR o servicios externos
- Servicio de "Simulación de comisiones y settlement" antes de operación real
- Rastreo de cambios de perfil con versionado

---

### D) catalog-services.md
**Servicios totales:** 20

**Temáticas:**
1. Publicación y gestión de productos (5-6 servicios)
2. Variantes y atributos (4-5 servicios)
3. Categorización y cumplimiento (4-5 servicios)
4. Búsqueda y disponibilidad (4-5 servicios)

**Entidades clave:** Product, ProductVariant, ProductCategory, ProductStatus
**Value Objects:** ProductPrice, Currency
**Aggregates:** Product (root)

**Innovación esperada:**
- Servicio de "Validar conformidad de producto contra estándares de categoría"
- Sistema de versionado de producto con rollback
- Análisis de competencia (precio comparativo, posicionamiento)

---

### E) inventory-services.md
**Servicios totales:** 22

**Temáticas:**
1. Gestión de almacenes (4-5 servicios)
2. Movimientos de inventario (5-7 servicios)
3. Reservas y disponibilidad (5-6 servicios)
4. Validación y ajustes (4-5 servicios)

**Entidades clave:** Warehouse, Inventory, WarehouseLocation, ProductStock
**Value Objects:** WarehouseLocation
**Aggregates:** Warehouse (root), Inventory (root)

**Innovación esperada:**
- Servicio de "Predicción de disponibilidad" basado en movimientos históricos
- Sistema de rebalanceo automático de inventario entre almacenes
- Detección de discrepancias y alertas automáticas

---

### F) cart-services.md
**Servicios totales:** 16

**Temáticas:**
1. Operaciones de carrito (5-6 servicios)
2. Validación de condiciones (4-5 servicios)
3. Merge y persistencia (3-4 servicios)
4. Conversión a orden (3-4 servicios)

**Entidades clave:** ShoppingCart, CartLine, Product
**Value Objects:** Currency, ProductPrice
**Aggregates:** ShoppingCart (root)

**Innovación esperada:**
- Sugerencia de productos relacionados durante añadir al carrito
- Validación de cambios de precio en tiempo real
- Recuperación de carrito abandonado con opción de descuento

---

### G) order-services.md
**Servicios totales:** 24

**Temáticas:**
1. Creación y confirmación de órdenes (5-6 servicios)
2. Seguimiento y cambios (4-5 servicios)
3. Líneas de orden y productos (4-5 servicios)
4. Preparación y envío (5-6 servicios)
5. Cierre y archiving (3-4 servicios)

**Entidades clave:** Order, OrderLine, OrderStatus
**Value Objects:** Currency, ProductPrice
**Aggregates:** Order (root)

**Innovación esperada:**
- Sincronización automática de cambios de precio antes de confirmación
- Optimización de agrupamiento de líneas por seller/warehouse
- Predicción de fecha de entrega basada en historial

---

### H) billing-services.md
**Servicios totales:** 21

**Temáticas:**
1. Generación de facturas (3-4 servicios)
2. Autorización y captura de pagos (5-6 servicios)
3. Comisiones y deductions (4-5 servicios)
4. Settlement de vendedor (4-5 servicios)
5. Gestión de reembolsos (4-5 servicios)

**Entidades clave:** Invoice, Payment, CommercialAccount
**Value Objects:** Currency, ProductPrice, Tax
**Aggregates:** Invoice (root), Payment (root)

**Innovación esperada:**
- Cálculo dinámico de impuestos según jurisdicción del comprador
- Sistema de débito automático para comisiones
- Previsualización de settlement antes de procesamiento
- Gestión de múltiples métodos de pago simultáneamente

---

### I) logistics-services.md
**Servicios totales:** 19

**Temáticas:**
1. Creación y preparación de envíos (4-5 servicios)
2. Selección de carrier y costos (4-5 servicios)
3. Seguimiento y trazabilidad (4-5 servicios)
4. Manejo de excepciones (4-5 servicios)

**Entidades clave:** Shipment, Carrier, DeliveryAddress, ShipmentStatus
**Value Objects:** WarehouseLocation, DeliveryAddress
**Aggregates:** Shipment (root)

**Innovación esperada:**
- Integración multi-carrier con fallback automático
- Optimización de rutas de envío
- Predicción de entrega y alertas proactivas
- Gestión automática de excepciones comunes

---

### J) post-sale-services.md
**Servicios totales:** 18

**Temáticas:**
1. Solicitud y evaluación de devoluciones (4-5 servicios)
2. Aprobación y rechazo (3-4 servicios)
3. Gestión de disputas (4-5 servicios)
4. Reembolsos y cierre (4-5 servicios)

**Entidades clave:** Return, Claim, DisputeResolution, Payment
**Value Objects:** Currency
**Aggregates:** Return (root)

**Innovación esperada:**
- Sistema de resolución automática para devoluciones simples
- Análisis de patrones de fraude en devoluciones
- Mediación automática en disputas usando reglas de negocio
- Seguimiento de satisfacción post-resolución

---

### K) administration-services.md
**Servicios totales:** 16

**Temáticas:**
1. Reportería y consolidación de datos (4-5 servicios)
2. Monitoreo y dashboards (4-5 servicios)
3. Auditoría y trazabilidad (3-4 servicios)
4. Análisis de riesgo (3-4 servicios)

**Entidades clave:** AuditLog, Operation, User, Report
**Value Objects:** N/A (mayormente lectura)
**Aggregates:** AuditLog (root), Operation (root)

**Innovación esperada:**
- Generación automática de alertas basada en anomalías
- Dashboard en tiempo real con métricas KPI
- Exportación de reportes en múltiples formatos (PDF, Excel, JSON)
- Análisis predictivo de tendencias

---

## Requisitos de Calidad para Cada Archivo

### 1. Coherencia Interna
- ✅ Nombres de servicios siguen patrón: [Verbo + Sustantivo]
- ✅ Cada servicio referencia entidades del Domain Model
- ✅ Ciclos de vida respetan transiciones válidas
- ✅ No hay duplicación de responsabilidades

### 2. Alineación con Domain Model
- ✅ Cada Input es un Domain Model válido (jamás primitivos)
- ✅ Cada Output es un Domain Model o Value Object
- ✅ Se respetan las restricciones del apartado 6 (Domain Design Rules)
- ✅ Se menciona qué tipo de Operation y AuditLog se genera

### 3. Innovación y Valor
- ✅ Al menos 2-3 servicios innovadores por archivo (no solo básicos CRUD)
- ✅ Incluir servicios de validación, predicción o análisis
- ✅ Agregar servicios que cruzen límites de agregados de forma elegante
- ✅ Incluir manejo de excepciones y casos edge

### 4. Profesionalismo
- ✅ Lenguaje técnico consistente
- ✅ Diagramas ASCII limpios y claros
- ✅ Ejemplos de código en pseudocódigo (no lenguaje específico)
- ✅ Referencias cruzadas entre servicios cuando aplique

---

## Estructura de Restricciones Arquitectónicas

Cada archivo DEBE terminar con una sección de restricciones numeradas (30-50 según el alcance):

```markdown
## Architectural Constraints & Rules

### Data Integrity Constraints
1. [Restricción sobre integridad de datos]
2. [Restricción sobre validación]
...

### Transactional Constraints
10. [Restricción sobre transacciones]
...

### Authorization & Access Constraints
20. [Restricción sobre permisos]
...

### Persistence & State Constraints
25. [Restricción sobre persistencia]
...

### Cross-Aggregate Constraints
30. [Restricción entre agregados]
...

### Audit & Compliance Constraints
35. [Restricción de auditoría]
...

### Performance & Scalability Constraints
40. [Restricción de rendimiento]
...

### Backwards Compatibility Constraints
45. [Restricción de compatibilidad]
...

### Special Business Rules
50. [Reglas específicas del negocio]
```

---

## Plantilla para Output Ports

```markdown
## Output Ports

### Repository Interfaces

#### [EntityName]Repository
```
interface [EntityName]Repository {
    save(entity: [EntityName]): Promise<void>
    findById(id: UUID): Promise<[EntityName] | null>
    findBy(criteria: [SearchCriteria]): Promise<[EntityName][]>
    delete(id: UUID): Promise<void>
    exists(id: UUID): Promise<boolean>
}
```

### External Service Contracts

#### [ServiceName]Port
```
interface [ServiceName]Port {
    [method1](input: [Type]): Promise<[Type]>
    [method2](input: [Type]): Promise<[Type]>
}
```
```

---

## Plantilla para Input Ports

```markdown
## Input Ports

### Use Cases & Public Interfaces

#### [UseCaseName]UseCase
```
interface [UseCaseName]UseCase {
    execute(request: [RequestDTO]): Promise<[ResponseDTO]>
}

// Example invocation:
const response = await useCaseInstance.execute({
    // populate with domain models
});
```
```

---

## Convenciones de Nomenclatura

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Archivo | `{nombre}-services.md` | `user-services.md` |
| Servicio | Verbo + Sustantivo | `RegisterUser`, `AuthorizePayment` |
| Input | `[EntityName] + Context` | `CreateProductRequest` |
| Output | `[EntityName] + Result` | `ProductPublicationResult` |
| Repository | `[EntityName]Repository` | `UserRepository`, `OrderRepository` |
| Exception | `[BusinessConcept]Exception` | `InsufficientStockException` |
| Event | `[EntityName][Action]Event` | `OrderConfirmedEvent` |

---

## Checklist de Generación

Para CADA archivo de servicio generado:

- [ ] ¿Tiene encabezado con contexto claro?
- [ ] ¿Incluye 5 principios de diseño con ejemplos?
- [ ] ¿Describe el contexto del Domain Model?
- [ ] ¿Tiene 15-25 servicios numerados?
- [ ] ¿Cada servicio tiene estructura uniforme?
- [ ] ¿Todos los inputs son Domain Models (no primitivos)?
- [ ] ¿Incluye Output Ports (Repositories)?
- [ ] ¿Incluye Input Ports (Use Cases)?
- [ ] ¿Tiene diagrama ASCII de flujo?
- [ ] ¿Incluye 30+ restricciones arquitectónicas?
- [ ] ¿Hay al menos 2-3 servicios innovadores?
- [ ] ¿Se respetan los ciclos de vida del Domain Model?
- [ ] ¿Se especifica operationType para auditoría?
- [ ] ¿Hay referencias cruzadas a otros servicios?
- [ ] ¿El lenguaje es consistente y profesional?

---

## Cómo Usar Este Prompt

### Paso 1: Solicitar Generación
```
Genera el archivo {nombre}-services.md siguiendo este prompt.
Contexto: [opcional, información adicional específica]
Innovaciones esperadas: [opcional, ideas específicas]
```

### Paso 2: Especificar Detalles
Si necesitas ajustes:
```
Para el archivo {nombre}-services.md:
- Añade un servicio sobre [tema específico]
- Incrementa restricciones de [categoría] a [número]
- Incluye ejemplo de integración con [servicio externo]
```

### Paso 3: Validar y Refinar
```
Revisa el archivo generado contra:
- Alineación con Domain Model
- Coherencia de nomenclatura
- Calidad de ejemplos
- Completitud de restricciones
```

---

## Referencias Externas

**Debe hacer referencia a:**
- `/SDD/Domain/Domain_model.md` - Para entidades y relaciones
- `/SDD/Domain/Services/Domain_services.md` - Para descripción de servicios de alto nivel
- `/SDD/Domain/Services/` - Para otros archivos de servicios generados

---

## Notas Finales

- **Lenguaje:** Español para descripciones, pseudocódigo en inglés
- **Rigor:** DDD-first, sin compromiso con frameworks específicos
- **Consistencia:** Todos los archivos DEBEN seguir esta estructura
- **Evolución:** Este prompt puede refinarse tras generar los primeros archivos
- **Validación:** Cada archivo debe ser revisado contra Domain Model antes de finalizar

---

**Última actualización:** 2026-09-03
**Versión:** 1.0
**Autor:** Prompt de Generación de Servicios de Dominio

