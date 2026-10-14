# Orchestrator State

Proyecto: **NexusMarket** (marketplace, documentación SDD en `SDD/`). Este fichero
replica la estructura de `orchestrator_state.md` (proyecto bancario de referencia)
para gestionar el estado de las ejecuciones del orquestador sobre la
implementación de NexusMarket: contratos, dominio, puertos, endpoints REST,
pruebas y entrega.

## Run record (run-02: alineación de contratos + diagnóstico inicial — 2026-10-14)
- runId: run-2026-10-14-contract-alignment-02
- fase: `REPAIR_CONTRACT` — alineación documental Java/TypeScript y diagnóstico
- archivos: SDD/Contract-alignment.md (revisado), SDD/Domain/Domain_model.md,
  SDD/Domain/Domain_services.md, SDD/Domain/Domain_value_objects.md,
  SDD/Domain/Input-ports.md, SDD/Domain/Output-ports.md,
  SDD/Domain/Services/*-services.md, SDD/Adapters/Api-rest-endpoints.md,
  SDD/Software architecture.md/software_architecture.md,
  SDD/Orchestrator-prompt.md
- decisión: `Contract-alignment.md` es la autoridad transversal; dominio y puertos
  son canónicos; Java y TypeScript comparten parámetros y semántica, con
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
  subdominios definidos por DDD + arquitectura hexagonal. El backend será Java +
  Spring Boot o TypeScript + NestJS/Express según el perfil detectado; frontend
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
| Puertos de entrada/salida | SDD/Domain/Input-ports.md, SDD/Domain/Output-ports.md | VERIFIED | ninguna | revisión de operaciones |
| Contratos REST | SDD/Adapters/Api-rest-endpoints.md | PARTIAL | resolver addItemToCart y changeSeller Status | ejecución del alignment gate |
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
- API usa `8080` como puerto predeterminado, salvo que un contrato existente
  documente otro valor.
- Port canónicos (según `SDD/Contract-alignment.md`): `PublicAccessPort`,
  `BuyerPort`, `SellerPort`, `LogisticsOperatorPort`, `AdministratorPort`,
  `SupervisorPort`, `NotificationPreferencesPort`, `AuditLogRepositoryPort`,
  `JwtServicePort`, `PaymentGatewayPort`, `LogisticsIntegrationPort`.
## Trazabilidad mínima (§5.2)
| Requisito/contrato SDD | Archivo o símbolo | Prueba/comando | Estado | Evidencia |
|---|---|---|---|---|
| Registro y identidad de usuarios | SDD/Domain/Domain_model.md, SDD/Domain/Domain_services.md (User, roles) | npm test | PENDING | tests unitarios |
| Registro de vendedores/proveedores | SDD/Domain/Services/vendor-services.md | npm test | PENDING | test de vendor |
| Gestión de compradores | SDD/Domain/Services/customer-services.md | npm test | PENDING | test de customer |
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
| Contrato REST | SDD/Adapters/Api-rest-endpoints.md | npm run build + tests | PARTIAL | alinear addItemToCart |

## Nota candidata a REPAIR_CONTRACT
- `addItemToCart`: el contrato REST describe añadir un producto ya presente como
  `409 RESOURCE_ALREADY_EXISTS`, mientras que la descripción dice que la cantidad
  del ítem existente se incrementa. Eso es inconsistente; hay que reconciliar el
  comportamiento, la respuesta y la lista de errores con `BuyerPort.addItemToCart`
  y el servicio de carrito antes de marcar el endpoint `VERIFIED`.
- `changeSeller Status`: en el documento de puertos existe una operación malformada
  con espacio interno (`changeSeller Status`); confirmar el nombre correcto contra
  el dominio y corregir el puerto, el adaptador y los tests juntos.
- `curstomer-services.md`: nombre del fichero de servicios de cliente con tipeo
  erróneo (`curstomer` sin 's'); recomendación de renombrar a `customer-services.md`
  y actualizar los enlaces. No bloquea la implementación.
- Endpoints REST que responden `204` sin consultar el recurso ni ejecutar la
  operación de dominio: revisar contra `Api-rest-endpoints.md` y el dominio
  (`Api-rest-endpoints.md` es la referencia).
## Informe de cierre (§5.1)
```text
Estado: IN_PROGRESS
Stack detectado y evidencia:
  - Documentación SDD: Java/TypeScript + React + TypeScript, MySQL + MongoDB
  - Fase actual: alineación de contratos y documentación (run-02)
  - Enfoque: arquitectura hexagonal, DDD y trazabilidad por subdominio.
Fase/tarea seleccionada y motivo:
  - run-02: alineación de contratos NexusMarket + diagnóstico inicial
  - run-01: configuración inicial de la documentación SDD y de los contratos
Requisitos o contratos afectados:
  - SDD/Contract-alignment.md, SDD/Domain/*, SDD/Domain/Services/*-services.md,
    SDD/Adapters/Api-rest-endpoints.md, SDD/Software architecture.md,
    SDD/Orchestrator-prompt.md
Cambios realizados:
  - Documentación SDD completa y alineada; se registraron las discrepancias
    conocidas (addItemToCart, changeSeller Status, curstomer-services.md) y el
    estado de los entregables en la trazabilidad.
Validaciones ejecutadas, comandos y códigos de salida:
  - git log (10 commits, rama main); revisión de la documentación SDD.
Pruebas: unitarias / integración / REST: pendiente de implementar.
Gates aprobados: 0 (pendiente implementar código y ejecutar suites).
Faltantes, discrepancias o bloqueos:
  - addItemToCart (409 vs incremento de cantidad)
  - changeSeller Status (operación malformada)
  - curstomer-services.md (tipeo erróneo del nombre del fichero)
  - implementación de backend, frontend, pruebas y Docker Compose (bloquean COMPLETE)
Siguiente acción exacta: implementar el backend (Java + Spring Boot o
TypeScript + NestJS/Express según decisión), el frontend React + TypeScript,
las pruebas unitarias/integración y Docker Compose; luego ejecutar el alignment
gate y re-evaluar COMPLETE cuando se satisfagan las 13 condiciones §6.
```
