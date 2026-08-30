# Modelo de Dominio - NexusMarket

## 1. Introducción

NexusMarket es una plataforma digital centralizada que actúa como intermediario comercial entre compradores y vendedores. Su propósito principal es administrar de manera integral la operación del marketplace, desde el registro de usuarios y la publicación de productos hasta la logística, la facturación y la atención postventa. El sistema garantiza trazabilidad, coordinación y cumplimiento operacional entre todos los actores del ecosistema.

El dominio de negocio se centra en la gestión de una red comercial multiusuario donde cada participante desempeña un rol específico y donde la plataforma asume responsabilidad operativa en la mediación de transacciones, coordinación de entregas y control de la información financiera y logística.

### Objetivos estratégicos del sistema

- Administrar la información completa de usuarios del marketplace.
- Gestionar el registro y administración de vendedores.
- Administrar compradores registrados.
- Controlar la información de bodegas y ubicaciones logísticas.
- Gestionar el catálogo de productos y sus variaciones.
- Administrar el inventario distribuido.
- Gestionar el carrito de compras.
- Controlar el ciclo completo de los pedidos.
- Administrar la facturación de compras.
- Gestionar procesos logísticos y entregas.
- Administrar devoluciones y reembolsos.
- Consolidar información administrativa para consulta y toma de decisiones.

### Visión funcional del dominio

El dominio se compone de varias áreas de negocio interrelacionadas:

- Identidad y usuarios
- Gestión comercial de vendedores
- Catálogo y productos
- Inventario y bodegas
- Compra y carrito
- Pedidos y estados
- Facturación y pagos
- Logística y entregas
- Devoluciones y reembolsos
- Información administrativa y analytics

Desde una perspectiva DDD, NexusMarket se modela como un sistema con múltiples subdominios, entidades de negocio robustas, objetos de valor bien definidos y agregados que preservan consistencia dentro de cada contexto.

## Participantes del Negocio

Cada participante desempeña un único rol dentro del sistema y únicamente podrá interactuar con la información correspondiente a sus funciones.

| Participante | Descripción General |
|---|---|
| Comprador | Persona que adquiere productos publicados. |
| Vendedor | Responsable de registrar y administrar sus productos. |
| Operador Logístico | Encargado de la operación física de bodegas y despachos. |
| Administrador | Responsable de la administración de vendedores y bodegas. |
| Supervisor | Perfil de consulta y seguimiento operativo. |

### Regla de acceso por rol

- Cada usuario del sistema debe estar asociado a un único rol de negocio.
- El acceso a información y procesos está determinado por el rol asignado.
- Los compradores solo pueden gestionar su historial, carrito, compras y soporte asociado.
- Los vendedores solo pueden administrar sus productos, inventarios y pedidos asociados a su operación comercial.
- Los operadores logísticos solo pueden operar sobre bodegas, envíos y trazabilidad física.
- Los administradores tienen permisos de configuración y control operativo del marketplace.
- Los supervisores tienen acceso de consulta y seguimiento, pero no realizan operaciones de negocio críticas de compra, venta o despacho.

---

## 2. Jerarquía de Clases del Dominio

La siguiente jerarquía representa la estructura conceptual del dominio del marketplace, organizada por agregados y componentes funcionales:

```text
NexusMarket
├── Usuario
│   ├── Comprador
│   │   ├── CarritoCompra
│   │   ├── DireccionEntrega
│   │   ├── MetodoPago
│   │   └── HistorialCompras
│   └── Vendedor
│       ├── PerfilVendedor
│       ├── Tienda
│       ├── Bodega
│       ├── CatalogoProductos
│       ├── Inventario
│       └── CuentaComercial
├── Producto
│   ├── CategoriaProducto
│   ├── VarianteProducto
│   ├── AtributoProducto
│   ├── PrecioProducto
│   └── EstadoProducto
├── Pedido
│   ├── LineaPedido
│   ├── EstadoPedido
│   ├── Factura
│   ├── Pago
│   ├── Envio
│   └── Devolucion
├── Bodega
│   ├── UbicacionBodega
│   ├── StockProducto
│   ├── MovimientoInventario
│   └── ReservaInventario
├── Logistica
│   ├── Transportadora
│   ├── RutaEntrega
│   ├── SeguimientoEnvio
│   └── EstadoEntrega
├── Facturacion
│   ├── Factura
│   ├── Impuesto
│   ├── ComisionMarketplace
│   └── LiquidacionVendedor
├── Postventa
│   ├── Devolucion
│   ├── Reembolso
│   ├── Reclamo
│   └── ResolucionDisputa
├── Administracion
│   ├── DashboardOperativo
│   ├── ReporteGeneral
│   ├── Auditoria
│   └── ConsolidadoComercial
└── DominioCompartido
    ├── Moneda
    ├── DocumentoIdentidad
    ├── EstadoGenerico
    └── Notificacion
```

