# 🍽️ Sistema POS para Restaurante

Sistema de Punto de Venta (POS) moderno y completo para restaurantes, desarrollado con **React + Vite** y backend en **Supabase**.

## ✨ Características Principales

### 📊 Dashboard
- Estadísticas en tiempo real de ventas
- Métricas de ocupación de mesas
- Productos más vendidos (top 5)
- Órdenes recientes
- Filtros por período (hoy, semana, mes)
- Actualización automática cada 30 segundos

### 🪑 Gestión de Mesas
- Vista visual por secciones (Principal, VIP, Terraza, Barra)
- Estados: Disponible, Ocupada, Reservada, Mantenimiento
- Capacidad por mesa
- Búsqueda y filtros avanzados
- Código único por mesa

### 📋 Menú Digital
- Catálogo completo de productos
- Categorías con colores personalizados
- Búsqueda por nombre y descripción
- Filtros por categoría y disponibilidad
- Ordenamiento (nombre, precio, destacados)
- Vista en grid o lista
- Información nutricional (calorías)
- Tiempo de preparación
- Costo vs Precio de venta
- Productos destacados

### 🛒 Toma de Pedidos (POS)
- Selección rápida de mesa
- Búsqueda de productos en tiempo real
- Carrito con cantidades ajustables
- **Notas por producto** (ej: "sin cebolla", "extra salsa")
- **Descuentos** por porcentaje o monto fijo
- Cálculo automático de impuestos (19%)
- Impresión de tickets
- Envío directo a cocina

### 📄 Gestión de Órdenes
- Timeline de estados: Pendiente → Cocina → Servida → Pagada
- **Auto-refresh** cada 15 segundos
- Alertas de órdenes urgentes (>10 min)
- Historial completo de cambios de estado
- Impresión de comandas para cocina
- Filtros por estado
- Cálculo de tiempo transcurrido
- Liberación automática de mesas al cobrar

### 💰 Caja / Cobros
- **Múltiples métodos de pago**: Efectivo, Tarjeta, Transferencia
- **Pago dividido** entre múltiples métodos
- Cálculo automático de cambio
- Resumen diario de ventas por método de pago
- Historial de pagos
- Impresión de recibos
- Control de órdenes por cobrar

## 🚀 Instalación

### 1. Clonar o descargar el proyecto

```bash
cd pos-restaurante
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

Las variables de entorno ya están configuradas en `.env`:

```env
VITE_SUPABASE_URL=https://bhampokwjyjticzzejvs.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

### 4. Configurar la base de datos

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Abre **SQL Editor**
3. Copia y ejecuta el contenido de `supabase/schema.sql`

Este script creará:
- Todas las tablas necesarias
- Índices para optimización
- Triggers para cálculos automáticos
- Políticas de seguridad (RLS)
- Datos de ejemplo (productos, mesas, categorías)

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:5173`

## 📁 Estructura del Proyecto

```
pos-restaurante/
├── src/
│   ├── context/
│   │   └── ToastContext.jsx      # Sistema de notificaciones
│   ├── lib/
│   │   └── supabase.js           # Cliente de Supabase
│   ├── pages/
│   │   ├── Dashboard.jsx         # Panel principal
│   │   ├── Tables.jsx            # Gestión de mesas
│   │   ├── Menu.jsx              # Menú/productos
│   │   ├── POS.jsx               # Toma de pedidos
│   │   └── Orders.jsx            # Gestión de órdenes
│   ├── App.jsx                   # Enrutamiento
│   ├── App.css                   # Estilos globales
│   ├── index.css                 # Estilos base
│   └── main.jsx                  # Punto de entrada
├── supabase/
│   └── schema.sql                # Esquema de base de datos
├── .env                          # Variables de entorno
├── package.json
└── README.md
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `categories` | Categorías de productos con colores e íconos |
| `products` | Productos del menú con precios, costos, calorías |
| `tables` | Mesas del restaurante con secciones y estados |
| `orders` | Pedidos con totales, descuentos, impuestos |
| `order_items` | Items individuales de cada pedido |
| `order_status_history` | Historial de cambios de estado |
| `promotions` | Descuentos y promociones activas |
| `profiles` | Usuarios del sistema (meseros, admin) |

### Estados de Órdenes

```
pending → cooking → served → paid
                     ↓
                 cancelled
```

## 🎯 Flujo de Uso

### 1. Configurar el Menú
- Ve a **Menú** y verifica los productos de ejemplo
- Agrega, edita o elimina productos según tu restaurante
- Configura categorías, precios y disponibilidad

### 2. Gestionar Mesas
- Ve a **Mesas**
- Las mesas de ejemplo ya están creadas
- Cambia el estado a **"Ocupada"** cuando lleguen clientes

### 3. Tomar Pedidos
- Ve a **Nuevo Pedido**
- Selecciona una mesa ocupada
- Agrega productos al carrito
- Agrega notas si es necesario (ej: "sin cebolla")
- Aplica descuentos si corresponde
- Envía a cocina

### 4. Gestionar Órdenes
- Ve a **Órdenes**
- Las órdenes pendientes aparecen primero
- Envía a cocina → Marca como servida → Cobra
- El sistema libera la mesa automáticamente

### 5. Ver Dashboard
- Consulta ventas del día
- Revisa productos más vendidos
- Monitorea ocupación de mesas

## 🎨 Características Técnicas

- **React 18** con Hooks
- **Vite** para build rápido
- **React Router** para navegación
- **Supabase** como backend (PostgreSQL)
- **Lucide React** para íconos
- **CSS Personalizado** con variables
- **Diseño Responsive** (mobile-friendly)
- **Notificaciones Toast** para feedback
- **Auto-refresh** en tiempo real
- **Impresión de tickets** nativa

## 🔐 Seguridad

El sistema incluye:
- Row Level Security (RLS) en todas las tablas
- Políticas de acceso configurables
- Soporte para autenticación (opcional)

## 🛠️ Personalización

### Cambiar colores
Edita las variables CSS en `src/index.css`:

```css
:root {
  --primary: #dc2626;      /* Color principal */
  --secondary: #1e293b;    /* Color secundario */
  --success: #22c55e;      /* Éxito */
  --warning: #f59e0b;      /* Advertencia */
  --danger: #ef4444;       /* Error/Peligro */
}
```

### Modificar impuesto
En `src/pages/POS.jsx`, busca la línea:
```javascript
const tax = (cartSubtotal - discountAmount) * 0.19
```
Cambia `0.19` por el porcentaje de tu país.

### Cambiar moneda
El sistema usa `$` por defecto. Para cambiar, busca y reemplaza en los archivos JSX.

## 📦 Build para Producción

```bash
npm run build
npm run preview
```

Los archivos de producción se generan en `dist/`.

## 🔮 Próximas Características (Opcional)

- [ ] Autenticación de usuarios
- [ ] Roles y permisos (admin, mesero, cocina)
- [ ] Inventario de ingredientes
- [ ] Reportes exportables (PDF, Excel)
- [ ] Modo offline
- [ ] Integración con impresoras térmicas
- [ ] QR para menú digital
- [ ] Pagos con tarjeta integrados
- [ ] Multi-sucursal
- [ ] App para cocina

## 📄 Licencia

Este proyecto es de código abierto y puede ser modificado libremente.

## 🤝 Soporte

Para problemas o sugerencias, revisa la documentación de:
- [Supabase](https://supabase.com/docs)
- [React](https://react.dev)
- [Vite](https://vitejs.dev)

---

**Hecho con ❤️ para restaurantes**
