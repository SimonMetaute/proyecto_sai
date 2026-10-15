# Customer Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio para la gestión del comprador en NexusMarket. Describe consultas de perfil, preferencias, direcciones de entrega, privacidad, confianza y métodos de pago, manteniendo al agregado `Buyer` consistente y coordinando con `User`, `Order`, `ShoppingCart` y `Payment` mediante puertos.

### Introducción

El subdominio Customer Management administra las capacidades propias del comprador sin absorber responsabilidades de identidad, órdenes, facturación o logística. `Buyer` es el agregado raíz que mantiene direcciones, métodos de pago, nivel de confianza y referencias de historial. Las direcciones y métodos de pago son value objects inmutables: una modificación crea una nueva versión validada. Los servicios comprueban que el usuario esté activo, que los datos sensibles se expongan solo con autorización y que todo cambio relevante sea auditable. La validación contra proveedores externos se traduce a decisiones de dominio, mientras que la persistencia y las integraciones permanecen detrás de output ports.

### Responsabilidades principales

- Consultar y actualizar el perfil propio del comprador.
- Administrar direcciones de entrega y su dirección primaria.
- Validar direcciones mediante servicios externos.
- Administrar métodos de pago habilitados sin almacenar secretos.
- Gestionar preferencias comerciales y de privacidad.
- Calcular un perfil de confianza basado en comportamiento verificable.
- Validar la capacidad del comprador para iniciar una compra.
- Proteger la visibilidad de datos frente a otros actores.

### Relación con Domain Model

El agregado principal es `Buyer`, relacionado con `User` mediante `userId`. Se utilizan `DeliveryAddress`, `PaymentMethod`, `Currency`, `BuyerTrustLevel`, `UserStatus` y `UserRole`. `Order`, `ShoppingCart` y `Payment` son agregados externos consultados mediante puertos. `Operation` y `AuditLog` registran operaciones críticas, sin almacenar datos completos de tarjeta, credenciales ni información innecesaria.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
addAddress(UUID buyerId, String street, String city, String country)
```

Correcto:
```text
addDeliveryAddress(AddDeliveryAddressContext context)
// context.buyer and context.address are domain models/value objects
```

Los adaptadores convierten DTOs y parámetros externos en contextos de dominio antes de invocar el servicio.

### Principio 2: Validación de datos externos

Una dirección, método de pago, indicador de confianza o historial recibido desde un proveedor se considera no confiable hasta ser validado y traducido por un puerto. Un timeout o respuesta ambigua no habilita una compra.

### Principio 3: Inmutabilidad de Value Objects

`DeliveryAddress`, `PaymentMethod`, `Currency` y `BuyerTrustLevel` no se modifican en sitio. Las operaciones de actualización reemplazan el valor por una instancia validada y conservan la versión anterior cuando exista una obligación de trazabilidad.

### Principio 4: Traceabilidad operacional

Los cambios de perfil, dirección primaria, métodos de pago, privacidad, confianza y restricciones producen `Operation` y, según su impacto, `AuditLog`. Los detalles se minimizan y nunca incluyen secretos financieros.

### Principio 5: Transaccionalidad y consistencia

Cada cambio del agregado `Buyer` se confirma con sus invariantes en una operación atómica. La coordinación con `Order`, `ShoppingCart` o `Payment` se realiza por puertos y eventos, respetando los límites de los agregados.

## 3. Domain Model Context

### Entidades principales involucradas

- **Buyer:** raíz del agregado; contiene `buyerId`, `userId`, direcciones, métodos de pago, confianza e historial.
- **User:** identidad y estado de acceso del propietario del perfil.
- **Order:** historial de compras consultado para soporte, confianza y capacidad.
- **ShoppingCart:** contexto de compra que requiere comprador activo y condiciones válidas.
- **Payment:** referencia de métodos habilitados y resultados de pago, sin exponer secretos.
- **Operation / AuditLog:** trazabilidad de cambios y consultas sensibles.

### Value Objects utilizados

- `DeliveryAddress`: dirección completa y estructurada de entrega.
- `PaymentMethod`: método habilitado y referencia tokenizada, nunca credencial cruda.
- `Currency`: moneda soportada para límites, preferencias y contexto comercial.
- `BuyerTrustLevel`: `LOW`, `STANDARD`, `HIGH`, `REVIEW_REQUIRED`.
- `UserStatus` y `UserRole`: estado y alcance del propietario.

### Aggregates y boundaries

```text
User (Aggregate Root)
└── userId ────────────────┐
                            v
