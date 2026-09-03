# User Services - NexusMarket

## 1. Header & Context

### Propósito

Este documento define los servicios de dominio del subdominio de identidad y usuarios de NexusMarket. Formaliza el registro, autenticación, autorización, consulta y trazabilidad de los participantes del marketplace, sin acoplar las decisiones de negocio a bases de datos, frameworks o proveedores externos.

### Introducción

El agregado `User` representa la identidad comercial y operativa de cada participante. Puede estar asociado a un comprador, vendedor, administrador, operador logístico o supervisor, pero solo puede mantener un rol primario activo a la vez. Los servicios de este subdominio validan identidad, estado y permisos antes de coordinar con otros agregados. La autenticación técnica se delega a un proveedor externo mediante puertos; las decisiones de elegibilidad, transición de estado, consentimiento y auditoría permanecen en el dominio. Todo cambio crítico conserva el actor, el contexto y el resultado mediante `Operation` y `AuditLog`.

### Responsabilidades principales

- Registrar identidades con email y documento únicos.
- Validar documentos de identidad y datos de contacto.
- Autenticar y cerrar sesiones de usuarios autorizados.
- Administrar el rol primario y sus límites de acceso.
- Controlar transiciones de `UserStatus`.
- Evaluar elegibilidad para operaciones concretas.
- Gestionar consentimiento y privacidad de datos.
- Mantener una línea de tiempo de acceso y cambios críticos.

### Relación con Domain Model

El agregado principal es `User`, con las entidades relacionadas `Buyer` y `Seller` cuando el rol lo requiere. Se utilizan `IdentityDocument`, `UserRole`, `UserStatus`, `Currency` y `OperationType`; `Operation` y `AuditLog` proporcionan trazabilidad. Los servicios consultan `Order`, `Product`, `Inventory`, `ShoppingCart` y `CommercialAccount` únicamente mediante sus puertos o contextos de elegibilidad, sin modificar agregados ajenos.

## 2. Design Principles

### Principio 1: Recibir Domain Models, no primitivos

Incorrecto:
```text
registerUser(String email, String documentNumber, String role)
```

Correcto:
```text
registerUser(RegisterUserContext context)
// context.email, context.identityDocument and context.requestedRole are domain concepts
```

El servicio recibe modelos o value objects validados. Los DTOs pertenecen a la capa de entrada y se transforman antes de cruzar el límite del dominio.

### Principio 2: Validación de datos externos

Todo resultado de un proveedor de identidad, email, documento o sesión se considera no confiable hasta validarse mediante un puerto. Un fallo externo no cambia el estado del agregado ni se interpreta como aprobación.

### Principio 3: Inmutabilidad de Value Objects

`IdentityDocument`, `UserRole`, `UserStatus`, `Currency` y demás catálogos se crean mediante fábricas del dominio y no se modifican después. Una modificación produce un nuevo valor y una transición explícita.

### Principio 4: Traceabilidad operacional

Las operaciones de registro, acceso, cambio de estado, rol, consentimiento y bloqueo generan `Operation` y, cuando son críticas, un `AuditLog` inmutable. Nunca se almacenan contraseñas, tokens ni secretos en los detalles de auditoría.

### Principio 5: Transaccionalidad y consistencia

El guardado del `User`, sus invariantes y el evento de dominio asociado deben confirmarse de forma atómica. Las coordinaciones con `Buyer`, `Seller` o servicios externos usan transacciones de aplicación, idempotencia y eventos; no se invaden límites de agregados.

## 3. Domain Model Context

### Entidades principales

- **User:** identidad, datos de contacto, rol primario, fechas y estado de acceso.
- **Buyer:** perfil de comprador vinculado por `userId`, historial, confianza y capacidades comerciales.
- **Seller:** perfil vendedor vinculado por `userId`, verificación y autorización comercial.
- **Operation:** acción ejecutada por un actor sobre una entidad.
- **AuditLog:** registro append-only de operaciones críticas.

### Value Objects utilizados

- `IdentityDocument`: tipo y número de identidad verificable.
- `UserRole`: `BUYER`, `SELLER`, `LOGISTICS_OPERATOR`, `ADMINISTRATOR`, `SUPERVISOR`.
- `UserStatus`: `ACTIVE`, `INACTIVE`, `BLOCKED`, `PENDING_VERIFICATION`.
- `Currency`: contexto monetario cuando se consulta elegibilidad comercial o límites.
- `OperationType` y `AuditSeverity`: clasificación estable de operaciones y riesgo.

### Aggregates y boundaries

```text
User (Aggregate Root)
├── IdentityDocument
├── UserRole
├── UserStatus
└── contacto e identidad

Buyer (Aggregate Root) -------- userId -------- User
Seller (Aggregate Root) ------- userId -------- User
Operation (Aggregate Root) ---- performedBy --- User
AuditLog (Aggregate Root) ----- performedBy --- User
```

`User` controla identidad, estado y rol. `Buyer` y `Seller` controlan sus propios datos de negocio. Un servicio de usuario puede publicar eventos o solicitar lecturas mediante puertos, pero no persiste directamente cambios internos de esos agregados.

