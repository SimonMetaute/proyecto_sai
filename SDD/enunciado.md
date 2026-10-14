# Especificación funcional de NexusMarket

## 1. Introducción y contexto

NexusMarket es una plataforma digital centralizada que actúa como intermediario comercial entre compradores y vendedores. El sistema administra la operación desde el registro de usuarios y la publicación de productos hasta la logística, la facturación y la posventa, procurando trazabilidad y coordinación entre los participantes.

La organización facilita la comercialización de productos de terceros mediante una plataforma empresarial unificada y proporciona la infraestructura necesaria para centralizar la operación comercial.

## 2. Objetivos funcionales

| Código | Objetivo |
|---|---|
| OBJ-01 | Administrar la información de todos los usuarios del marketplace. |
| OBJ-02 | Gestionar el registro y la administración de vendedores. |
| OBJ-03 | Administrar a los compradores registrados. |
| OBJ-04 | Controlar la información de las bodegas. |
| OBJ-05 | Gestionar el catálogo de productos. |
| OBJ-06 | Administrar el inventario distribuido. |
| OBJ-07 | Gestionar el carrito de compras. |
| OBJ-08 | Controlar el ciclo completo de los pedidos. |
| OBJ-09 | Administrar la facturación de las compras. |
| OBJ-10 | Gestionar los procesos logísticos. |
| OBJ-11 | Administrar devoluciones y reembolsos. |
| OBJ-12 | Consolidar información administrativa para consulta. |

## 3. Alcance

El sistema administrará los procesos funcionales incluidos en esta especificación.

### 3.1 Procesos incluidos

| Proceso | Alcance |
|---|---|
| Registro de compradores | Incluido |
| Administración de usuarios | Incluido |
| Registro administrativo de vendedores | Incluido |
| Administración de bodegas | Incluido |
| Gestión del catálogo de productos | Incluido |
| Administración del inventario | Incluido |
| Gestión del carrito de compras | Incluido |
| Gestión de pedidos | Incluido |
| Gestión de facturación | Incluido |
| Gestión de envíos | Incluido |
| Gestión de devoluciones | Incluido |
| Gestión de reembolsos | Incluido |
| Consulta de reportes administrativos | Incluido |

### 3.2 Fuera del alcance de esta especificación

Este documento no define:

- Interfaces gráficas, aplicaciones móviles ni portales web.
- Mecanismos técnicos de autenticación.
- Tecnologías de implementación.
- Arquitectura del software.
- Detalles de almacenamiento de la información.

La exclusión de los mecanismos técnicos de autenticación no elimina la regla funcional de que las operaciones deben ser realizadas por usuarios autenticados.

## 4. Componentes principales del negocio

| Componente | Descripción |
|---|---|
| Usuarios | Personas autorizadas para interactuar con el sistema. |
| Vendedores | Responsables de comercializar productos. |
| Compradores | Usuarios que realizan compras. |
| Bodegas | Lugares donde se administra el inventario físico. |
| Productos | Bienes físicos o digitales ofrecidos en el marketplace. |
| Inventario | Existencias disponibles para comercialización. |
| Pedidos | Solicitudes de compra realizadas por compradores. |
| Facturación | Información comercial asociada a las ventas. |
| Envíos | Procesos logísticos para productos físicos. |

## 5. Participantes del negocio

Cada participante desempeña un único rol y solo puede interactuar con la información correspondiente a sus funciones.

| Participante | Descripción |
|---|---|
| Comprador | Persona que adquiere productos publicados. |
| Vendedor | Responsable de registrar y administrar sus productos. |
| Operador logístico | Encargado de la operación física de bodegas y despachos. |
| Administrador | Responsable de la administración de vendedores y bodegas. |
| Supervisor | Perfil de consulta y seguimiento operativo. |

## 6. Modelo operativo

El ciclo general de negocio se compone de las siguientes etapas:

1. **Incorporación:** el administrador registra al vendedor y su primera bodega.
2. **Catálogo:** el vendedor registra productos y define sus características.
3. **Inventario:** se registran las existencias iniciales en las bodegas asociadas.
4. **Publicación:** los productos se hacen visibles en el catálogo público.
5. **Compra:** el comprador selecciona productos mediante el carrito y confirma el pedido.
6. **Transacción:** se valida el pago y se inicia el proceso de preparación.
7. **Logística:** se empaca, despacha y transporta el pedido cuando corresponda.
8. **Cierre:** el pedido se marca como finalizado tras confirmarse la entrega.

## 7. Dominios funcionales

### 7.1 Administración de usuarios

Este dominio constituye la base de identificación y estado operativo de los usuarios.

**Objetivo:** garantizar la correcta identificación y el estado operativo de los usuarios.