Buyer (Aggregate Root) <--- userId
├── DeliveryAddress[]
├── PaymentMethod[]
├── BuyerTrustLevel
└── PurchaseHistory references

Buyer --references--> ShoppingCart
Buyer --references--> Order[]
Buyer --coordinates--> Payment context
```

`Buyer` controla sus direcciones, métodos y preferencias. `User` controla identidad y estado. `Order`, `Payment` y `ShoppingCart` conservan sus propias invariantes; Customer Services solo solicita decisiones o lecturas mediante contratos de dominio.

### Ciclo de vida relevante

```text
Buyer profile
     |
     | User ACTIVE + profile created
     v
+----+------------------+
| OPERATIONAL          |
| addresses/payment    |
+----+------------------+
     | account restriction or review
     v
+----+------------------+
| RESTRICTED           |
| purchase unavailable |
+----+------------------+
     | restriction resolved
     +------------------> OPERATIONAL

DeliveryAddress: Draft --> Validated --> Primary / Secondary --> Archived
PaymentMethod:   PendingValidation --> Enabled --> Disabled
BuyerTrustLevel: LOW <--> STANDARD <--> HIGH
                         |
                         +----------> REVIEW_REQUIRED
```

Una dirección primaria debe estar validada antes de ser usada en una compra. Un método deshabilitado no puede autorizar pagos.

## 4. Numbered Services

## 1. Consult Buyer Information

### Description
Devuelve el perfil autorizado del comprador, sus capacidades comerciales y un resumen de preferencias sin revelar datos sensibles innecesarios.

### Responsibility
Aplicar autorización y minimización de datos sobre el agregado `Buyer`.

### Input
- **Primary Input (Domain Model):** `BuyerQueryContext` con actor y `Buyer` objetivo.
- **Secondary Input (Value Objects):** `UserRole`, `UserStatus`, `Currency`.
- **Domain Constraints:** actor autorizado; campos sensibles sujetos a propósito y consentimiento.

### Processing & Validations
1. Cargar `Buyer` y `User` relacionados.
2. Verificar estado activo y alcance del actor.
3. Aplicar la política de visibilidad.
4. Construir una vista de dominio sin secretos.

### Persistence & Output
- **Output (Domain Model):** `BuyerProfileView`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `BuyerProfileConsultedEvent` cuando la consulta sea sensible.

### Operation & Audit
- **Operation Type:** `BUYER_PROFILE_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog` + `Operation`

## 2. Update Buyer Profile

### Description
Actualiza los datos permitidos del perfil comprador conservando identidad, historial y referencias transaccionales.

### Responsibility
Mantener la consistencia del perfil comprador sin modificar el agregado `User` directamente.

### Input
- **Primary Input (Domain Model):** `UpdateBuyerProfileContext` con `Buyer` y cambios autorizados.
- **Secondary Input (Value Objects):** canales de contacto y preferencias validadas.
- **Domain Constraints:** propietario o actor autorizado; campos de identidad se gestionan en User Services.

### Processing & Validations
1. Verificar versión del `Buyer`.
2. Validar campos modificables y consentimiento.
3. Aplicar cambios como nuevos valores.
4. Guardar con control de concurrencia.

### Persistence & Output
- **Output (Domain Model):** `BuyerProfileUpdateResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog`.
- **Generated Events:** `BuyerProfileUpdatedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_PROFILE_UPDATE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 3. Manage Buyer Preferences