### Ciclo de vida de User

```text
                 +----------------------+
                 | PENDING_VERIFICATION |
                 +----------+-----------+
                            | verify identity
                            v
                        +---+---+
                        | ACTIVE |
                        +---+---+
                            | voluntary restriction
                            v
                      +-----+------+
                      |  INACTIVE  |
                      +-----+------+
                            | reactivate
                            +----------> ACTIVE

ACTIVE / INACTIVE ---------------------> BLOCKED
BLOCKED -- administrative review ------> INACTIVE or ACTIVE
```

El registro comienza en `PENDING_VERIFICATION` cuando la política exige verificación. No se permite saltar a `ACTIVE` sin cumplir las verificaciones requeridas.

## 4. Numbered Services

## 1. Register User

### Description
Registra una nueva identidad de marketplace y crea el agregado `User` con su estado inicial y rol solicitado.

### Responsibility
Garantizar que la identidad sea única, válida y compatible con el rol inicial.

### Input
- **Primary Input (Domain Model):** `RegisterUserContext` con `User` incompleto y datos de registro.
- **Secondary Input (Value Objects):** `IdentityDocument`, email validado, `UserRole`, `Currency` si aplica.
- **Domain Constraints:** email y documento únicos; un rol primario; datos obligatorios completos.

### Processing & Validations
1. Verificar consentimiento de registro y formato de contacto.
2. Validar identidad mediante `IdentityVerificationPort`.
3. Rechazar duplicados por email o documento.
4. Crear `User` en `PENDING_VERIFICATION` o `ACTIVE` según política.

### Persistence & Output
- **Output (Domain Model):** `UserRegistrationResult` con `User` y evento `UserRegisteredEvent`.
- **Persisted Aggregates:** `User` y, si corresponde, referencia de `Operation`.
- **Generated Events:** `UserRegisteredEvent`, `UserVerificationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `USER_REGISTRATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 2. Consult User

### Description
Obtiene la vista autorizada del usuario y su estado actual sin revelar datos fuera del alcance del solicitante.

### Responsibility
Aplicar minimización de datos y devolver una representación de dominio coherente.

### Input
- **Primary Input (Domain Model):** `UserQueryContext` con actor `User` y usuario objetivo.
- **Secondary Input (Value Objects):** `UserRole`, `UserStatus`.
- **Domain Constraints:** el actor debe tener relación o permiso de consulta.

### Processing & Validations
1. Validar autorización del actor.
2. Recuperar el agregado desde `UserRepositoryPort`.
3. Aplicar política de visibilidad por rol.
4. Omitir credenciales y datos sensibles no consentidos.

### Persistence & Output
- **Output (Domain Model):** `UserProfileView`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `UserProfileConsultedEvent` cuando la política exige trazabilidad.

### Operation & Audit
- **Operation Type:** `USER_PROFILE_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog` + `Operation`

## 3. Update User

### Description
Actualiza datos permitidos de contacto o identidad sin alterar silenciosamente el rol, estado o historial del usuario.

### Responsibility
Preservar invariantes de identidad durante una modificación autorizada.

### Input
- **Primary Input (Domain Model):** `UpdateUserContext` con `User` existente y cambios expresados como modelo.
- **Secondary Input (Value Objects):** nuevo email validado, `IdentityDocument` si aplica.
- **Domain Constraints:** actor autorizado; email/documento no duplicados; campos protegidos requieren flujo especializado.

### Processing & Validations
1. Cargar `User` y verificar versión.
2. Validar cambios con servicios externos cuando corresponda.
3. Aplicar una transición explícita para datos sensibles.
4. Guardar el agregado y registrar diferencias permitidas.

### Persistence & Output
- **Output (Domain Model):** `UserUpdateResult`.
- **Persisted Aggregates:** `User`.
- **Generated Events:** `UserUpdatedEvent`, `IdentityReverificationRequestedEvent` si aplica.

### Operation & Audit
- **Operation Type:** `USER_PROFILE_UPDATE`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 4. Change User Status

### Description
Cambia el estado de acceso del usuario usando únicamente transiciones permitidas y una causa de negocio explícita.

### Responsibility
Controlar el ciclo de vida de `UserStatus` y sus efectos de acceso.

### Input
- **Primary Input (Domain Model):** `ChangeUserStatusContext` con `User`, estado destino y motivo.
- **Secondary Input (Value Objects):** `UserStatus`, `OperationType`.
- **Domain Constraints:** transición válida; autoridad suficiente; `BLOCKED` requiere causa y auditoría.

### Processing & Validations
1. Confirmar que el estado destino difiere del actual.
2. Validar transición y autoridad del actor.
3. Persistir el cambio con control de concurrencia.
4. Revocar sesiones si el nuevo estado lo requiere.

### Persistence & Output
- **Output (Domain Model):** `UserStatusChangeResult`.
- **Persisted Aggregates:** `User`, `Operation`, `AuditLog`.
- **Generated Events:** `UserStatusChangedEvent`, `UserAccessRevokedEvent`.

