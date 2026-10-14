# NexusMarket

NexusMarket es un marketplace digital que actúa como intermediario comercial entre compradores y vendedores. El sistema administra la operación desde el registro de usuarios y la publicación de productos hasta la logística, la facturación y la posventa, procurando trazabilidad y coordinación entre los participantes. La organización facilita la comercialización de productos de terceros mediante una plataforma empresarial unificada y proporciona la infraestructura necesaria para centralizar la operación comercial.

> NexusMarket usa una identidad visual original inspirada en patrones de marketplace. No usa marcas, logos ni activos propietarios de ningún proyecto fuente.

## Project Status

La documentación y los contratos del proyecto están completos y alineados (IN_PROGRESS). La implementación del backend y del frontend está pendiente, incluyendo el build, las pruebas y la entrega con Docker. El trabajo restante se rastrea en el estado del orquestador, incluyendo las discrepancias de contratos conocidas y los controles de entrega final.

## Highlights

- Marketplace con cinco roles operativos: `BUYER`, `SELLER`, `LOGISTICS_OPERATOR`, `ADMINISTRATOR` y `SUPERVISOR`.
- Modelo de negocio orientado al dominio con entidades, value objects, servicios de dominio y excepciones explícitas.
- Arquitectura hexagonal con input ports, output ports y adaptadores de tecnología.
- Backend Java + Spring Boot para la API del marketplace.
- Frontend React + TypeScript con paneles y workflows por rol.
- Persistencia MySQL para datos transaccionales.
- Persistencia MongoDB para registros de auditoría.
- Autenticación JWT y autorización por roles.
- Manejo global de excepciones REST con códigos de error estables y correlación de IDs de petición.
- Entorno Docker Compose que inicia frontend, backend, MySQL y MongoDB juntos.

## Architecture

```text
                            +----------------------+
                            | React Frontend       |
                            | frontend/             |
                            | adapters + role UX    |
                            +----------+-----------+
                                       |
                           HTTP + JWT + CORS
                                       |
                                       v
                            +----------------------+
                            | Spring Boot Backend  |
                            | backend/src/          |
                            | REST + application    |
                            +----+------------+----+
                                 |            |
                               Spring Data    Spring Data
                                 |            |
                                 v            v
                          +-----------+  +-----------+
                          | MySQL     |  | MongoDB   |
                          | bank_db   |  | audit_db  |
                          +-----------+  +-----------+
```

### Architectural patterns

- **Domain-Driven Design**: los conceptos de negocio se representan como entidades de dominio, value objects y servicios.
- **Hexagonal architecture**: la lógica de dominio depende de ports, nunca de bases de datos ni frameworks HTTP.
- **Ports and adapters**: persistencia, REST, seguridad y configuración son adaptadores reemplazables.
- **Dependency inversion**: los casos de uso coordinan servicios de dominio a través de contratos.
- **Anti-corruption boundaries**: los DTOs y documentos de persistencia se mapean antes de entrar al dominio.
- **Explicit error taxonomy**: validación, autenticación, autorización, not-found, conflict, dependencia e errores internos usan categorías estables.
- **Docker-first development**: toda la ejecución y validación de la aplicación ocurre a través de contenedores.
## Technology Stack

NexusMarket separa la entrega del navegador, la orquestación de la aplicación, las reglas de negocio y la persistencia. Las tecnologías se asignan deliberadamente a límites arquitectónicos específicos.

### Backend technologies

| Technology | Version in project | Role | Boundary and rationale |
|---|---:|---|---|
| Java | `17` | Lenguaje y ejecución del API del marketplace. | Encapsula la lógica de aplicación, casos de uso y seguridad. El dominio no depende de Java globals. |
| Spring Boot | `^3.2.0` | Framework de la capa de aplicación y de infraestructura. | Implementa los adaptadores REST y de persistencia sin contener reglas de negocio del dominio. |
| Spring Data JPA | `^3.2.0` | Acceso a datos relacionales. | Implementa output ports y mapea datos operacionales a MySQL sin filtrar entidades del dominio. |
| MySQL | Docker image `8.0` | Datos operacionales transaccionales. | Almacena usuarios, productos, inventario, pedidos y estado relacional asociado. |
| MongoDB | Docker image `6.0` | Historial de auditoría. | Almacena registros append-orientation de forma independiente a los agregados transaccionales. |
| MongoDB Driver | `^4.10.0` | Conexión a MongoDB para la capa de infraestructura. | Implementa el output port de auditoría sin filtrar el dominio. |
| JWT | API security boundary | Carry la identidad autenticada y la reclamación de rol. | La API firma y verifica tokens; la autorización se aplica en el servidor para cada operación protegida. |
| `dotenv` | `^17.4.2` | Carga la configuración de runtime desde variables de entorno. | Mantiene puertos, conexiones de base de datos y umbrales fuera del código fuente. |
| Springdoc OpenAPI | `^2.3.0` | Documentación de la API REST. | Hace explícito el contrato HTTP y los esquemas de entrada/salida. |
| Lombok | `^1.18.30` | Reduce la verbosidad de las entidades y DTOs. | Solo en la capa de aplicación/infraestructura; el dominio permanece limpio. |