### Description
Gestiona preferencias de comunicación, moneda, recomendaciones y experiencia comercial sin alterar condiciones contractuales de una orden.

### Responsibility
Mantener preferencias explícitas y separadas de las invariantes transaccionales.

### Input
- **Primary Input (Domain Model):** `BuyerPreferencesContext` con `Buyer` y preferencias.
- **Secondary Input (Value Objects):** `Currency`, `NotificationChannel`, `ConsentPurpose`.
- **Domain Constraints:** preferencias válidas; no pueden conceder permisos ni cambiar órdenes cerradas.

### Processing & Validations
1. Validar catálogo de moneda y canales.
2. Comprobar consentimiento para comunicaciones.
3. Reemplazar preferencias inmutables.
4. Publicar cambios para consumidores autorizados.

### Persistence & Output
- **Output (Domain Model):** `BuyerPreferencesResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`.
- **Generated Events:** `BuyerPreferencesChangedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_PREFERENCES_CHANGE`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog` + `Operation`

## 4. Manage Delivery Address

### Description
Añade o actualiza una dirección de entrega del comprador mediante un value object completo y validado.

### Responsibility
Preservar direcciones estructuralmente válidas y asociadas al comprador correcto.

### Input
- **Primary Input (Domain Model):** `DeliveryAddressContext` con `Buyer` y `DeliveryAddress`.
- **Secondary Input (Value Objects):** `Country`, `PostalCode`, `AddressLabel`.
- **Domain Constraints:** dirección completa; propietario correcto; no duplicados semánticos.

### Processing & Validations
1. Validar campos y país soportado.
2. Normalizar mediante la fábrica de `DeliveryAddress`.
3. Comprobar límite de direcciones y duplicados.
4. Agregar o reemplazar el valor en `Buyer`.

### Persistence & Output
- **Output (Domain Model):** `DeliveryAddressResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog`.
- **Generated Events:** `DeliveryAddressAddedEvent` o `DeliveryAddressUpdatedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_ADDRESS_MANAGEMENT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 5. Set Primary Delivery Address

### Description
Marca una dirección validada como primaria para futuros procesos de compra.

### Responsibility
Garantizar que el comprador tenga como máximo una dirección primaria.

### Input
- **Primary Input (Domain Model):** `SetPrimaryAddressContext` con `Buyer` y dirección objetivo.
- **Secondary Input (Value Objects):** `DeliveryAddress`, `UserStatus`.
- **Domain Constraints:** dirección pertenece al comprador y está validada; comprador activo.

### Processing & Validations
1. Localizar la dirección por el modelo de dominio.
2. Rechazar direcciones no validadas o archivadas.
3. Retirar la marca primaria anterior.
4. Marcar la nueva dirección en una transacción.

### Persistence & Output
- **Output (Domain Model):** `PrimaryAddressChangeResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog`.
- **Generated Events:** `PrimaryDeliveryAddressChangedEvent`.

### Operation & Audit
- **Operation Type:** `PRIMARY_ADDRESS_CHANGE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 6. Validate Delivery Address

### Description
Valida una dirección contra reglas internas y un proveedor externo de geocodificación o cobertura.

### Responsibility
Transformar una respuesta de validación externa en un estado de dirección utilizable.

### Input
- **Primary Input (Domain Model):** `AddressValidationContext` con `Buyer` y `DeliveryAddress`.
- **Secondary Input (Value Objects):** `Country`, `PostalCode`, `CarrierServiceArea`.
- **Domain Constraints:** proveedor confiable; resultado verificable; timeout no equivale a validación.

### Processing & Validations
1. Validar estructura local.
2. Consultar `AddressValidationPort`.
3. Comparar cobertura y dirección normalizada.
4. Guardar resultado y fecha de validación.

### Persistence & Output
- **Output (Domain Model):** `AddressValidationResult`.
- **Persisted Aggregates:** `Buyer` si cambia la dirección, más auditoría.
- **Generated Events:** `DeliveryAddressValidatedEvent` o `DeliveryAddressRejectedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_ADDRESS_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 7. Remove Delivery Address