### Operation & Audit
- **Operation Type:** `USER_STATUS_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 5. Authenticate User

### Description
Valida las credenciales o una prueba de identidad externa y crea un contexto de acceso solo para un usuario habilitado.

### Responsibility
Coordinar autenticación técnica con la decisión de acceso del dominio.

### Input
- **Primary Input (Domain Model):** `AuthenticationContext` con `UserCredentialProof` y contexto de acceso.
- **Secondary Input (Value Objects):** email, `UserStatus`, `UserRole`.
- **Domain Constraints:** usuario existente, estado permitido, credenciales verificadas, política de riesgo satisfecha.

### Processing & Validations
1. Consultar el usuario sin obtener secretos persistidos.
2. Delegar prueba al `CredentialVerificationPort`.
3. Rechazar usuarios `BLOCKED` o `INACTIVE` según política.
4. Emitir sesión y registrar intento exitoso o fallido.

### Persistence & Output
- **Output (Domain Model):** `AuthenticationResult` con `AccessSession`.
- **Persisted Aggregates:** `Operation` y registro de acceso resumido.
- **Generated Events:** `UserAuthenticatedEvent` o `AuthenticationRejectedEvent`.

### Operation & Audit
- **Operation Type:** `USER_AUTHENTICATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 6. Logout User

### Description
Invalida una sesión activa y cierra el contexto de acceso del usuario.

### Responsibility
Finalizar sesiones de forma idempotente y conservar la evidencia operacional mínima.

### Input
- **Primary Input (Domain Model):** `LogoutContext` con `User` y `AccessSession`.
- **Secondary Input (Value Objects):** `SessionIdentifier`, `OperationType`.
- **Domain Constraints:** la sesión debe pertenecer al usuario o a un actor autorizado.

### Processing & Validations
1. Validar sesión y propietario.
2. Solicitar invalidación al `SessionPort`.
3. Tratar repetición de logout como resultado idempotente.
4. Registrar fecha y motivo de cierre.

### Persistence & Output
- **Output (Domain Model):** `LogoutResult`.
- **Persisted Aggregates:** `Operation` y timeline de acceso.
- **Generated Events:** `UserLoggedOutEvent`.

### Operation & Audit
- **Operation Type:** `USER_LOGOUT`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog` + `Operation`

## 7. Consult Commercial History

### Description
Construye una vista cronológica de actividad comercial y operacional vinculada al usuario.

### Responsibility
Entregar historial autorizado sin modificar órdenes, pagos ni registros cerrados.

### Input
- **Primary Input (Domain Model):** `CommercialHistoryQuery` con `User` y rango temporal como criterio de dominio.
- **Secondary Input (Value Objects):** `UserRole`, `Currency`.
- **Domain Constraints:** alcance del actor, inmutabilidad de transacciones cerradas y minimización de datos.

### Processing & Validations
1. Autorizar el alcance solicitado.
2. Consultar referencias mediante puertos de órdenes y operaciones.
3. Ordenar eventos por fecha de dominio.
4. Ocultar información de terceros no autorizada.

### Persistence & Output
- **Output (Domain Model):** `CommercialHistory`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `CommercialHistoryConsultedEvent`.

### Operation & Audit
- **Operation Type:** `COMMERCIAL_HISTORY_CONSULTATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog` + `Operation`

## 8. Validate User Eligibility

### Description
Determina si un usuario puede ejecutar una operación concreta considerando rol, estado, verificación y contexto comercial.

### Responsibility
Centralizar la decisión de autorización de negocio sin reemplazar la autenticación técnica.

### Input
- **Primary Input (Domain Model):** `EligibilityContext` con `User`, operación y agregado objetivo.
- **Secondary Input (Value Objects):** `UserRole`, `UserStatus`, `SellerVerificationStatus`, `Currency` si aplica.
- **Domain Constraints:** actor activo, rol compatible y precondiciones del agregado satisfechas.

### Processing & Validations
1. Confirmar identidad y estado del actor.
2. Evaluar permisos por rol y operación.
3. Consultar verificación de vendedor o confianza de comprador cuando aplique.
4. Retornar decisión explicable sin mutar agregados.

### Persistence & Output
- **Output (Domain Model):** `EligibilityDecision`.
- **Persisted Aggregates:** ninguno; se audita solo si la operación es sensible.
- **Generated Events:** `UserEligibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `USER_ELIGIBILITY_VALIDATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 9. Manage User Roles

### Description
Asigna, reemplaza o revoca el rol primario de un usuario respetando la regla de unicidad y la autoridad administrativa.

### Responsibility
Mantener los límites de participación definidos por `UserRole`.

### Input
- **Primary Input (Domain Model):** `ManageUserRoleContext` con `User`, actor y decisión de rol.
- **Secondary Input (Value Objects):** `UserRole`, `UserStatus`.
- **Domain Constraints:** un único rol activo; actor autorizado; transición compatible con verificaciones.

### Processing & Validations
1. Verificar autoridad y separación de funciones.
2. Validar requisitos del rol destino.
3. Revocar o reemplazar el rol anterior de forma atómica.
4. Solicitar creación de `Buyer` o `Seller` mediante evento si corresponde.

### Persistence & Output
- **Output (Domain Model):** `UserRoleChangeResult`.
- **Persisted Aggregates:** `User`, `Operation`, `AuditLog`.
- **Generated Events:** `UserRoleChangedEvent`, `BuyerProfileCreationRequestedEvent` o `SellerProfileCreationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `USER_ROLE_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 10. Verify Identity Document

### Description
Comprueba que el `IdentityDocument` pertenece al usuario y cumple los criterios de validez del marketplace.

### Responsibility
Convertir una respuesta externa de verificación en una decisión de dominio trazable.

### Input
- **Primary Input (Domain Model):** `IdentityVerificationContext` con `User` y `IdentityDocument`.
- **Secondary Input (Value Objects):** `DocumentType`, `UserStatus`.
- **Domain Constraints:** documento no duplicado; proveedor confiable; resultado no ambiguo.

### Processing & Validations
1. Validar estructura y país soportado.
2. Consultar `IdentityVerificationPort`.
3. Comparar resultado con identidad declarada.
4. Activar o mantener el estado según política.

### Persistence & Output
- **Output (Domain Model):** `IdentityVerificationResult`.
- **Persisted Aggregates:** `User`, `Operation`, `AuditLog`.
- **Generated Events:** `IdentityVerifiedEvent` o `IdentityVerificationFailedEvent`.

### Operation & Audit
- **Operation Type:** `IDENTITY_DOCUMENT_VERIFICATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 11. Validate Contact Channel