Esta jerarquía expresa la composición del dominio como un conjunto de agregados de negocio, con especial énfasis en las responsabilidades de usuario, catálogo, compras, logística, facturación y administración.

---

## 3. Relaciones del Dominio

El dominio de NexusMarket se estructura alrededor de relaciones entre entidades y agregados. A continuación se presenta el mapeo principal de las relaciones del negocio:

### 3.1 Relación Usuario - Comprador

- Un `Usuario` puede ser registrado como `Comprador`.
- Un comprador puede tener múltiples `DireccionesEntrega`.
- Un comprador puede tener varios `MetodosPago`.
- Un comprador puede generar múltiples `Pedidos`.
- Un comprador puede tener un historial de compras y valoraciones.

### 3.2 Relación Usuario - Vendedor

- Un `Usuario` puede ser registrado como `Vendedor`.
- Un vendedor puede poseer una o varias `Tiendas`.
- Un vendedor puede administrar varias `Bodegas`.
- Un vendedor puede publicar múltiples `Productos`.
- Un vendedor puede tener una `CuentaComercial` para liquidaciones y comisiones.

### 3.3 Relación Vendedor - Producto

- Un vendedor publica uno o varios productos.
- Cada producto pertenece a una categoría.
- Un producto puede tener múltiples `VariantesProducto`.
- Un producto puede estar asociado a registros de stock y disponibilidad por bodega.

### 3.4 Relación Producto - Inventario

- Un producto está asociado a registros de inventario.
- El inventario es gestionado por bodega.
- El sistema valida disponibilidad real antes de confirmar un carrito o un pedido.
- El stock puede ser actualizado por movimientos de entrada/salida.

### 3.5 Relación Comprador - Carrito - Pedido

- Un comprador crea un `CarritoCompra`.
- El carrito acumula líneas de compra (`LineaCarrito`).
- Cuando el comprador confirma la compra, el carrito se convierte en un `Pedido`.
- El pedido crea una orden de compra vinculada a producto, cantidades, valor y logística.

### 3.6 Relación Pedido - Factura - Pago

- Un pedido genera una `Factura` cuando transcurre la compra.
- El pedido requiere un `Pago` asociado.
- El pago puede estar en estado pendiente, autorizado, rechazado o reembolsado.
- La factura refleja impuestos, totales y comisiones del marketplace.

### 3.7 Relación Pedido - Logística

- Un pedido puede generar una o varias `OrdenesEntrega`.
- El envío se asocia a una dirección de entrega y una transportadora.
- El estado del envío se actualiza durante el ciclo de entrega.
- La logística puede requerir coordinación con la bodega y el vendedor.

### 3.8 Relación Pedido - Postventa

- Un pedido puede tener devoluciones, reclamos y reembolsos.
- Una devolución está asociada a un motivo, un estado y una evaluación del caso.
- La plataforma puede emitir una resolución de disputa o un cierre de caso.

---

## 4. Entidades Detalladas

A continuación se describen las entidades principales del dominio, con sus atributos, tipo de dato, responsabilidades y reglas clave.

### 4.1 Usuario