#### Backend technology flow

```text
Request HTTP
  -> Spring Security filter y controladores REST
  -> validación de DTO y mapeo
  -> input port por rol
  -> implementación de caso de uso
  -> entidades, value objects y servicios de dominio
  -> output port
  -> Spring Data JPA / MySQL o MongoDB Driver / MongoDB adapter
### Frontend technologies

| Technology | Version in project | Role | Boundary and rationale |
|---|---|---|---|
| React | `^18.2.0` | Renderizado de componentes y estado de interacción. | Posee la presentación e interacción del usuario, no los invariantes de negocio autoritativos. |
| React DOM | `^18.2.0` | Monta el aplicación React en el navegador. | Límite de entrega del navegador para el árbol de componentes. |
| TypeScript | `~5.4.0` | Tipado de modelos, ports, servicios, adaptadores y props. | Mantiene contratos del cliente explícitos mientras las respuestas se mapean y validan en runtime. |
| Vite | `^5.0.0` | Servidor de desarrollo y build de assets. | Produce assets estáticos servidos por Nginx en la imagen de runtime. |
| `@vitejs/plugin-react` | `^4.0.0` | Integración del transform de React con Vite. | Conecta convenciones de React con el pipeline de Vite. |
| React Router DOM | `^6.20.0` | Enrutamiento por URL, navegación protegida y selección de pantalla por rol. | Organiza flujos de usuario; no reemplaza la autorización del backend. |
| SweetAlert2 | `^11.10.0` | Retroalimentación de confirmación, éxito y error. | El adaptador centralizado de alertas evita duplicar el comportamiento en las páginas. |
| Testing Library | `@testing-library/react` | Pruebas de componentes y interacción desde la perspectiva del usuario. | Las afirmaciones se centran en el comportamiento visible, etiquetas, roles y resultados. |
| Vitest | `^1.6.0` | Scripts unitarios, de componentes y de pruebas en vivo. | Ejecuta comprobaciones locales rápidas y flujos en vivo contra el API de Docker. |
| Oxlint | `^0.11.0` | Análisis estático del frontend. | Busca incidencias comunes de corrección y mantenibilidad antes de las comprobaciones de runtime. |
| Playwright Core | `^1.40.0` | Automatización de navegador para evidencia de screenshots. | Captura evidencia visual resposnive en anchos móvil, tablet y desktop. |
| Nginx | Docker runtime image | Sirve los assets Vite compilados. | Mantiene la imagen de frontend enfocada en entrega estática. |

#### Frontend technology flow

```text
Interacción del navegador
  -> ruta React y módulo por rol
  -> servicio de aplicación o ViewModel
  -> frontend domain port
  -> adaptador HTTP + adaptador de sesión
  -> API con Bearer JWT
  -> respuesta mapeada o error tipado
  -> estado React + retroalimentación SweetAlert2
```

### Platform and delivery technologies

| Technology | Role in this project | Operational detail |
|---|---|---|
| Docker | Empaqueta backend y frontend con dependencias de runtime reproducibles. | Los comandos de backend y frontend se ejecutan dentro de imágenes; no se requiere Node/npm en el host. |
| Docker Compose v2 | Describe la topología local completa. | Inicia `frontend`, `market-api`, `mysql-db` y `mongo-db` en la red bridge `market-net`. |
| Docker health checks | Coordina la disponibilidad de arranque. | El API espera MySQL y MongoDB sanos; el frontend espera el endpoint de health del API. |
| MySQL named volume | Persiste datos operacionales entre reinicios. | Volumen de Compose: `mysql_data`. |
## Repository Structure

```text
.
+-- backend/
|   +-- src/
|   |   +-- main/
|   |   |   +-- java/
|   |   |   |   +-- com/
|   |   |   |       +-- nexusmarket/
|   |   |   |           +-- application/   # Casos de uso y servicios de aplicación
|   |   |   |           +-- domain/        # Entidades, value objects, excepciones, ports
|   |   |   |           +-- infrastructure/ # JPA, MongoDB, seguridad y adaptadores
|   |   |   |           +-- NexusMarketApplication.java
|   |   |   +-- resources/
|   |   +-- test/
|   |       +-- java/
|   +-- Dockerfile
|   +-- pom.xml
|   +-- .env.example
+-- frontend/
|   +-- src/
|   |   +-- adapters/
|   |   +-- app/
|   |   +-- application/
|   |   +-- components/
|   |   +-- domain/
|   |   +-- modules/
|   |   +-- styles/
|   |   +-- main.tsx
|   |   +-- vite-env.d.ts
|   +-- test/
|   |   +-- screenshots/
|   +-- Dockerfile
|   +-- package.json
|   +-- vite.config.ts
|   +-- tsconfig.json
|   +-- .env.example
+-- SDD/
|   +-- adapters/
|   |   +-- Api-rest-endpoints.md
|   +-- domain/
|   |   +-- domain_model.md
|   |   +-- domain_services.md
|   |   +-- domain_value_objects.md
|   |   +-- input-ports.md
|   |   +-- output-ports.md
|   |   +-- services/
|   |       +-- buyer-services.md
|   |       +-- seller-services.md
|   |       +-- logistics-operator-services.md
|   |       +-- administrator-services.md
|   |       +-- supervisor-services.md
|   +-- Software architecture.md/
|   +-- enunciado.md
|   +-- orchestrator-state.md
|   +-- contract-alignment.md
|   +-- orchestrator-prompt.md
+-- docker-compose.yml
+-- README.md
+-- .env.example
```

## Backend Capabilities

The backend exposes workflows for:

- Public access and onboarding.
- Buyer registration, profile, cart and orders.
- Seller registration, catalog, inventory and order management.
- Logistics operator shipment, delivery and tracking.
- Administrator administration, billing, returns and refunds.
- Supervisor dashboards and KPI metrics.
- Product catalog with physical and digital variants.
- Distributed inventory with reservations and stock validation.
- Secure checkout with idempotency on payments.
- Return and refund workflows.
- Administrative reporting.

Protected endpoints require a JWT. The backend returns a uniform error envelope with a stable error code and `X-Request-Id` correlation value.

## Frontend Experience

The frontend presents an original marketplace experience under the NexusMarket identity:

- Login and registration flows with field validation.
- Role-based protected navigation.
- Product summary dashboards.
- Buyer, seller, logistics, administrator and supervisor workflows.
- Loading skeletons, empty states and retry actions.
- SweetAlert2 confirmations for financial and destructive operations.
- Error feedback for `401`, `403`, `404`, `409`, `422`, `503` and `500` responses.
- Responsive layouts for 360px, 768px and 1440px viewports.
- Accessibility checks for labels, keyboard navigation, focus order, contrast and reduced motion.

## Running the Complete Stack

Docker Compose is the only supported execution path. Start Docker Desktop first.

From the repository root:

```powershell
docker compose config --quiet
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Open:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8080/health