### Description
Valida que el email o teléfono declarado pueda utilizarse para comunicación y recuperación de acceso.

### Responsibility
Mantener canales de contacto verificables sin convertir el código de confirmación en un dato de dominio persistente.

### Input
- **Primary Input (Domain Model):** `ContactVerificationContext` con `User` y canal.
- **Secondary Input (Value Objects):** `ContactChannel`, `UserStatus`.
- **Domain Constraints:** canal perteneciente al usuario; código temporal y de un solo uso.

### Processing & Validations
1. Validar formato del value object.
2. Enviar desafío mediante `NotificationPort`.
3. Comprobar confirmación mediante `ContactVerificationPort`.
4. Actualizar únicamente la marca de verificación autorizada.

### Persistence & Output
- **Output (Domain Model):** `ContactVerificationResult`.
- **Persisted Aggregates:** `User` si cambia una marca de verificación.
- **Generated Events:** `ContactChannelVerifiedEvent`.

### Operation & Audit
- **Operation Type:** `CONTACT_CHANNEL_VERIFICATION`
- **Audit Severity:** `MEDIUM`
- **Tracked By:** `AuditLog` + `Operation`

## 12. Recover User Access

### Description
Inicia y completa la recuperación de acceso tras verificar control sobre un canal permitido.

### Responsibility
Restaurar acceso sin revelar si una identidad existe ni permitir escalamiento de privilegios.

### Input
- **Primary Input (Domain Model):** `AccessRecoveryContext` con prueba de identidad y canal.
- **Secondary Input (Value Objects):** `UserStatus`, `UserRole`, `ContactChannel`.
- **Domain Constraints:** no recuperar usuarios bloqueados sin revisión; límite de intentos; prueba vigente.

### Processing & Validations
1. Crear desafío opaco y con expiración.
2. Verificar la prueba externa.
3. Aplicar credencial nueva mediante `CredentialPort`.
4. Revocar sesiones previas y auditar el resultado.

### Persistence & Output
- **Output (Domain Model):** `AccessRecoveryResult`.
- **Persisted Aggregates:** `User` y referencias de operación.
- **Generated Events:** `UserAccessRecoveredEvent` o `AccessRecoveryRejectedEvent`.

### Operation & Audit
- **Operation Type:** `USER_ACCESS_RECOVERY`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 13. Audit User Access

### Description
Construye una timeline inmutable de autenticaciones, cierres, fallos, bloqueos y recuperaciones asociadas a un usuario.

### Responsibility
Hacer reconstruible la historia de acceso para soporte, seguridad y cumplimiento.

### Input
- **Primary Input (Domain Model):** `AccessAuditQuery` con `User` y criterio temporal.
- **Secondary Input (Value Objects):** `UserRole`, `AuditSeverity`, `OperationType`.
- **Domain Constraints:** solo fuentes append-only; no incluir secretos ni credenciales.

### Processing & Validations
1. Autorizar al consultante según rol.
2. Leer `AuditLogRepositoryPort` y `OperationRepositoryPort`.
3. Ordenar por tiempo de ejecución y correlación.
4. Clasificar anomalías sin alterar registros históricos.

### Persistence & Output
- **Output (Domain Model):** `UserAccessTimeline`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `UserAccessAuditedEvent`.

### Operation & Audit
- **Operation Type:** `USER_ACCESS_AUDIT`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 14. Detect Suspicious Access

### Description
Evalúa patrones de acceso anómalos y emite una señal para revisión o protección de la cuenta.