### Description
Retira una dirección del conjunto utilizable sin romper órdenes o envíos históricos que ya la referencian.

### Responsibility
Evitar que se eliminen referencias históricas y garantizar una dirección primaria válida cuando sea necesaria.

### Input
- **Primary Input (Domain Model):** `RemoveAddressContext` con `Buyer` y `DeliveryAddress`.
- **Secondary Input (Value Objects):** `AddressStatus`, `OrderStatus`.
- **Domain Constraints:** dirección no debe ser necesaria para una orden activa; no eliminar la única primaria requerida.

### Processing & Validations
1. Verificar propiedad y estado de uso.
2. Consultar órdenes abiertas mediante `OrderQueryPort`.
3. Archivar el value object en lugar de borrar historial.
4. Reasignar primaria si la política lo permite.

### Persistence & Output
- **Output (Domain Model):** `AddressRemovalResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog`.
- **Generated Events:** `DeliveryAddressArchivedEvent`.

### Operation & Audit
- **Operation Type:** `DELIVERY_ADDRESS_ARCHIVAL`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 8. Add Payment Method

### Description
Asocia un método de pago tokenizado y habilitable al comprador tras cumplir la validación requerida.

### Responsibility
Mantener solo métodos de pago permitidos, tokenizados y vinculados al propietario correcto.

### Input
- **Primary Input (Domain Model):** `AddPaymentMethodContext` con `Buyer` y `PaymentMethod`.
- **Secondary Input (Value Objects):** `PaymentMethodType`, `Currency`.
- **Domain Constraints:** método tokenizado; proveedor compatible; no duplicado; no almacenar secretos.

### Processing & Validations
1. Validar tipo, moneda y token.
2. Consultar `PaymentMethodValidationPort`.
3. Rechazar duplicados o método no habilitable.
4. Agregar el value object al `Buyer`.

### Persistence & Output
- **Output (Domain Model):** `PaymentMethodResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog`.
- **Generated Events:** `PaymentMethodAddedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_PAYMENT_METHOD_ADD`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 9. Remove Payment Method

### Description
Deshabilita un método de pago del comprador sin alterar pagos históricos ni referencias de órdenes cerradas.

### Responsibility
Mantener la disponibilidad de métodos y evitar que una operación futura use un método revocado.

### Input
- **Primary Input (Domain Model):** `RemovePaymentMethodContext` con `Buyer` y método objetivo.
- **Secondary Input (Value Objects):** `PaymentMethod`, `PaymentStatus`.
- **Domain Constraints:** no borrar evidencia de pagos; no retirar un método en una autorización activa sin coordinación.

### Processing & Validations
1. Confirmar propiedad del método.
2. Consultar autorizaciones activas mediante `PaymentQueryPort`.
3. Marcar el método como deshabilitado.
4. Revocar tokens externos solo mediante el puerto.

### Persistence & Output
- **Output (Domain Model):** `PaymentMethodRemovalResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog`.
- **Generated Events:** `PaymentMethodDisabledEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_PAYMENT_METHOD_REMOVE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 10. Validate Payment Method

### Description
Comprueba que un método de pago pueda utilizarse para el contexto comercial y la moneda de una compra.

### Responsibility
Entregar una decisión de habilitación sin autorizar ni capturar un pago.

### Input
- **Primary Input (Domain Model):** `PaymentMethodValidationContext` con `Buyer`, método y contexto comercial.
- **Secondary Input (Value Objects):** `PaymentMethodType`, `Currency`.
- **Domain Constraints:** método habilitado; token vigente; moneda y región compatibles.

### Processing & Validations
1. Verificar que el método pertenece al comprador.
2. Consultar el proveedor mediante `PaymentMethodValidationPort`.
3. Comparar moneda, límites y restricciones.
4. Devolver una decisión con fecha de expiración.

### Persistence & Output
- **Output (Domain Model):** `PaymentMethodEligibility`.
- **Persisted Aggregates:** ninguno, salvo una marca de validación explícita.
- **Generated Events:** `PaymentMethodValidatedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_PAYMENT_METHOD_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 11. Set Default Payment Method