| Atributo | Tipo | Descripción |
|---|---|---|
| idUsuario | UUID | Identificador único del usuario. |
| tipoUsuario | Enum | Puede ser Comprador, Vendedor o Administrador. |
| nombre | String | Nombre principal del usuario. |
| apellido | String | Apellido principal del usuario. |
| email | String | Correo electrónico de acceso. |
| telefono | String | Número de contacto. |
| documentoIdentidad | DocumentoIdentidad | Tipo y número de documento. |
| fechaRegistro | DateTime | Fecha en que el usuario fue creado. |
| estado | EstadoUsuario | Estado del usuario dentro del sistema. |
| fechaActualizacion | DateTime | Fecha de última modificación. |

Reglas de negocio:
- El email debe ser único en el sistema.
- El documento de identidad debe ser válido y verificable.
- Un usuario no puede tener más de un rol principal activo en simultáneo.
- Los cambios de estado deben quedar registrados en auditoría.

### 4.2 Comprador

| Atributo | Tipo | Descripción |
|---|---|---|
| idComprador | UUID | Identificador del comprador. |
| idUsuario | UUID | Relación con la entidad Usuario. |
| historialCompras | List<Pedido> | Pedidos realizados. |
| direccionesEntrega | List<DireccionEntrega> | Direcciones asociadas al comprador. |
| metodosPago | List<MetodoPago> | Métodos habilitados para pago. |
| nivelConfianza | Enum | Nivel de confianza basado en comportamiento. |
| fechaUltimaCompra | DateTime | Última compra registrada. |

Reglas de negocio:
- El comprador debe tener al menos una dirección principal para compras.
- No puede comprar productos fuera de la disponibilidad del stock.
- El historial debe estar inmutable para transacciones cerradas.

### 4.3 Vendedor

| Atributo | Tipo | Descripción |
|---|---|---|
| idVendedor | UUID | Identificador del vendedor. |
| idUsuario | UUID | Relación a la entidad Usuario. |
| nombreComercial | String | Nombre visible de la tienda o del negocio. |
| tipoPersona | Enum | Natural o jurídica. |
| estadoVerificacion | Enum | Pendiente, Verificado, Rechazado. |
| tienda | Tienda | Tienda principal asociada. |
| cuentaComercial | CuentaComercial | Cuenta para pagos y comisiones. |
| reputacion | Decimal | Valoración general del vendedor. |
| fechaAprobacion | DateTime | Fecha de validación del vendedor. |

Reglas de negocio:
- Un vendedor debe estar verificado antes de publicar productos.
- El nombre comercial debe ser único a nivel marketplace.
- Las cuentas de liquidación deben ser consistentes con la información tributaria.

### 4.4 Tienda

| Atributo | Tipo | Descripción |
|---|---|---|
| idTienda | UUID | Identificador único de la tienda. |
| idVendedor | UUID | Vendedor dueño de la tienda. |
| nombre | String | Nombre comercial de la tienda. |
| descripcion | String | Descripción visible. |
| categoriaTienda | Enum | Categoría de negocio. |
| estado | Enum | Activa, Inactiva, Suspendida. |
| fechaCreacion | DateTime | Fecha de creación. |

Reglas de negocio:
- Una tienda solo puede pertenecer a un vendedor activo.
- La suspensión de la tienda impide la publicación de nuevos productos.

### 4.5 Bodega

| Atributo | Tipo | Descripción |
|---|---|---|
| idBodega | UUID | Identificador de la bodega. |
| idVendedor | UUID | Vendedor responsable. |
| nombre | String | Nombre de la bodega. |
| ubicacion | UbicacionBodega | Dirección o coordenada física. |
| capacidad | Decimal | Capacidad estimada de almacenamiento. |
| estado | Enum | Operativa, Cerrada, Mantenimiento. |
| fechaCreacion | DateTime | Fecha de registro. |

Reglas de negocio:
- La bodega debe estar operativa para despachar órdenes.
- El stock asociado a una bodega no puede quedar en estado inconsistente.

### 4.6 Producto