### Responsibility
Aplicar reglas explicables de riesgo sin bloquear automáticamente fuera de una política aprobada.

### Input
- **Primary Input (Domain Model):** `AccessRiskContext` con `User` y `UserAccessTimeline`.
- **Secondary Input (Value Objects):** `AuditSeverity`, `UserStatus`, `OperationType`.
- **Domain Constraints:** evidencia suficiente; reglas versionadas; privacidad y minimización.

### Processing & Validations
1. Correlacionar fallos, ubicaciones o sesiones según política.
2. Calcular `AccessRiskAssessment`.
3. Recomendar revisión, revocación o bloqueo con causa.
4. Notificar al actor de seguridad autorizado.

### Persistence & Output
- **Output (Domain Model):** `AccessRiskAssessment`.
- **Persisted Aggregates:** `Operation`, `AuditLog`; `User` solo tras decisión autorizada.
- **Generated Events:** `SuspiciousAccessDetectedEvent`.

### Operation & Audit
- **Operation Type:** `SUSPICIOUS_ACCESS_ANALYSIS`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 15. Manage Consent and Data Privacy

### Description
Registra, actualiza o revoca el consentimiento del usuario para usos específicos de sus datos.

### Responsibility
Aplicar finalidad, alcance, versión de política y derecho de revocación de forma auditable.

### Input
- **Primary Input (Domain Model):** `PrivacyConsentContext` con `User` y `ConsentDecision`.
- **Secondary Input (Value Objects):** `ConsentPurpose`, `PolicyVersion`, `UserStatus`.
- **Domain Constraints:** consentimiento explícito; propósito definido; revocación no retroactiva de obligaciones legales.

### Processing & Validations
1. Validar versión de política y finalidad.
2. Comprobar que el actor puede decidir por el usuario.
3. Persistir el consentimiento como registro versionado.
4. Publicar cambios para limitar usos posteriores.

### Persistence & Output
- **Output (Domain Model):** `PrivacyConsentResult`.
- **Persisted Aggregates:** `UserConsent`, `Operation`, `AuditLog`.
- **Generated Events:** `PrivacyConsentGrantedEvent` o `PrivacyConsentRevokedEvent`.

### Operation & Audit
- **Operation Type:** `PRIVACY_CONSENT_CHANGE`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 16. Enforce Data Visibility

### Description
Determina qué atributos del usuario pueden ser visibles para un actor, subdominio o propósito concreto.

### Responsibility
Aplicar privacidad por rol, finalidad y consentimiento antes de exponer datos.

### Input
- **Primary Input (Domain Model):** `DataVisibilityContext` con `User`, actor y propósito.
- **Secondary Input (Value Objects):** `UserRole`, `ConsentPurpose`.
- **Domain Constraints:** mínimo privilegio; separación de datos públicos, operativos y sensibles.

### Processing & Validations
1. Validar propósito de acceso.
2. Consultar consentimiento vigente.
3. Aplicar política de campos permitidos.
4. Devolver una vista reducida y trazable.

### Persistence & Output
- **Output (Domain Model):** `UserVisibilityDecision`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `UserDataVisibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `USER_DATA_VISIBILITY_EVALUATION`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 17. Evaluate Role Transition Eligibility

### Description
Comprueba si un usuario puede pasar a otro rol primario y qué perfil de negocio debe crearse o validarse.

### Responsibility
Evitar roles incompatibles, privilegios implícitos y perfiles incompletos.

### Input
- **Primary Input (Domain Model):** `RoleTransitionContext` con `User`, rol actual y rol destino.
- **Secondary Input (Value Objects):** `UserRole`, `SellerVerificationStatus`, `IdentityDocument`.
- **Domain Constraints:** identidad verificada; transición permitida; requisitos del rol satisfechos.

### Processing & Validations
1. Evaluar la matriz de transiciones.
2. Validar requisitos de comprador, vendedor u operador.
3. Comprobar que no existe otro rol primario activo.
4. Devolver requisitos pendientes y decisión.

### Persistence & Output
- **Output (Domain Model):** `RoleTransitionEligibility`.
- **Persisted Aggregates:** ninguno.
- **Generated Events:** `RoleTransitionEligibilityEvaluatedEvent`.

### Operation & Audit
- **Operation Type:** `ROLE_TRANSITION_ELIGIBILITY`
- **Audit Severity:** `HIGH`
- **Tracked By:** `AuditLog` + `Operation`

## 18. Suspend User Access

### Description
Suspende o bloquea el acceso por una decisión de seguridad, cumplimiento o negocio con alcance explícito.

### Responsibility
Aplicar una medida restrictiva reversible o terminal sin borrar historia comercial.

### Input
- **Primary Input (Domain Model):** `UserAccessRestrictionContext` con `User`, decisión y evidencia.
- **Secondary Input (Value Objects):** `UserStatus`, `AuditSeverity`, `OperationType`.
- **Domain Constraints:** autoridad competente; motivo obligatorio; proporcionalidad; revisión definida.

### Processing & Validations
1. Validar evidencia y actor decisor.
2. Elegir `INACTIVE` o `BLOCKED` según severidad.
3. Revocar sesiones y operaciones futuras.
4. Notificar el resultado sin filtrar información confidencial.

### Persistence & Output
- **Output (Domain Model):** `AccessRestrictionResult`.
- **Persisted Aggregates:** `User`, `Operation`, `AuditLog`.
- **Generated Events:** `UserAccessSuspendedEvent`, `UserSessionsRevokedEvent`.

### Operation & Audit
- **Operation Type:** `USER_ACCESS_RESTRICTION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 19. Reactivate User Access

