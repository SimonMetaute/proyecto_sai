# Software Architecture - NexusMarket

## 1. Propósito del documento

Este documento describe la arquitectura software de NexusMarket, una plataforma de marketplace digital que conecta compradores, vendedores, operadores logísticos y administradores bajo un modelo de negocio orientado al dominio. La arquitectura está diseñada con principios de Domain-Driven Design (DDD), arquitectura hexagonal y separación clara de responsabilidades para facilitar escalabilidad, mantenibilidad, trazabilidad y evolución del negocio.

La solución busca equilibrar dos objetivos fundamentales:

- Permitir crecimiento operacional del marketplace sin comprometer la integridad del dominio.
- Garantizar que cada subdominio mantenga reglas de negocio consistentes, servicios bien definidos y contratos claros con capas externas.

## 2. Contexto del negocio

NexusMarket opera como intermediario digital entre compradores y vendedores, gestionando actividades como:

- Registro e identidad de usuarios
- Publicación y validación de productos
- Gestión de inventarios y almacenes
- Carrito de compras y órdenes
- Facturación y pagos
- Logística y entregas
- Devoluciones, reembolsos y soporte postventa
- Administración y reportes

El sistema no se modela como un único módulo monolítico, sino como un conjunto de subdominios con agregados, value objects, servicios de dominio y ports bien definidos. Cada parte del sistema tiene responsabilidades específicas y su propia coherencia interna.

## 3. Principios arquitectónicos

### 3.1 Arquitectura Hexagonal

La aplicación se estructura alrededor del dominio, evitando que la lógica de negocio dependa directamente de bases de datos, APIs externas, colas o frameworks. Las dependencias fluyen desde la capa externa hacia los ports del dominio, y no al revés.

### 3.2 DDD como base del diseño

- El dominio se organiza por subdominios y bounded contexts.
- Las entidades y agregados encapsulan reglas de negocio.
- Los value objects garantizan inmutabilidad y consistencia.
- Los servicios de dominio expresan capacidades del negocio.

### 3.3 Separación de responsabilidades

- Domain Layer: reglas, entidades y comportamiento central.
- Application Layer: casos de uso y orchestration de procesos de negocio.
- Infrastructure Layer: persistencia, integrations, messaging, cache, file storage.
- Presentation Layer: APIs, UI, gateways, web clients.

### 3.4 Trazabilidad y auditoría

Todo cambio crítico debe registrarse con:

- Identificador de operación
- Actor responsable
- Timestamp
- Entidad afectada
- Resultado de validación
- Evento de negocio asociado

### 3.5 Seguridad y control de acceso

Cada operación debe validar:

- Identidad del usuario
- Rol o permisos del actor
- Alcance de negocio permitido
- Estado del usuario o del recurso
- Condiciones de cumplimiento y auditoría

## 4. Visión general de la arquitectura

La arquitectura de NexusMarket se compone de cinco capas principales:

1. Presentation Layer
   - API REST / GraphQL
   - Portal de administración
   - Panel de vendedores
   - Frontend de comprador

2. Application Layer
   - Use cases
   - Servicios de aplicación
   - Coordinación entre dominios
   - Orquestación de transacciones y validaciones

3. Domain Layer
   - Entities
   - Aggregates
   - Value Objects
   - Domain services
   - Domain events

4. Infrastructure Layer
   - Repositories
   - Persistence adapters
   - External integrations
   - Event bus
   - File and notification services

5. Cross-cutting Layer
   - Authentication and authorization
   - Audit logging
   - Observability
   - Config management
   - Error handling
   - Security policies

## 5. Estructura modular por subdominio

NexusMarket se organiza en subdominios funcionales con responsabilidades claramente acotadas:

### 5.1 User & Identity

Responsable de:

- Registro de usuarios
- Autenticación y acceso
- Roles y permisos
- Estado del usuario
- Consentimiento y privacidad

Entidades clave:

- User
- IdentityDocument
- UserStatus

### 5.2 Customer Management

Responsable de:

- Perfil del comprador
- Dirección de entrega
- Preferencias y privacidad
- Validación de pagos y capacidad de compra

Entidades clave:

- Buyer
- DeliveryAddress
- PaymentMethod

### 5.3 Vendor Management

Responsable de:

- Registro de sellers
- Verificación comercial
- Perfil de negocio
- Cuentas de settlement
- Cumplimiento y auditoría

Entidades clave:

- Seller
- Store
- CommercialAccount
- VerificationStatus

### 5.4 Catalog

Responsable de:

- Productos y variantes
- Publicación y categorización
- Validación comercial
- Búsqueda y disposición visual

Entidades clave:

- Product
- ProductVariant
- ProductCategory
- ProductStatus

### 5.5 Inventory & Warehouses

Responsable de:

- Inventario por almacén
- Ubicaciones físicas
- Movimientos de stock
- Reservas y disponibilidad

Entidades clave:

- Warehouse
- Inventory
- WarehouseLocation
- ProductStock

### 5.6 Cart & Checkout

Responsable de:

- Carrito de compras
- Líneas del carrito
- Validación de condiciones
- Conversión a orden

Entidades clave:

- ShoppingCart
- CartLine

### 5.7 Order Management

Responsable de:

- Creación y confirmación de órdenes
- Estado de la orden
- Aprobación y prepación
- Envío y cierre

Entidades clave:

- Order
- OrderLine
- OrderStatus

### 5.8 Billing & Payments

Responsable de:

- Cálculo de pagos
- Facturación
- Comisiones y settlement
- Trazabilidad financiera

### 5.9 Logistics

Responsable de:

- Despachos
- Tracking
- Transporte
- Entregas y coordinación

### 5.10 Post-Sale & Support

Responsable de:

- Devoluciones
- Reembolsos
- Reclamos
- Resolución de incidentes postventa

### 5.11 Administration

Responsable de:

- Monitoreo de operación
- Analítica
- Consolidación de indicadores
- Control de cumplimiento

## 6. Capas y responsabilidades técnicas

### 6.1 Domain Layer

Contiene las reglas centrales del negocio y los agregados. Debe ser independiente de frameworks, DBs y servicios externos.

Responsabilidades:

- Entidades y agregados
- Value objects
- Domain services
- Domain events
- Validaciones de negocio

### 6.2 Application Layer

Se encarga de coordinar casos de uso.

Responsabilidades:

- Invocar servicios del dominio
- Gestionar transacciones
- Orquestar procesos complejos
- Traducir entradas externas a comandos del dominio

### 6.3 Infrastructure Layer

Implementa adaptadores para persistencia e integraciones externas.

Responsabilidades:

- Repositories
- Adapters para bases de datos
- Integración con pagos
- Integración con logística
- Messaging y kafka / event bus
- Notificaciones

### 6.4 Presentation Layer

Expone el sistema al exterior.

Responsabilidades:

- APIs públicas y privadas
- Endpoints REST
- Autenticación y autorización
- Validación de DTOs
- Serialización de resultados

## 7. Ports y Adapters

La arquitectura utiliza el patrón de ports and adapters para desacoplar el dominio de la infraestructura.

### 7.1 Input Ports

Son interfaces que representan casos de uso o comandos del negocio.

Ejemplos:

- RegisterUser
- CreateOrder
- PublishProduct
- ReserveInventory
- AuthorizeSeller

### 7.2 Output Ports

Son contratos para persistencia e integración.

Ejemplos:

- UserRepository
- ProductRepository
- InventoryRepository
- PaymentGatewayPort
- LogisticProviderPort
- AuditLogPort

### 7.3 Adapters

Los adaptadores implementan los ports y enlazan el dominio con tecnologías concretas.

Ejemplos:

- SQL repository implementation
- MongoDB adapter
- REST client payment service
- Kafka event publisher
- Redis cache adapter

## 8. Flujos arquitectónicos principales

### 8.1 Flujo de compra

1. El cliente accede al catálogo.
2. El sistema valida producto, disponibilidad y elegibilidad del comprador.
3. El carrito agrega líneas y valida condiciones del pedido.
4. La orden se crea en la capa de aplicación.
5. El dominio reserva inventario y valida pagos.
6. La infraestructura persiste la orden y publica eventos de negocio.
7. La logística y el soporte posterior se activan según el estado de la orden.

### 8.2 Flujo de publicación de producto

1. El vendedor envía una solicitud de publicación.
2. La capa de aplicación valida la elegibilidad del seller.
3. El dominio valida categoría, precio, stock inicial y cumplimiento.
4. El repositorio persiste el producto y el estado de publicación.
5. Se registran eventos de auditoría y catalog tracking.

### 8.3 Flujo de gestión de stock

1. Se recibe un movimiento de inventario.
2. Se valida el almacén, la existencia del producto y el tipo de movimiento.
3. El dominio ajusta los niveles de stock y reservas.
4. El sistema genera un evento de inventario actualizado.
5. Los sistemas dependientes reevaluan disponibilidad y logística.

## 9. Diagrama de arquitectura

