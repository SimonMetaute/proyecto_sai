# Orchestrator State

Proyecto: **NexusMarket** (marketplace, documentación SDD en `SDD/`). Este fichero es
para gestionar el estado de las ejecuciones del orquestador sobre la
implementación de NexusMarket: contratos, dominio, puertos, endpoints REST,
pruebas y entrega.

## Run record (run-2026-10-15-contract-alignment-03: REPAIR_CONTRACT alineación contractual — 2026-10-15)

- runId: run-2026-10-15-contract-alignment-03
- fecha: 2026-10-15
- fase: REPAIR_CONTRACT — alineación contractual (sin código backend)
- archivos: SDD/Adapters/Api-rest-endpoints.md, SDD/Domain/Input-ports.md, SDD/Domain/Services/curstomer-services.md (renombrado → customer-services.md), SDD/orchestrator-state.md
- decisión:
  - addItemToCart: upsert por (producto, variante). Línea existente → cantidad incrementada (200 OK); línea nueva (201 Created). El 409 solo es para operaciones bloqueadas (Contract-alignment.md §6). Se quita el 409 de §4.11 y se documenta la semántica en BuyerPort.
  - changeSeller Status: operación malformada eliminada; puerto corregido a changeSellerVerificationStatus(User user, Seller seller, SellerVerificationStatus newStatus) (patrón naming del puerto + value object SellerVerificationStatus; la transición la implementa el dominio vía approve/reject/revoke, API §7.3-7.5).
  - Registro de vendedores: enunciado.md §7.3 prevalece (no autorregistro; el ADMINISTRATOR incorpora al vendedor). Endpoint público §3.4 eliminado de la API; PublicAccessPort pierde registerSeller; registerSeller → AdministratorPort (admin-only).
  - RG-01: aplica a todas las operaciones de rol protegido; excepciones públicas acordadas: login, registerBuyer y catálogo público (GET /api/v1/catalog/products, GET /api/v1/catalog/products/{productId}).
  - Endpoints 204: revisión — logout, remove delivery address y remove cart item ejecutan operaciones de dominio; sin hallazgos.
  - curstomer-services.md → customer-services.md: renombrado de fichero; los enlaces ya usan el nombre correcto.