### Description
Restaura el acceso de un usuario inactivo tras resolver la causa de restricción y validar las condiciones actuales.

### Responsibility
Permitir reactivación controlada sin borrar el motivo ni el historial de suspensión.

### Input
- **Primary Input (Domain Model):** `UserReactivationContext` con `User`, resolución y evidencia.
- **Secondary Input (Value Objects):** `UserStatus`, `UserRole`, `IdentityDocument`.
- **Domain Constraints:** solo `INACTIVE` o resultado de revisión de `BLOCKED`; identidad vigente; autoridad aprobadora.

### Processing & Validations
1. Confirmar resolución de la causa.
2. Revalidar identidad y requisitos del rol.
3. Cambiar a `ACTIVE` o `PENDING_VERIFICATION`.
4. Registrar aprobación y publicar evento.

### Persistence & Output
- **Output (Domain Model):** `UserReactivationResult`.
- **Persisted Aggregates:** `User`, `Operation`, `AuditLog`.
- **Generated Events:** `UserReactivatedEvent` o `UserVerificationRequestedEvent`.

### Operation & Audit
- **Operation Type:** `USER_ACCESS_REACTIVATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 20. Reconcile User Identity

### Description
Compara identidad, roles y perfiles `Buyer`/`Seller` para detectar referencias huérfanas, duplicados o inconsistencias.

### Responsibility
Proteger la coherencia entre el agregado `User` y los perfiles dependientes sin reparar datos silenciosamente.

### Input
- **Primary Input (Domain Model):** `IdentityReconciliationContext` con `User` y perfiles relacionados.
- **Secondary Input (Value Objects):** `IdentityDocument`, `UserRole`, `UserStatus`.
- **Domain Constraints:** una identidad canónica; referencias por `userId`; toda corrección requiere decisión autorizada.

### Processing & Validations
1. Comparar identidad y referencias de perfiles.
2. Clasificar duplicados, huérfanos y conflictos de rol.
3. Proponer acciones idempotentes de reparación.
4. Ejecutar solo correcciones aprobadas y auditadas.

### Persistence & Output
- **Output (Domain Model):** `IdentityReconciliationReport`.
- **Persisted Aggregates:** solo agregados explícitamente aprobados; siempre `Operation` y `AuditLog`.
- **Generated Events:** `UserIdentityInconsistencyDetectedEvent`, `UserIdentityReconciledEvent`.

### Operation & Audit
- **Operation Type:** `USER_IDENTITY_RECONCILIATION`
- **Audit Severity:** `CRITICAL`
- **Tracked By:** `AuditLog` + `Operation`

## 5. Output Ports (Repositories & Interfaces)

### Repository Interfaces

#### UserRepositoryPort

```text
interface UserRepositoryPort {
    User save(User user)
    Optional<User> findByEmail(Email email)
    Optional<User> findByIdentityDocument(IdentityDocument identityDocument)
    Optional<User> findByIdentifier(User user)
    boolean existsByEmail(Email email)
}
```

El puerto no devuelve material de contraseña ni tokens. Las implementaciones deben garantizar unicidad por email y documento, control de concurrencia y persistencia transaccional del agregado.

#### BuyerRepositoryPort

```text
interface BuyerRepositoryPort {
    Optional<Buyer> findByUser(User user)
    Buyer save(Buyer buyer)
}
```

#### SellerRepositoryPort

```text
interface SellerRepositoryPort {
    Optional<Seller> findByUser(User user)
    Seller save(Seller seller)
    List<Seller> findByVerificationStatus(SellerVerificationStatus status)
}
```

#### OperationRepositoryPort

```text
interface OperationRepositoryPort {
    Operation append(Operation operation)
    List<Operation> findByActor(User user, OperationQuery query)
}
```

#### AuditLogRepositoryPort

```text
interface AuditLogRepositoryPort {
    AuditLog append(AuditLog auditLog)
    List<AuditLog> findByUser(User user, AuditQuery query)
}
```

Solo se permite `append`; no existen operaciones de actualización o borrado.

### External Service Contracts

#### IdentityVerificationPort

```text
interface IdentityVerificationPort {
    IdentityVerificationResult verify(IdentityVerificationContext context)
}
```

#### CredentialVerificationPort

```text
interface CredentialVerificationPort {
    CredentialVerificationResult verify(UserCredentialProof proof)
}
```

#### CredentialPort

```text
interface CredentialPort {
    CredentialUpdateResult replace(User user, CredentialChange change)
}
```

#### SessionPort

```text
interface SessionPort {
    AccessSession create(User user, AccessContext context)
    void revoke(AccessSession session)
    void revokeAll(User user, RevocationReason reason)
}
```

#### ContactVerificationPort

```text
interface ContactVerificationPort {
    ContactChallenge issue(User user, ContactChannel channel)
    ContactVerificationResult verify(ContactChallenge challenge, VerificationProof proof)
}
```

#### NotificationPort

```text
interface NotificationPort {
    NotificationReceipt notify(User user, DomainNotification notification)
}
```

#### ClockPort

```text
interface ClockPort {
    DomainDateTime now()
}
```

## 6. Input Ports (Use Cases)

### Public Interfaces

```text
interface RegisterUserUseCase {
    UserRegistrationResult execute(RegisterUserContext context)
}