| Atributo | Tipo | Descripción |
|---|---|---|
| idProducto | UUID | Identificador único del producto. |
| nombre | String | Nombre visible del producto. |
| descripcion | String | Descripción comercial. |
| categoria | CategoriaProducto | Grupo o categoría del producto. |
| sku | String | Código único interno. |
| vendedor | Vendedor | Vendedor responsable. |
| precioBase | Decimal | Precio base del producto. |
| estadoProducto | EstadoProducto | Estado de publicación y disponibilidad. |
| fechaPublicacion | DateTime | Fecha de publicación. |
| marca | String | Marca del producto. |

Reglas de negocio:
- El sku debe ser único globalmente.
- Un producto no puede estar publicado si el vendedor no está verificado.
- El pricing debe ser consistente con el tipo de producto y la política del marketplace.

### 4.7 VarianteProducto

| Atributo | Tipo | Descripción |
|---|---|---|
| idVariante | UUID | Identificador de la variante. |
| idProducto | UUID | Producto asociado. |
| atributo | String | Ejemplo: color, talla, capacidad. |
| valor | String | Valor específico de la variante. |
| precioAdicional | Decimal | Aumento o descuento para la variante. |
| skuVariante | String | Código interno de la variante. |

Reglas de negocio:
- La combinatoria de variantes no puede quedar duplicada.
- El precio de una variante debe ser compatible con el precio base.

### 4.8 Inventario

| Atributo | Tipo | Descripción |
|---|---|---|
| idInventario | UUID | Identificador de inventario. |
| idProducto | UUID | Producto asociado. |
| idBodega | UUID | Bodega responsable. |
| stockDisponible | Integer | Unidades disponibles. |
| stockReservado | Integer | Unidades reservadas por pedidos abiertos. |
| stockTotal | Integer | Total disponible más reservado. |
| fechaActualizacion | DateTime | Fecha del último movimiento. |

Reglas de negocio:
- stockDisponible + stockReservado = stockTotal.
- No puede haber reservas sin pedido válido asociado.
- La actualización de inventario debe hacerse bajo transacción.

### 4.9 CarritoCompra

| Atributo | Tipo | Descripción |
|---|---|---|
| idCarrito | UUID | Identificador del carrito. |
| idComprador | UUID | Comprador dueño. |
| lineasCarrito | List<LineaCarrito> | Productos seleccionados. |
| subtotal | Decimal | Suma parcial sin impuestos. |
| total | Decimal | Valor total del carrito. |
| fechaActualizacion | DateTime | Última modificación. |
| estado | Enum | Abierto, Convertido, Cancelado. |

Reglas de negocio:
- El carrito no puede contener productos de vendedores no elegibles.
- Si cambia la disponibilidad de un producto, debe actualizarse el carrito.
- El carrito se convierte en pedido solo cuando se confirma la compra.

### 4.10 Pedido

| Atributo | Tipo | Descripción |
|---|---|---|
| idPedido | UUID | Identificador único del pedido. |
| idComprador | UUID | Comprador del pedido. |
| idVendedor | UUID | Vendedor responsable. |
| lineasPedido | List<LineaPedido> | Productos comprados. |
| subtotal | Decimal | Valor base del pedido. |
| impuestos | Decimal | Impuestos aplicados. |
| costoEnvio | Decimal | Coste de envío. |
| total | Decimal | Total final. |
| estadoPedido | EstadoPedido | Estado del ciclo del pedido. |
| fechaCreacion | DateTime | Fecha de creación. |
| fechaEntregaEstimada | DateTime | Fecha estimada de entrega. |

Reglas de negocio:
- Un pedido solo puede generarse si el carrito está válido.
- Debe existir pago válido antes de la confirmación final del envío.
- El pedido debe mantenerse trazable desde creación hasta cierre.

### 4.11 LineaPedido

| Atributo | Tipo | Descripción |
|---|---|---|
| idLineaPedido | UUID | Identificador de la línea. |
| idProducto | UUID | Producto solicitado. |
| cantidad | Integer | Cantidad pedida. |
| precioUnitario | Decimal | Precio por unidad. |
| subtotal | Decimal | Total de la línea. |
| idVariante | UUID | Variante del producto, si aplica. |

Reglas de negocio:
- La cantidad debe ser mayor que cero.
- El subtotal debe coincidir con cantidad × precioUnitario.