- evidencia: Input-ports.md l.256 (malformado), l.44 (registerSeller público), l.79 (addItemToCart); Api-rest-endpoints.md l.132-167 (§3.4), l.505-537 (§4.11); cart-services.md l.628-634 (AddItemToCartUseCase/MergeCartUseCase); vendor-services.md l.17 (approve/reject/restrict); Contract-alignment.md §6 y §1; enunciado.md l.133; Select-String 204 → líneas 89/383/570.
- estado: IN_PROGRESS (API REST y puertos alineados; pruebas unitarias/integración/REST no ejecutadas; nunca COMPLETE).
- siguienteAccion: ejecutar el alignment gate (suites de carrito, vendedor, catálogo, admin; REST integration); re-evaluar VERIFIED/BLOCKED; actualizar matriz §5.2 e informe de cierre.
- bloqueos (criterio de producto): ninguno. Todas las discrepancias se resolvieron con criterio documental según Contract-alignment.md §1.
## Run record (run-02: alineación de contratos + diagnóstico inicial — 2026-10-14)
- runId: run-2026-10-14-contract-alignment-02
- fase: `REPAIR_CONTRACT` — alineación documental TypeScript y diagnóstico
- archivos: SDD/Contract-alignment.md (revisado), SDD/Domain/Domain_model.md,
  SDD/Domain/Domain_services.md, SDD/Domain/Domain_value_objects.md,
  SDD/Domain/Input-ports.md, SDD/Domain/Output-ports.md,
  SDD/Domain/Services/*-services.md, SDD/Adapters/Api-rest-endpoints.md,
  SDD/Software architecture.md/software_architecture.md,
  SDD/Orchestrator-prompt.md
- decisión: `Contract-alignment.md` es la autoridad transversal; dominio y puertos
  son canónicos; TypeScript es el lenguaje canónico del backend y comparte parámetros y semántica, con
  adaptación únicamente de retorno async. `400` es estado de validación por
  defecto; `401`/`403` por autenticación/autorización. MySQL 3306, MongoDB 27017.
- evidencia: documentos enlazados; conocida discrepancia `addItemToCart` (409 vs
  incremento de cantidad) y operación malformada `changeSeller Status` sin resolver;
  pendiente ejecutar el alignment gate contra cada operación de puerto.
- estado: `IN_PROGRESS` — el frontend y la implementación del backend aún no
  empiezan; solo queda la documentación y la alineación de contratos.
- siguienteAccion: ejecutar diagnóstico por entregable según Orchestrator-prompt.md,
  actualizar la matriz de trazabilidad y repetir build, pruebas y Docker.

## Run record (run-01: configuración inicial de la documentación SDD — 2026-10-06)
- runId: run-2026-10-06-initial-docs-01
- fase: `INITIAL_SETUP` — creación de prompt, contratos y estructura documental
- archivos:
  - SDD/enunciado.md (Especificación funcional de NexusMarket)
  - SDD/Orchestrator-prompt.md (prompt de orquestación)
  - SDD/Contract-alignment.md (política de alineación de contratos)
  - SDD/Domain/Domain_model.md, SDD/Domain/Domain_services.md,
    SDD/Domain/Domain_value_objects.md
  - SDD/Domain/Services/{user,customer,vendor,catalog,inventory,cart,order,
    billing,logistics,post-sale,administration}-services.md
  - SDD/Adapters/Api-rest-endpoints.md, SDD/Domain/Input-ports.md,
    SDD/Domain/Output-ports.md, SDD/Software architecture.md/software_architecture.md
  - SDD/backend_orchestrator-prompt.md (obsoleto, sin seguimiento)
- decisión: NexusMarket es un marketplace con 5 participantes
  (`BUYER`, `SELLER`, `LOGISTICS_OPERATOR`, `ADMINISTRATOR`, `SUPERVISOR`) y
  subdominios definidos por DDD + arquitectura hexagonal. El backend es Node.js +
  TypeScript + Express (cambio de stack autorizado); frontend
  React + TypeScript; persistencia MySQL (relacional) y MongoDB (auditoría);
  Docker Compose.
- evidencia: documentos SDD presentes y coherentes entre sí; se detectó y se
  registró la discrepancia `addItemToCart` y la operación `changeSeller Status`
  malformada como pendientes de alineación.
- estado: `IN_PROGRESS` — no hay código ejecutable aún; el repositorio almacena
  la documentación de contratos y la configuración del orquestador.

## Diagnóstico (matriz §3.1)
| Área | Evidencia revisada | Estado | Acción siguiente | Validación requerida |
|---|---|---|---|---|
| Especificación funcional | SDD/enunciado.md | VERIFIED | ninguna | documentos presentes |
| Modelo de dominio | SDD/Domain/Domain_model.md | VERIFIED | ninguna | revisión de agregados |
| Servicios de dominio | SDD/Domain/Domain_services.md, SDD/Domain/Services/*-services.md | VERIFIED | ninguna | revisión end-to-end |
| Puertos de entrada/salida | SDD/Domain/Input-ports.md, SDD/Domain/Output-ports.md | IN_PROGRESS | `changeSellerVerificationStatus` corregido; `registerSeller` movido a `AdministratorPort` |
| Contratos REST | SDD/Adapters/Api-rest-endpoints.md | IN_PROGRESS | §3.4 vendedor público eliminado; §4.11 reconciliado (409 → 200/201); excepciones públicas explicitadas |
| Arquitectura | SDD/Software architecture.md/software_architecture.md | VERIFIED | ninguna | revisión de capas |
| Seguridad y autorización | Orchestrator-prompt.md + contratos | VERIFIED | ninguna | JWT, roles, CORS |
| Persistencia | MySQL 3306, MongoDB 27017 | CANONICAL | ninguna | configuración de datasources |
| Pruebas unitarias | pendiente | NOT_STARTED | implementar tests | npm run build + npm test |
| Pruebas de integración | pendiente | NOT_STARTED | tests contra MySQL/Mongo | docker compose + tests |
| Docker Compose | pendiente | NOT_STARTED | compose config/build/up | smoke + healthchecks |
| Frontend React | pendiente | NOT_STARTED | implementación por rol | build + tests |

## Puertos / configuración (§0B.3)
- `docker-compose.yml` publica `3306:3306` (MySQL) y `27017:27017` (MongoDB).
- `.env.example` (canónico, versionado): `MYSQL_PORT=3306`, `MONGO_URI=mongodb://localhost:27017/audit_db`.
- `.env` (local, gitignored): `MYSQL_PORT=3308` con comentario documentando el motivo
  de conflicto con `mysqld` nativo en 3306; no modificar `docker-compose.yml` para
  no romper el entorno local.
- `appConfig.ts` lee `MYSQL_PORT` del entorno (defecto 3306); se acepta el override
  local documentado, pero el canónico SDD sigue siendo 3306:3306.
- API usa `3000` como puerto predeterminado (Express `backend/src/index.ts`), salvo que un contrato existente
  documente otro valor.
- Port canónicos (según `SDD/Contract-alignment.md`): `PublicAccessPort`,
  `BuyerPort`, `SellerPort`, `LogisticsOperatorPort`, `AdministratorPort`,
  `SupervisorPort`, `NotificationPreferencesPort`, `AuditLogRepositoryPort`,
  `JwtServicePort`, `PaymentGatewayPort`, `LogisticsIntegrationPort`.
## Trazabilidad mínima (§5.2)
| Requisito/contrato SDD | Archivo o símbolo | Prueba/comando | Estado | Evidencia |
|---|---|---|---|---|
| Registro y identidad de usuarios | SDD/Domain/Domain_model.md, SDD/Domain/Domain_services.md (User, roles) | npm test | PENDING | tests unitarios |
| Registro de vendedores/proveedores | SDD/Domain/Services/vendor-services.md, SDD/Domain/Input-ports.md (AdministratorPort) | npm test | IN_PROGRESS | registerSeller→AdministratorPort; sin endpoint público |
| Gestión de compradores | SDD/Domain/Services/customer-services.md | npm test | PENDING | fichero renombrado de curstomer-services.md → customer-services.md |
| Catálogo de productos | SDD/Domain/Services/catalog-services.md | npm test | PENDING | tests de catalog |
| Inventario distribuido | SDD/Domain/Services/inventory-services.md | npm test | PENDING | tests de inventory |
| Carrito de compras | SDD/Domain/Services/cart-services.md | npm test | PENDING | tests de cart |
| Ciclo de pedidos | SDD/Domain/Services/order-services.md | npm test | PENDING | tests de order |
| Facturación y pagos | SDD/Domain/Services/billing-services.md | npm test | PENDING | tests de billing |
| Logística y envíos | SDD/Domain/Services/logistics-services.md | npm test | PENDING | tests de logistics |
| Devoluciones y reembolsos | SDD/Domain/Services/post-sale-services.md | npm test | PENDING | tests de post-sale |
| Reportes administrativos | SDD/Domain/Services/administration-services.md | npm test | PENDING | tests de admin |
| Auditoría (Mongo) | SDD/Domain/Input-ports.md, SDD/Domain/Output-ports.md (AuditLogRepositoryPort) | npm test | PENDING | tests de auditoría |
| Seguridad (JWT, roles, CORS) | Orchestrator-prompt.md + contratos | npm test | PENDING | tests de security |
| Contrato REST | SDD/Adapters/Api-rest-endpoints.md | npm run build + tests | IN_PROGRESS | §3.4 vendedor público eliminado; §4.11 reconciliado (409 → 200/201); excepciones públicas explicitadas |

## Nota candidata a REPAIR_CONTRACT — estado tras run-2026-10-15-contract-alignment-03
- `addItemToCart`: RESUELTO en documentación (API REST §4.11 + puerto BuyerPort).
  Incorporar línea ya presente → cantidad incrementada (200 OK); línea nueva (201
  Created); el 409 solo para operaciones bloqueadas (Contract-alignment.md §6).
  Tests a ejecutar antes de VERIFIED.
- `changeSeller Status`: RESUELTO en documentación. Puerto corregido a
  `changeSellerVerificationStatus(User user, Seller seller, SellerVerificationStatus
  newStatus)`; la transición se implementa en dominio vía approveSeller/rejectSeller/
  revokeSellerAccess (vendor-services.md §1.17; API REST §7.3-7.5). Sin código backend.
- `curstomer-services.md`: RESUELTO — fichero renombrado a customer-services.md.
  Los enlaces ya usaban el nombre correcto (orchestrator-state §5.2, Domain_services.md).
- Endpoints REST con 204: REVISADOS — logout (l.89), remove delivery address (l.383) y
  remove cart item (l.570) ejecutan operaciones de dominio; sin hallazgos.
## Informe de cierre (§5.1)
```text
Estado: IN_PROGRESS
Stack detectado y evidencia:
  - Documentación SDD: Node.js/TypeScript + Express + React + TypeScript, MySQL (transaccional) + MongoDB (auditoría)
  - Fase actual: REPAIR_CONTRACT alineación contractual (run-2026-10-15)
  - Enfoque: Documentacion-first; ajuste de contratos sin código backend.
Fase/tarea seleccionada y motivo:
  - run-2026-10-15-contract-alignment-03: REPAIR_CONTRACT alineación de contratos
  - run-02: alineación de contratos NexusMarket + diagnóstico inicial
  - run-01: configuración inicial de la documentación SDD y de los contratos
Requisitos o contratos afectados:
  - SDD/Contract-alignment.md (§1, §6), SDD/enunciado.md (§7.3, RG-01),
    SDD/Domain/Input-ports.md, SDD/Adapters/Api-rest-endpoints.md,
    SDD/Domain/Services/curstomer-services.md,
    SDD/orchestrator-state.md
Cambios realizados:
  - API REST: eliminado §3.4 (registerSeller público); renumeración §3.4-§3.5;
    ext. públicas explicitadas (RG-01); §4.11 reconciliado (409 → 200/201).
  - Puertos: registerSeller removido de PublicAccessPort; addItemToCart
    documentada; changeSeller Status → changeSellerVerificationStatus.
  - Servicios: renombrado de curstomer-services.md → customer-services.md.
  - Estado: run-2026-10-15-contract-alignment-03 registrado; matriz §5.2 actualizada.
Validaciones ejecutadas, comandos y códigos de salida:
  - git mv SDD/Domain/Services/curstomer-services.md SDD/Domain/Services/customer-services.md
  - Revisión de SDD/Adapters/Api-rest-endpoints.md y SDD/Domain/Input-ports.md
  - No se ejecutaron suites unitarias/integración/REST en esta ejecución.
Pruebas: unitarias / integración / REST: PENDIENTE de ejecución.
Gates aprobados: 0 (pendiente ejecutar suites).
Faltantes, discrepancias o bloqueos:
  - Ejecución de suites y pruebas REST (horizonte: avance backend, luego suites).
  - Validar el mapeo del puerto changeSellerVerificationStatus con
    approve/reject/revoke del dominio.
  - Backend, frontend, Docker Compose (bloquean COMPLETE).
Siguiente acción exacta: ejecutar suites unitarias/integración/REST y el alignment
gate; re-evaluar VERIFIED/BLOCKED de los endpoints; luego continuar con la
implementación del backend y frontend y la entrega.
```