### Description
Selecciona el método de pago preferido para futuras compras, sin imponerlo sobre una orden ya confirmada.

### Responsibility
Garantizar un único método predeterminado y que esté habilitado.

### Input
- **Primary Input (Domain Model):** `SetDefaultPaymentMethodContext` con `Buyer` y método objetivo.
- **Secondary Input (Value Objects):** `PaymentMethod`, `PaymentMethodType`.
- **Domain Constraints:** método pertenece al comprador, está habilitado y no tiene validación expirada.

### Processing & Validations
1. Confirmar estado del método.
2. Retirar la marca predeterminada anterior.
3. Marcar el método nuevo atómicamente.
4. Publicar cambio para el flujo de checkout.

### Persistence & Output
- **Output (Domain Model):** `DefaultPaymentMethodResult`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog`.
- **Generated Events:** `DefaultPaymentMethodChangedEvent`.

### Operation & Audit
- **Operation Type:** `DEFAULT_PAYMENT_METHOD_CHANGE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 12. Assess Buyer Trust Profile

### Description
Calcula un nivel de confianza explicable a partir de pagos, órdenes entregadas, devoluciones y disputas verificadas.

### Responsibility
Producir una clasificación de confianza sin convertirla en una decisión opaca o irreversible.

### Input
- **Primary Input (Domain Model):** `BuyerTrustAssessmentContext` con `Buyer` y evidencia agregada.
- **Secondary Input (Value Objects):** `BuyerTrustLevel`, `OrderStatus`, `PaymentStatus`, `Currency`.
- **Domain Constraints:** solo eventos verificados; reglas versionadas; no usar atributos discriminatorios.

### Processing & Validations
1. Consultar historia mediante `BuyerBehaviorPort`.
2. Aplicar reglas de confianza versionadas.
3. Clasificar `LOW`, `STANDARD`, `HIGH` o `REVIEW_REQUIRED`.
4. Permitir revisión humana en casos de riesgo.

### Persistence & Output
- **Output (Domain Model):** `BuyerTrustAssessment`.
- **Persisted Aggregates:** `Buyer`, `Operation`, `AuditLog` cuando cambia el nivel.
- **Generated Events:** `BuyerTrustLevelChangedEvent` o `BuyerTrustReviewRequestedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_TRUST_ASSESSMENT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 13. Validate Buyer Purchase Capacity

### Description
Determina si el comprador puede iniciar una compra dadas su cuenta, confianza, dirección, métodos y restricciones vigentes.

### Responsibility
Entregar una decisión previa al checkout sin crear una orden ni reservar inventario.

### Input
- **Primary Input (Domain Model):** `PurchaseCapacityContext` con `Buyer`, carrito y contexto comercial.
- **Secondary Input (Value Objects):** `BuyerTrustLevel`, `DeliveryAddress`, `PaymentMethod`, `Currency`.
- **Domain Constraints:** comprador activo; dirección primaria validada; método habilitado; restricciones satisfechas.

### Processing & Validations
1. Verificar estado de `User` y `Buyer`.
2. Confirmar dirección primaria y método disponible.
3. Consultar límites o bloqueos mediante `PurchaseRestrictionPort`.
4. Devolver razones y requisitos pendientes.

### Persistence & Output
- **Output (Domain Model):** `PurchaseCapacityDecision`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `BuyerPurchaseCapacityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_PURCHASE_CAPACITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 14. Restrict Buyer Visibility

### Description
Calcula la vista de datos del comprador que puede recibir otro actor o subdominio según rol, propósito y consentimiento.

### Responsibility
Aplicar privacidad por finalidad y mínimo privilegio sobre datos personales y financieros.