interface AuthenticateUserUseCase {
    AuthenticationResult execute(AuthenticationContext context)
}

interface ChangeUserStatusUseCase {
    UserStatusChangeResult execute(ChangeUserStatusContext context)
}

interface ManageUserRoleUseCase {
    UserRoleChangeResult execute(ManageUserRoleContext context)
}

interface ValidateUserEligibilityUseCase {
    EligibilityDecision execute(EligibilityContext context)
}

interface ManageConsentUseCase {
    PrivacyConsentResult execute(PrivacyConsentContext context)
}

interface AuditUserAccessUseCase {
    UserAccessTimeline execute(AccessAuditQuery query)
}
```

### Example invocation

```text
const result = await registerUserUseCase.execute({
    user: UserRegistrationDraft.from(identityDocument, contactChannel),
    requestedRole: UserRole.BUYER,
    consent: PrivacyConsent.grantedFor(ConsentPurpose.ACCOUNT_OPERATION),
    actor: RegistrationActor.selfService()
})
```

```text
const decision = await validateUserEligibilityUseCase.execute({
    actor: authenticatedUser,
    target: seller,
    operation: MarketplaceOperation.PUBLISH_PRODUCT,
    commercialContext: CommercialContext.withCurrency(Currency.USD)
})
```

Los adaptadores de entrada convierten solicitudes HTTP, mensajes o comandos en estos contextos de dominio. Ningún caso de uso acepta `String`, `UUID` o enumeraciones primitivas como sustitutos de modelos de dominio.

## 7. Data Flow Diagram

```text
[Input Adapter]
       |
       v
[User Use Case / Input Port]
       |
       v
[User Domain Service]
   |       |        |        |
   |       |        |        +--> [Clock / Notification Port]
   |       |        +-----------> [Identity / Credential / Session Port]
   |       +--------------------> [Buyer / Seller Repository Port]
   +----------------------------> [User Repository Port]
       |
       +--> [OperationRepositoryPort]
       +--> [AuditLogRepositoryPort]
       |
       v
[Domain Event / Result Model]
       |
       v
[Application Coordinator]
       |
       +--> Buyer, Seller, Order, Catalog, Inventory contexts
       +--> External adapters
