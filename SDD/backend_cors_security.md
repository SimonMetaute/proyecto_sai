# Backend CORS Security - NexusMarket

## 1. Purpose

This document defines the backend acceptance policy for the NexusMarket frontend clients and the security boundary for browser consumption of the REST API at `http://localhost:8080`. It is the marketplace-specific complement to `backend_cors_sec.md`.

Unlike the single-frontend reference, NexusMarket exposes several browser clients that must be allowed explicitly: the buyer portal, the seller panel, the administrator panel, and the logistics operator panel. This document also reflects the marketplace authentication model (JWT in the `Authorization` header) and the role-scoped endpoint groups defined in `SDD/Adapters/Api-rest-endpoints.md`.

## 2. Development origins

The backend must allow only the explicitly configured frontend origins of the marketplace. The allow-list is provided through an environment variable, `FRONTEND_ORIGINS`, as a comma-separated list of exact URLs. Forbidden values include any origin not present in the allow-list, and `*` when credentials or the `Authorization` header are involved.

For local development, the backend must allow at least the following origins, and the frontend of each client must be configured accordingly:

| Client | Default development origin | Role(s) served |
|---|---|---|
| Buyer portal | `http://localhost:5173` | `BUYER` |
| Seller panel | `http://localhost:5174` | `SELLER` |
| Administration panel | `http://localhost:5175` | `ADMINISTRATOR` |
| Logistics operator panel | `http://localhost:5176` | `LOGISTICS_OPERATOR` |

- The exact origin set must be configurable via `FRONTEND_ORIGINS`; do not hardcode `*` when credentials or authorization headers are involved.
- Production origins must be explicitly configured and must not inherit development defaults.
- Public endpoints (authentication and public catalog) are still served by the same CORS layer and must pass the same origin validation, because browsers perform preflight requests for them even when no JWT is required.
## 3. CORS policy

Allowed configuration:

- `origin`: allow-list containing `FRONTEND_ORIGINS`.
- `methods`: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- `allowedHeaders`: `Authorization, Content-Type, Accept, X-Request-Id`.
- `exposedHeaders`: `X-Request-Id`.
- `credentials`: `false` while JWT is sent in the `Authorization` header and tokens are not stored in cookies.
- `optionsSuccessStatus`: `204` or the framework equivalent.
- Reject disallowed or unknown origins instead of reflecting arbitrary `Origin` headers.

If the implementation later moves JWT to secure HttpOnly cookies, `credentials` must become `true`, `Access-Control-Allow-Origin` must remain an explicit origin, and CSRF protection must be added. Until that migration, `credentials` stays `false` and tokens travel in the `Authorization` header.

## 4. Security requirements

The following requirements apply to the browser-facing surface of the NexusMarket API:

- The frontend sends `Authorization: Bearer <token>` for protected endpoints.
- CORS does not replace JWT authentication or role authorization; the token is validated by the authentication middleware and the role is enforced in the business layer.
- The backend must not accept, log, or return credentials, passwords or tokens through query parameters.
- Error responses follow `backendSDD/Adapters/Global-exception-handler.md` and must not expose stack traces or database details.
- `X-Request-Id` is accepted, generated when missing, and returned in every response for support diagnostics.
- The backend must validate the `Origin` against the `FRONTEND_ORIGINS` allow-list for every browser request, including public endpoints that do not require a JWT.
- The `Authorization` header is a privileged header: combining it with a wildcard (`*`) origin or with `credentials: true` is a hard policy violation and must never be configured.
- Rate limiting, HTTPS and secure secret configuration are required for production deployment.


## 5. Express profile

Register CORS before routes and before authentication-dependent route handling. The global exception handler remains after all routes.

Conceptual order:

```text
request id -> CORS -> JSON parser -> authentication middleware -> routes -> global error handler
```



## 6. Spring profile

Configure CORS through the Spring Security filter chain or a centralized `WebMvcConfigurer`. The allowed origins and headers must match this document. Preflight `OPTIONS` requests must be accepted without requiring a JWT, while protected business methods remain authenticated.

The origin allow-list must be loaded from `FRONTEND_ORIGINS`, normalized in the same way as the Express profile, and compared against the incoming `Origin` header. 

## 7. Acceptance tests

The backend gate must prove the following for the NexusMarket API:

1. Requests from the buyer portal (`http://localhost:5173`) receive the expected CORS headers.
2. Requests from the seller panel (`http://localhost:5174`) receive the expected CORS headers.
3. Requests from the administration panel (`http://localhost:5175`) receive the expected CORS headers.
4. Requests from the logistics operator panel (`http://localhost:5176`) receive the expected CORS headers.
5. Preflight requests succeed for all documented methods and headers.
6. An unapproved origin is rejected or receives no permissive CORS headers.
7. Public endpoints (`/api/v1/auth/*` and `/api/v1/catalog/*`) pass CORS validation before authentication, and protected paths `GET /api/v1/buyer/profile`, `GET /api/v1/seller/products`, `GET /api/v1/logistics/warehouses`, and `GET /api/v1/admin/users` require a valid role token.
8. Protected requests without JWT return `401`.
9. Protected requests with an incorrect role return `403`.
10. A valid JWT request from an approved origin reaches the endpoint and returns the domain contract defined in `SDD/Adapters/Api-rest-endpoints.md`.
11. Error responses preserve the standard error envelope (`timestamp`, `status`, `code`, `message`, `path`, `requestId`) and include `X-Request-Id`.
12. No wildcard origin is combined with authorization or credentials.
13. Tokens or credentials are never returned through query parameters.
14. The origin allow-list is enforced for every role group (`BUYER`, `SELLER`, `LOGISTICS_OPERATOR`, `ADMINISTRATOR`, `SUPERVISOR`).




## 8. Related mappings

| Concern | Reference |
|---|---|
| Frontend client origins (multi-panel) | `http://localhost:5173`, `:5174`, `:5175`, `:5176` via `FRONTEND_ORIGINS` |
| JWT transport | `Authorization: Bearer <token>` (cookie migration planned; see section 3) |
| Role-scoped endpoint groups | `SDD/Adapters/Api-rest-endpoints.md` (Public / Buyer / Seller / Logistics / Admin / Supervisor) |
| Error envelope and `X-Request-Id` | `backendSDD/Adapters/Global-exception-handler.md` |
| User roles and access rules | `SDD/Domain/Services/user-services.md` (roles, `UserRole`, `UserStatus`) |
| Authentication and authorization gates | `SDD/Domain/Input-ports.md`, `SDD/Domain/Services/user-services.md` |