**Participantes:** comprador, vendedor, operador logístico, administrador y supervisor.

| Atributo | Descripción funcional | Obligatorio | Restricción |
|---|---|---:|---|
| Identificador | Identifica de forma única al usuario. | Sí | Único |
| Nombre completo | Nombre oficial del usuario. | Sí | No vacío |
| Correo electrónico | Medio principal de acceso y comunicación. | Sí | Único |
| Rol | Define las responsabilidades y permisos. | Sí | Un único rol por usuario |
| Estado | Condición operativa del usuario (por ejemplo, activo o bloqueado). | Sí | Debe pertenecer a un catálogo definido |

### 7.2 Gestión de compradores

**Objetivo:** administrar la información necesaria para la participación de los compradores en los procesos comerciales.

**Restricción:** un comprador no administra información de otros compradores ni inventarios.

| Atributo | Descripción | Obligatorio |
|---|---|---:|
| Dirección principal | Ubicación habitual para entregas. | Sí |
| Direcciones adicionales | Ubicaciones secundarias de entrega. | No |
| Estado comercial | Condición del comprador para realizar compras. | Sí |

### 7.3 Gestión de vendedores

**Objetivo:** administrar la incorporación y el mantenimiento de los proveedores de productos.

**Regla de negocio:** los vendedores no pueden autorregistrarse; son incorporados por el administrador.

### 7.4 Gestión de bodegas

**Objetivo:** controlar los espacios físicos de almacenamiento.

**Clasificación:** existen bodegas del marketplace y bodegas de vendedores.

### 7.5 Gestión del catálogo

El catálogo distingue entre productos físicos y digitales:

- Los productos físicos requieren inventario y despacho.
- Los productos digitales se entregan inmediatamente después del pago.

| Atributo | Descripción | Tipo de dato |
|---|---|---|
| Tipo de producto | Producto físico o digital. | Selección |
| Variantes | Diferencias de color, talla, modelo u otras características. | Lista |
| Estado | Publicado, suspendido o descontinuado. | Selección |

### 7.6 Gestión del inventario

El inventario es distribuido y debe estar vinculado obligatoriamente a un producto y a una bodega específica.

**Tipos de movimiento:**

- Ingreso.
- Reserva.
- Salida por venta.
- Ajuste.
- Devolución.

**Restricción:** no se permiten existencias negativas bajo ninguna circunstancia.

### 7.7 Gestión de pedidos

El pedido representa el compromiso comercial formal y su ciclo de vida constituye un proceso central del sistema.

| Estado o etapa | Descripción |
|---|---|
| Carrito | Selección provisional de productos. |
| Pendiente de pago | El pedido espera confirmación financiera. |
| Pagado | Se inicia el proceso de alistamiento. |
| Despachado | El pedido ha salido físicamente de la bodega. |
| Entregado / Finalizado | Conclusión satisfactoria tras la entrega. |

Un pedido finalizado no puede modificarse.

## 8. Restricciones generales

| Código | Restricción |
|---|---|
| RG-01 | Toda operación debe ejecutarse por un usuario autenticado. |
| RG-02 | Cada usuario tendrá un único rol dentro del sistema. |
| RG-03 | Ningún participante podrá administrar información fuera de su rol. |

## 9. Validaciones críticas

- **Inventario:** no se puede reservar inventario inexistente o marcado como «Dañado».
- **Pedidos:** un pedido finalizado no puede modificarse bajo ninguna circunstancia.
- **Usuarios:** el documento de identidad y el correo electrónico deben ser únicos en la plataforma.

## 10. Matriz de responsabilidades

La matriz refleja únicamente las asignaciones indicadas en el enunciado de origen. Una celda vacía significa que no se especificó una responsabilidad para ese participante.

| Proceso | Comprador | Vendedor | Operador logístico | Administrador | Supervisor |
|---|:---:|:---:|:---:|:---:|:---:|
| Registro de vendedores |  |  |  | Sí |  |
| Registro de productos |  | Sí |  |  |  |
| Administración de inventario |  | Sí | Sí |  |  |
| Gestión de pedidos | Sí | Sí | Sí |  |  |
| Gestión de reembolsos | Sí |  |  | Sí |  |

## 11. Aspectos incluidos que requieren detalle funcional

El alcance incluye facturación, envíos, devoluciones, reembolsos y reportes administrativos. El material fuente no define sus atributos, estados, reglas detalladas ni responsabilidades completas; estos aspectos requieren especificación antes de considerarse completamente definidos.

También se indica que el estado del usuario debe pertenecer a un catálogo, pero no se enumeran todos sus valores. La matriz de responsabilidades no asigna actividades al supervisor ni describe todas las actividades de cada rol; las celdas vacías no se interpretan como una prohibición.