Expected services:

| Service | Purpose | Address |
|---|---|---|
| `frontend` | React application served by Nginx | `localhost:5173` |
| `market-api` | Spring Boot REST API | `localhost:8080` |
| `mysql-db` | Relational persistence | host `3306`, container `3306` |
| `mongo-db` | Audit persistence | `localhost:27017` |

Inspect logs:

```powershell
docker compose logs --tail=200 market-api
docker compose logs --tail=200 frontend
docker compose logs --tail=200 mysql-db
docker compose logs --tail=200 mongo-db
```

Stop the stack while preserving data:

```powershell
docker compose down
```

Delete database volumes only intentionally:

```powershell
docker compose down -v
```

## Validation

Backend build and tests inside Docker:

```powershell
docker compose exec market-api mvn clean verify
```

Backend seed data (development data):

```powershell
docker compose exec market-api mvn spring-boot:run -Dspring-boot.run.arguments=--spring.batch.initializer.enabled=false
```

Frontend validation image:

```powershell
docker build --target build --build-arg VITE_API_BASE_URL=http://localhost:8080 -t nexusmarket-frontend-validation ./frontend
docker run --rm nexusmarket-frontend-validation npm run lint
docker run --rm nexusmarket-frontend-validation npm run test -- --run
```

Frontend live tests, with the backend already running:

```powershell
docker run --rm --network host -e LIVE_BASE_URL=http://localhost:8080 nexusmarket-frontend-validation npm run test:live
```

Screenshot evidence:

```powershell
docker run --rm -v "${PWD}/frontend/test/screenshots:/app/test/screenshots" nexusmarket-frontend-validation npm run shots
```

Visual evidence is stored under `frontend/test/screenshots/` and includes mobile, tablet and desktop viewports.

## Documentation

- Functional specification: [SDD/enunciado.md](SDD/enunciado.md).
- Software architecture: [SDD/Software architecture.md/software_architecture.md](SDD/Software architecture.md/software_architecture.md).
- REST contract: [SDD/Adapters/Api-rest-endpoints.md](SDD/Adapters/Api-rest-endpoints.md).
- Contract alignment policy: [SDD/contract-alignment.md](SDD/contract-alignment.md).
- Domain model: [SDD/Domain/domain_model.md](SDD/Domain/domain_model.md).
- Domain services: [SDD/Domain/domain_services.md](SDD/Domain/domain_services.md).
- Domain value objects: [SDD/Domain/domain_value_objects.md](SDD/Domain/domain_value_objects.md).
- Input ports: [SDD/Domain/input-ports.md](SDD/Domain/input-ports.md).
- Output ports: [SDD/Domain/output-ports.md](SDD/Domain/output-ports.md).
- Backend orchestrator prompt: [SDD/orchestrator-prompt.md](SDD/orchestrator-prompt.md).
- Orchestrator state: [SDD/orchestrator-state.md](SDD/orchestrator-state.md).
- Backend CORS security: [SDD/backend_cors_security.md](SDD/backend_cors_security.md).

## Author

**andfsanchezag**

This project was developed as a portfolio-oriented demonstration of full-stack Java and TypeScript, domain modeling, hexagonal architecture, secure API design and Docker-based delivery.

## License

This project is distributed under the license defined in [LICENSE](LICENSE).