### Input
- **Primary Input (Domain Model):** `BuyerVisibilityContext` con `Buyer`, actor y propósito.
- **Secondary Input (Value Objects):** `UserRole`, `ConsentPurpose`, `Currency`.
- **Domain Constraints:** actor autorizado; propósito declarado; ocultar métodos y dirección completa si no son necesarios.

### Processing & Validations
1. Validar rol y finalidad de acceso.
2. Consultar consentimientos vigentes.
3. Aplicar campos permitidos por política.
4. Crear una vista no mutable y auditable.

### Persistence & Output
- **Output (Domain Model):** `BuyerVisibilityDecision`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `BuyerVisibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_DATA_VISIBILITY_RESTRICTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 15. Export Buyer Privacy Data

### Description
Prepara una representación de los datos del comprador permitidos por la política de privacidad y el propósito de exportación.

### Responsibility
Entregar datos portables, minimizados y consistentes sin exponer secretos o información de terceros.

### Input
- **Primary Input (Domain Model):** `BuyerDataExportContext` con `Buyer`, solicitante y propósito legal.
- **Secondary Input (Value Objects):** `ConsentPurpose`, `Currency`, `UserStatus`.
- **Domain Constraints:** identidad del solicitante verificada; alcance definido; datos de pago tokenizados.

### Processing & Validations
1. Verificar autorización y alcance temporal.
2. Reunir datos desde repositorios mediante puertos.
3. Excluir secretos, credenciales y datos de terceros.
4. Generar exportación con versión y trazabilidad.

### Persistence & Output
- **Output (Domain Model):** `BuyerPrivacyExport`.
- **Persisted Aggregates:** `Operation`, `AuditLog`; el archivo se entrega mediante un puerto.
- **Generated Events:** `BuyerPrivacyExportRequestedEvent`.

### Operation & Audit
- **Operation Type:** `BUYER_PRIVACY_DATA_EXPORT`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### BuyerRepositoryPort

```text
interface BuyerRepositoryPort {
    Buyer save(Buyer buyer)
    Optional<Buyer> findByIdentifier(Buyer buyer)
    Optional<Buyer> findByUser(User user)
    List<Buyer> findByTrustLevel(BuyerTrustLevel trustLevel)
}
```

#### UserRepositoryPort

```text
interface UserRepositoryPort {
    Optional<User> findByIdentifier(User user)
    Optional<User> findByUserId(User user)
}
```

Este servicio no cambia identidad ni estado de `User`; esas decisiones pertenecen a User Services.

#### OrderQueryPort

```text
interface OrderQueryPort {
    OrderHistory findHistory(Buyer buyer, OrderHistoryQuery query)
    List<Order> findOpenOrdersForAddress(Buyer buyer, DeliveryAddress address)
}
```

#### PaymentQueryPort

```text
interface PaymentQueryPort {
    PaymentMethodUsage findActiveUsage(Buyer buyer, PaymentMethod method)
    PaymentHistory findHistory(Buyer buyer, PaymentHistoryQuery query)
}
```

#### OperationRepositoryPort

```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByBuyer(Buyer buyer, OperationQuery query)
}
```

#### AuditLogRepositoryPort

```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByBuyer(Buyer buyer, AuditQuery query)
}
```

Todos los puertos de auditoría son append-only y reciben modelos de dominio, no entidades de persistencia.

### External Service Contracts

#### AddressValidationPort

```text
interface AddressValidationPort {
    AddressValidationResult validate(DeliveryAddressContext context)
}
```

#### PaymentMethodValidationPort

```text
interface PaymentMethodValidationPort {
    PaymentMethodValidationResult validate(PaymentMethodValidationContext context)
    PaymentMethodRevocationResult revoke(PaymentMethod paymentMethod)
}
```

#### BuyerBehaviorPort

```text
interface BuyerBehaviorPort {
    BuyerBehaviorEvidence collect(Buyer buyer, TrustAssessmentPeriod period)
}
```

#### PurchaseRestrictionPort

```text
interface PurchaseRestrictionPort {
    PurchaseRestrictionDecision evaluate(PurchaseCapacityContext context)
}
```

#### PrivacyPolicyPort

```text
interface PrivacyPolicyPort {
    VisibilityPolicy resolve(BuyerVisibilityContext context)
    ExportPolicy resolveExportPolicy(BuyerDataExportContext context)
}
```

#### NotificationPort

```text
interface NotificationPort {
    NotificationReceipt notify(Buyer buyer, DomainNotification notification)
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
interface ConsultBuyerInformationUseCase {
    BuyerProfileView execute(BuyerQueryContext context)
}

interface ManageDeliveryAddressUseCase {
    DeliveryAddressResult execute(DeliveryAddressContext context)
}

interface ValidateDeliveryAddressUseCase {
    AddressValidationResult execute(AddressValidationContext context)
}

interface ManagePaymentMethodUseCase {
    PaymentMethodResult execute(AddPaymentMethodContext context)
}

interface ValidateBuyerPurchaseCapacityUseCase {
    PurchaseCapacityDecision execute(PurchaseCapacityContext context)
}

interface AssessBuyerTrustProfileUseCase {
    BuyerTrustAssessment execute(BuyerTrustAssessmentContext context)
}

interface RestrictBuyerVisibilityUseCase {
    BuyerVisibilityDecision execute(BuyerVisibilityContext context)
}
```

### Ejemplos de invocación

```text
const addressResult = await validateDeliveryAddressUseCase.execute({
    buyer: buyer,
    address: DeliveryAddress.from(addressData),
    deliveryContext: DeliveryContext.forMarketplaceOrder(),
    actor: buyerOwner
})
```

```text
const capacity = await validateBuyerPurchaseCapacityUseCase.execute({
    buyer: buyer,
    cart: shoppingCart,
    primaryAddress: buyer.primaryDeliveryAddress(),
    paymentMethod: buyer.defaultPaymentMethod(),
    currency: Currency.USD
})
```

```text
const view = await restrictBuyerVisibilityUseCase.execute({
    buyer: buyer,
    actor: seller,
    purpose: ConsentPurpose.ORDER_FULFILLMENT,
    requestedFields: BuyerFields.deliverySummary()
})
```

Los adaptadores de entrada traducen solicitudes externas a contextos de dominio. Los servicios de este subdominio no reciben DTOs, tokens HTTP ni identificadores primitivos como sustitutos de entidades.

## 7. Data Flow Diagram

```text
[Input Adapter]
       |
       v
[Customer Use Case / Input Port]
       |
       v
[Buyer Domain Service]
   |          |             |              |
   |          |             |              +--> [Privacy / Notification Port]
   |          |             +-----------------> [Address / Payment Provider]
   |          +-------------------------------> [Order / Payment Query Ports]
   +------------------------------------------> [BuyerRepositoryPort]
       |
       +--> [OperationRepositoryPort]
       +--> [AuditLogRepositoryPort]
       |
       v
[Buyer Result / Domain Event]
       |
       +--> Shopping Cart, Order, Billing and Logistics coordinators
```

Las respuestas de proveedores se validan antes de cambiar `Buyer`. La creación de una orden, autorización de pago y selección logística ocurren en sus respectivos subdominios; Customer Services solo proporciona decisiones y modelos autorizados.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `Buyer.buyerId` debe ser único y estable.
2. `Buyer.userId` debe referenciar un `User` existente.
3. Un comprador no puede tener dos direcciones primarias activas.
4. Una dirección primaria debe ser un `DeliveryAddress` validado.
5. Un comprador debe conservar al menos una dirección primaria cuando una compra lo requiera.
6. Cada `PaymentMethod` debe estar asociado a un único comprador.
7. Los métodos de pago se almacenan tokenizados y nunca con secretos crudos.
8. `Currency` solo puede usar códigos soportados por el catálogo de dominio.
9. `BuyerTrustLevel` solo puede usar valores del catálogo controlado.
10. El historial de órdenes cerradas se trata como inmutable desde este subdominio.

### Transactional Constraints

11. Cambiar la dirección primaria debe retirar la marca anterior y asignar la nueva en una sola transacción.
12. Cambiar el método predeterminado debe conservar como máximo una marca activa.
13. Agregar una dirección o método debe comprobar la versión del agregado contra concurrencia.
14. Un timeout de proveedor no constituye validación exitosa.
15. Las operaciones externas deben tener timeout, idempotencia y resultado explícito.
16. Los eventos se publican después de confirmar el agregado `Buyer`.
17. Un reintento con la misma referencia de operación no debe duplicar direcciones ni métodos.
18. La validación de capacidad no crea órdenes ni reservas como efecto lateral.
19. La evaluación de confianza no puede cambiar restricciones sin una decisión de política explícita.
20. La revocación de un método activo debe coordinar autorizaciones mediante `PaymentQueryPort`.

### Authorization & Privacy Constraints

21. Un comprador puede modificar únicamente su propio perfil y sus propios value objects.
22. Un administrador puede operar perfiles solo dentro de su alcance autorizado.
23. Un vendedor no puede consultar la dirección completa de un comprador sin propósito de cumplimiento.
24. Un supervisor puede consultar vistas permitidas, pero no cambiar métodos o direcciones.
25. Toda exposición de datos sensibles requiere actor, propósito y alcance.
26. Los datos de tarjeta, credenciales, tokens de sesión y códigos de validación nunca salen en una vista.
27. La exportación de privacidad debe excluir datos de terceros y secretos técnicos.
28. Revocar consentimiento limita usos futuros, pero no reescribe obligaciones de órdenes existentes.
29. Las preferencias no pueden conceder permisos ni alterar una política de autorización.
30. La decisión de visibilidad debe aplicar mínimo privilegio y minimización de datos.

### Persistence & Cross-Aggregate Constraints

31. `Buyer` no modifica directamente `User`, `Order`, `Payment` ni `ShoppingCart`.
32. Los puertos reciben modelos de dominio y value objects, no DTOs ni entidades ORM.
33. `AuditLog` y `Operation` son append-only para este subdominio.
34. Archivar una dirección no puede invalidar una dirección guardada en un envío histórico.
35. Retirar un método no puede borrar pagos históricos ni cambiar su resultado.
36. La validación de capacidad debe consultar stock, carrito y pago mediante sus propios contratos.
37. La confianza se calcula con evidencia de dominio verificada y reglas versionadas.
38. Las reparaciones de datos inconsistentes requieren reporte y decisión autorizada.
39. Las fechas de validación y expiración deben proceder de `ClockPort`.
40. Los adaptadores no pueden filtrar SQL, HTTP, claves de proveedor o detalles de infraestructura al dominio.

### Audit, Performance & Business Rules

41. Todo cambio de dirección primaria debe generar una operación auditable.
42. Todo alta, baja o cambio de método de pago debe generar auditoría de severidad alta o crítica.
43. Una evaluación de confianza debe registrar versión de reglas, evidencia resumida y decisión.
44. Los eventos de privacidad deben registrar propósito, actor y fecha sin incluir contenido sensible.
45. Las consultas de historial y exportación deben paginarse y no cargar colecciones ilimitadas.
46. La consulta de perfil debe evitar incluir métodos de pago o direcciones completas si no son necesarios.
47. Un comprador `REVIEW_REQUIRED` no debe considerarse automáticamente elegible para compras restringidas.
48. Un comprador `LOW` puede comprar si las demás reglas lo permiten; confianza no equivale a bloqueo automático.
49. Una dirección no cubierta por el servicio logístico debe producir una decisión explícita, no una aceptación implícita.
50. Un método de pago deshabilitado no puede utilizarse para autorizar una orden futura.