### 4.12 Factura

| Atributo | Tipo | Descripción |
|---|---|---|
| idFactura | UUID | Identificador de la factura. |
| idPedido | UUID | Pedido asociado. |
| numeroFactura | String | Número correlativo o único. |
| fechaEmision | DateTime | Fecha de emisión. |
| subtotal | Decimal | Base imponible. |
| impuestos | Decimal | Monto de impuestos. |
| total | Decimal | Valor total. |
| moneda | Moneda | Tipo de moneda. |
| estadoFactura | Enum | Emitida, Pagada, Anulada. |

Reglas de negocio:
- La factura debe corresponder exactamente a un pedido confirmado.
- No puede duplicarse el número de factura.
- La emisión debe quedar asociada a auditoría.

### 4.13 Pago

| Atributo | Tipo | Descripción |
|---|---|---|
| idPago | UUID | Identificador del pago. |
| idPedido | UUID | Pedido asociado. |
| metodoPago | MetodoPago | Medio por el cual se realiza el pago. |
| monto | Decimal | Valor pagado. |
| moneda | Moneda | Moneda del pago. |
| estadoPago | EstadoPago | Pendiente, Autorizado, Rechazado, Reembolsado. |
| idTransaccionExterna | String | Identificador del gateway o entidad financiera. |
| fechaProcesamiento | DateTime | Fecha de validación. |

Reglas de negocio:
- El pago debe aprobarse antes de la preparación de envío.
- Un pedido no puede quedar pagado con un método no habilitado.
- Los reembolsos deben reflejar la realidad de la transacción original.

### 4.14 Envio

| Atributo | Tipo | Descripción |
|---|---|---|
| idEnvio | UUID | Identificador del envío. |
| idPedido | UUID | Pedido asociado. |
| idBodega | UUID | Bodega de origen. |
| direccionEntrega | DireccionEntrega | Lugar de llegada. |
| transportadora | Transportadora | Empresa de transporte. |
| codigoSeguimiento | String | Identificador de rastreo. |
| estadoEnvio | EstadoEnvio | Programado, EnTransito, Entregado, Fallido. |
| fechaSalida | DateTime | Fecha real de envío. |
| fechaEntrega | DateTime | Fecha de entrega. |

Reglas de negocio:
- Un envío solo puede generarse cuando hay stock disponible y un pedido validado.
- El código de seguimiento debe ser único.
- Las entregas fallidas deben abrir un flujo de resolución logística.

### 4.15 Devolucion

| Atributo | Tipo | Descripción |
|---|---|---|
| idDevolucion | UUID | Identificador de la devolución. |
| idPedido | UUID | Pedido relacionado. |
| idFactura | UUID | Factura asociada. |
| motivo | Enum | Daño, Error de envío, Desacuerdo, Otro. |
| estadoDevolucion | Enum | Solicitada, EnRevision, Aprobada, Rechazada, Finalizada. |
| fechaSolicitud | DateTime | Fecha de la solicitud. |
| montoReembolso | Decimal | Monto que se va a devolver. |

Reglas de negocio:
- La devolución debe estar asociada a un pedido con estado elegible.
- El monto de reembolso no puede exceder el valor total de la compra.
- Debe existir evidencia o validación del caso antes de aprobaciones automáticas.

---

## 5. Value Objects / Catálogos

Los value objects representan conceptos de negocio inmutables y de valor, usados para encapsular datos sin identidad propia.

### 5.1 Value Objects principales

#### DocumentoIdentidad
- tipoDocumento: Enum
- numeroDocumento: String
- paisEmision: String

Uso: identifica a compradores, vendedores y administradores.

#### DireccionEntrega
- pais: String
- departamento: String
- ciudad: String
- barrio: String
- direccion: String
- codigoPostal: String
- referencia: String

Uso: representa la ubicación exacta para entregas y facturación.

#### MetodoPago
- tipo: Enum
- numeroEnmascarado: String
- titular: String
- fechaExpiracion: String
- marca: String

Uso: encapsula información de pago para los compradores.