```text
+-------------------------+
| Presentation Layer      |
| API / Web / Admin       |
+-----------+-------------+
            |
            v
+-----------+-------------+
| Application Layer       |
| Use Cases / Services    |
+-----------+-------------+
            |
            v
+-----------+-------------+
| Domain Layer            |
| Entities / Aggregates   |
| Value Objects / Events  |
+-----------+-------------+
            |
      +-----+-----+
      |           |
      v           v
+----------------+  +----------------------+
| Infrastructure |  | Cross-cutting       |
| Repositories   |  | Auth / Audit / Obs  |
| External APIs  |  | Security / Config   |
+----------------+  +----------------------+
```

## 10. Requisitos no funcionales

### 10.1 Escalabilidad

El sistema debe soportar crecimiento en volumen de usuarios, productos, transacciones y eventos sin degradar la experiencia de compra ni la consistencia del negocio.

### 10.2 Seguridad

Debe existir control de identidad, autorización por rol, encriptación de datos sensibles, trazabilidad operacional y auditoría de cambios críticos.

### 10.3 Disponibilidad

Los flujos críticos como autenticación, pagos, reservas y órdenes deben operar con tolerancia a fallos y mecanismos de recuperación ante interrupciones.

### 10.4 Consistencia

Se debe priorizar consistencia transaccional en procesos críticos como reserva de inventario, pago y confirmación de orden.

### 10.5 Observabilidad

La plataforma debe registrar métricas, logs distribuidos, trazabilidad de eventos y alertas operativas para monitorear salud del sistema y diagnósticos de incidentes.

## 11. Restricciones arquitectónicas obligatorias

1. El dominio no debe depender de capas de infraestructura ni de frameworks externos.
2. Las entidades de dominio deben encapsular validaciones de negocio relevantes.
3. Los value objects deben ser inmutables.
4. Las transacciones deben ser aplicadas en los agregados relevantes del negocio.
5. Los servicios de dominio deben recibir modelos de dominio, no primitivas.
6. Los repositorios deben estar definidos en términos del dominio y no del almacenamiento físico.
7. Los eventos de dominio deben ser utilizados para comunicar cambios de estado importantes.
8. Todo cambio crítico requiere auditoría.
9. Los casos de uso deben coordinar procesos, no implementar reglas de negocio.
10. Las integraciones externas deben ser adaptadas mediante ports.
11. Las APIs no deben exponer entidades internas del dominio directamente.
12. El acceso debe estar restringido por roles y permisos de negocio.
13. El usuario no debe poder realizar acciones fuera del alcance de su perfil.
14. No se deben hacer validaciones críticas solamente en la capa de presentación.
15. La capa de infraestructura no puede contener lógica de negocio propia.
16. Los modelos de persistencia deben ser adaptadores del modelo de dominio.
17. La plataforma debe mantener trazabilidad de cada operación comercial relevante.
18. Los productos no pueden publicarse si el vendedor no cumple criterios de verificación.
19. El inventario no puede quedar en un estado inconsistente entre reservas y stock disponible.
20. Las órdenes deben ser inmutables en estados cerrados.
21. La arquitectura debe permitir evolución incremental por subdominio.
22. Los cambios en un subdominio no deben romper el comportamiento de otros dominios.
23. Las integraciones con gateways de pago deben manejar idempotencia.
24. La lógica de logística debe estar desacoplada del cálculo comercial de la orden.
25. Las devoluciones y reembolsos deben ser rastreables con su causa y su impacto financiero.
26. Los eventos de negocio deben ser persistidos o registrados para auditoría.
27. La comunicación entre módulos debe basarse en contratos y no en implementaciones concretas.
28. La arquitectura debe soportar pruebas unitarias y de integración por capa.
29. Se debe separar claridad de negocio de detalles de infraestructura.
30. La seguridad se debe considerar en cada flujo crítico, no solo al final del proceso.

## 12. Estrategia de evolución

La arquitectura de NexusMarket está preparada para crecer en dos dimensiones:

- Vertical: añadir más funcionalidades dentro de cada subdominio.
- Horizontal: ampliar canales de acceso, integraciones externas y nuevos mercados o regiones.

Esto se logra mediante:

- Bounded contexts bien definidos
- Dominio desacoplado de infraestructura
- Contratos estables entre módulos
- Event-driven communication para procesos no transaccionales
- Uso de servicios de aplicación para orquestación

## 13. Conclusión

NexusMarket requiere una arquitectura sólida, modular y orientada al dominio para soportar la complejidad de un marketplace digital multi-actores. La separación entre capas, el uso de DDD y la adopción de ports and adapters permiten que el sistema evolucione de forma controlada, mantenga la integridad del negocio y soporte nuevas capacidades con bajo acoplamiento.

La arquitectura propuesta no solo responde a requisitos funcionales actuales, sino que también proporciona una base técnica clara para crecimiento, seguridad, trazabilidad y mantenimiento a largo plazo.