```

Las respuestas externas se traducen a modelos de dominio antes de decidir. Las excepciones de proveedor no producen cambios parciales en `User`; los reintentos deben ser idempotentes mediante una referencia de operación.

## 8. Architectural Constraints & Rules

### Data Integrity Constraints

1. `User.userId` debe ser único y estable durante toda la vida de la identidad.
2. El email debe ser único, normalizado mediante su value object y comparado sin ambigüedad de mayúsculas.
3. `IdentityDocument` debe ser válido y no puede pertenecer a dos usuarios activos.
4. Cada usuario debe tener como máximo un rol primario activo.
5. Los valores de `UserRole` solo pueden provenir del catálogo de dominio.
6. Los valores de `UserStatus` solo pueden provenir del catálogo de dominio.
7. El usuario debe conservar `registrationDate` y actualizar `updateDate` en cada cambio permitido.
8. Un perfil `Buyer` o `Seller` debe referenciar un `User` existente mediante `userId`.
9. No se puede activar un usuario con identidad requerida aún sin verificar.
10. Las credenciales nunca forman parte del agregado `User` ni de sus resultados.

### Transactional Constraints

11. La creación de `User` y su primera `Operation` debe ser atómica.
12. Un cambio de estado debe persistirse con control de versión o equivalente contra concurrencia.
13. Un cambio de rol no puede dejar dos roles primarios activos durante una transacción.
14. La revocación de sesiones debe ejecutarse antes de permitir operaciones posteriores al bloqueo.
15. Las llamadas externas deben tener timeout, resultado explícito y política de reintento controlada.
16. Un reintento con la misma referencia de operación debe producir un resultado idempotente.
17. Un fallo de verificación externa no debe cambiar el estado del usuario a `ACTIVE`.
18. Los eventos de usuario deben publicarse después de confirmar el cambio del agregado.
19. La compensación de una operación distribuida debe generar una nueva operación auditable.
20. No se deben abrir transacciones que abarquen directamente proveedores externos no transaccionales.

### Authorization & Access Constraints

21. La autenticación técnica no sustituye la validación de elegibilidad de negocio.
22. Solo un administrador o una política explícita puede cambiar roles de otro usuario.
23. Un supervisor puede consultar información autorizada, pero no ejecutar cambios críticos.
24. Un comprador puede gestionar su propia identidad y contexto, no el de terceros.
25. Un vendedor puede operar su identidad comercial, no asignarse privilegios administrativos.
26. Un operador logístico solo puede acceder a operaciones de su alcance logístico.
27. Un usuario `BLOCKED` no puede autenticarse ni ejecutar operaciones de dominio.
28. La recuperación de acceso no puede elevar el rol ni evadir una revisión de bloqueo.
29. Todo acceso a datos sensibles requiere propósito, autorización y consentimiento vigente cuando aplique.
30. Las vistas devueltas deben aplicar mínimo privilegio y minimización de datos.

### Persistence & State Constraints

31. `AuditLog` es inmutable y append-only; nunca se actualiza ni se elimina.
32. `Operation` conserva actor, tipo, entidad afectada y tiempo de ejecución sin sobrescritura silenciosa.
33. Los cambios de estado solo pueden seguir transiciones definidas por el ciclo de vida de `User`.
34. Los historiales comerciales cerrados son de solo lectura desde este subdominio.
35. Los puertos de repositorio deben trabajar con modelos y value objects, no con entidades ORM o DTOs.
36. Los adaptadores no pueden filtrar SQL, HTTP, tokens o detalles de infraestructura hacia el dominio.
37. Las consultas no deben mutar agregados ni crear perfiles como efecto lateral.
38. Una reparación de identidad debe conservar los identificadores canónicos y la evidencia de decisión.
39. Los timestamps de dominio deben proceder de `ClockPort`, no de llamadas directas al sistema.
40. La expiración de sesiones y desafíos debe ser verificable sin depender de la hora del proveedor.

### Cross-Aggregate Constraints

41. `User` no modifica internamente `Buyer`, `Seller`, `Order` o `CommercialAccount`.
42. La creación de un perfil comprador o vendedor se coordina mediante su propio servicio o evento.
43. La elegibilidad para publicar productos debe consultar la verificación del vendedor sin duplicar su fuente de verdad.
44. La elegibilidad para comprar debe delegar restricciones de stock, carrito y pago a sus subdominios.
45. Un cambio de rol debe notificar a los subdominios que mantienen permisos derivados.
46. La eliminación de un usuario no puede borrar órdenes, pagos, facturas ni auditorías históricas.
47. Las referencias entre agregados usan identificadores o modelos de contexto, nunca mutaciones compartidas.
48. Una inconsistencia entre `User` y sus perfiles debe generar reporte antes de cualquier reparación automática.

### Audit, Compliance & Performance Constraints

49. Toda operación crítica debe generar un `AuditLog` con `AuditSeverity` y detalles sin secretos.
50. Los detalles de auditoría no pueden contener contraseñas, tokens, códigos de verificación, datos completos de pago ni credenciales.
51. Los fallos de autenticación y accesos sospechosos deben conservar conteo, fecha y contexto suficiente para investigación.
52. Los consentimientos deben registrar propósito, versión de política, decisión, actor y fecha.
53. La revocación de consentimiento debe afectar usos futuros, sin alterar obligaciones legales o transacciones cerradas.
54. Las consultas de timeline deben paginarse por criterio de dominio y no cargar historial ilimitado en memoria.
55. Las consultas de usuario deben poder ejecutarse con índices de email, documento y `userId` sin cambiar el contrato del puerto.
56. Las políticas de autorización y riesgo deben estar versionadas para explicar decisiones históricas.
57. Los catálogos y códigos de roles, estados y operaciones deben ser estables para integraciones externas.
58. La compatibilidad de eventos exige consumidores tolerantes a campos nuevos y productores que no eliminen campos vigentes sin versión.

### Special Business Rules

59. Un vendedor no puede publicar productos hasta que su perfil `Seller` esté verificado; la decisión se toma en el subdominio vendedor.
60. Un supervisor puede consultar dashboards e historial permitido, pero nunca aprobar un cambio crítico de identidad.
61. La identidad verificada de un usuario no puede sustituirse por otra mediante una actualización ordinaria.
62. Un usuario inactivo puede conservar historial y perfiles, pero no iniciar operaciones restringidas.
63. El bloqueo de acceso no cancela automáticamente órdenes, pagos o envíos; cada subdominio decide su compensación.
64. La timeline de acceso debe distinguir autenticación exitosa, rechazo, logout, recuperación y revocación.
65. La evaluación de elegibilidad debe devolver razones de dominio y requisitos pendientes, no solo un booleano.
66. Las decisiones automatizadas de riesgo deben permitir revisión humana cuando la política lo exija.
67. Toda operación iniciada por un proceso del sistema debe identificar un actor técnico autorizado en `performedBy`.
68. El tratamiento de datos debe respetar el propósito declarado y no reutilizar consentimiento entre finalidades incompatibles.