#### Moneda
- codigo: String
- nombre: String
- simbolo: String
- decimales: Integer

Uso: estandariza la representación monetaria, por ejemplo COP, USD, EUR.

#### PrecioProducto
- valorBase: Decimal
- moneda: Moneda
- impuestoAplicado: Decimal
- precioFinal: Decimal

Uso: garantiza consistencia monetaria en el catálogo.

### 5.2 Catálogos del dominio

#### Catálogo de estados de usuario
- Activo
- Inactivo
- Bloqueado
- PendienteVerificacion

#### Catálogo de estados de producto
- Borrador
- Publicado
- Inactivo
- Suspendido
- Agotado

#### Catálogo de categorías de producto
- Electrónica
- Hogar
- Ropa y accesorios
- Belleza
- Deportes
- Juguetes
- Oficina
- Ferretería
- Automotriz
- Otros

#### Catálogo de estados de pedido
- Pendiente
- Confirmado
- Preparando
- Enviado
- Entregado
- Cancelado
- Reembolsado

#### Catálogo de estados de pago
- Pendiente
- Autorizado
- Rechazado
- Reembolsado
- Fallido

#### Catálogo de estados de envío
- Programado
- EnPreparacion
- EnTransito
- Entregado
- Fallido
- Retenido

#### Catálogo de tipos de documento
- Cédula de ciudadanía
- Tarjeta de identidad
- NIT
- Pasaporte
- Cédula extranjera

#### Catálogo de monedas soportadas
- COP
- USD
- EUR

---

## 6. Reglas de Diseño del Dominio

El diseño del dominio para NexusMarket debe seguir una serie de reglas orientadas a la consistencia, trazabilidad y evolución del negocio.

### 6.1 Inmutabilidad

Los value objects deben ser inmutables. Una vez creados, no pueden cambiar su valor. Esto garantiza:

- consistencia en precios y direcciones,
- menor riesgo de errores de negocio,
- claridad en la trazabilidad de operaciones.

Ejemplo: una dirección de entrega o un precio no deben modificarse de forma implícita después de ser aceptados por el sistema.

### 6.2 Auditoría

Toda operación crítica debe quedar registrada con información de:

- usuario que ejecutó la acción,
- timestamp,
- entidad afectada,
- cambio realizado,
- motivo o justificación del cambio.

Esto aplica especialmente a:
- creación y edición de vendedores,
- publicación de productos,
- cambios de stock,
- confirmación de pedidos,
- aprobación de pagos,
- resolución de devoluciones y disputas.

### 6.3 Consistencia transaccional

Las operaciones que involucran más de un agregado deben mantenerse bajo transacciones o eventos de dominio coherentes. Ejemplos:

- Confirmar pedido implica reservar stock y autorizar pago.
- Generar devolución exige validar el pedido y la factura asociada.
- Actualizar inventario debe preservar la relación entre stock disponible, reservado y total.

### 6.4 Restricciones de dominio

- No puede existir un producto publicado sin vendedor verificado.
- Un pedido no puede ser entregado si no existe evidencia de pago válido.
- Un carrito no puede contener productos con inventario inexistente.
- La factura debe corresponder a un pedido legítimo y validado.
- Un vendedor no puede liquidar saldo sin tener información comercial y bancaria válida.

### 6.5 Trazabilidad del ciclo de vida

Cada entidad con estado relevante debe registrar su ciclo de vida completo:

- creación,
- modificación,
- aprobación,
- cancelación,
- cierre,
- liquidación o devolución.

Esto es esencial para la resolución de operaciones en marketplace, especialmente en logística, soporte y auditoría administrativa.

### 6.6 Separación de responsabilidades por agregado

Cada agregado debe conservar su propia consistencia y no depender de la manipulación directa de otros agregados. Por ejemplo:

- `Inventario` administra stock.
- `Pedido` administra el ciclo de compra.
- `Pago` administra autorización y cobro.
- `Envio` administra entregas y seguimiento.
- `Devolucion` administra reembolsos y resolución.

Esto evita acoplamientos innecesarios y mejora la calidad del diseño DDD.

---
