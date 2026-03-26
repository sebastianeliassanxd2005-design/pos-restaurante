# 🎨 Sistema Multi-Restaurante con Personalización

## ✅ Implementación Completada

Ahora cada restaurante puede tener su propia configuración personalizada:
- **Nombre del restaurante**
- **Logo personalizado**
- **Colores de marca (primario y secundario)**

---

## 📋 PASOS PARA IMPLEMENTAR

### **Paso 1: Ejecutar SQL en Supabase**

1. Abre: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

2. Ejecuta el archivo: `supabase/multi-restaurant-setup.sql`

Este script:
- ✅ Crea la tabla `restaurants`
- ✅ Agrega `restaurant_id` a todas las tablas existentes
- ✅ Crea políticas RLS por restaurante
- ✅ Crea un restaurante por defecto
- ✅ Asigna todos los datos existentes al restaurante por defecto

---

### **Paso 2: Verificar en Supabase**

Después de ejecutar el SQL, verifica:

```sql
-- Verificar restaurante por defecto
SELECT id, name, slug, primary_color, secondary_color 
FROM restaurants;

-- Verificar que las tablas tienen restaurant_id
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'restaurant_id'
ORDER BY table_name;
```

---

### **Paso 3: Probar en Localhost**

1. **Recarga localhost** (Ctrl + F5)

2. **Inicia sesión** con tu cuenta de admin

3. **Verifica:**
   - Login muestra el nombre y logo del restaurante
   - Sidebar muestra el nombre del restaurante
   - Todo funciona como antes

---

### **Paso 4: Personalizar el Restaurante**

1. **Ve a Configuración** (nuevo menú en sidebar, solo para admin)

2. **Personaliza:**
   - 📝 Nombre del restaurante
   - 🖼️ Logo (sube una imagen PNG/JPG/SVG)
   - 🎨 Color primario (botones, enlaces, gradientes)
   - 🎨 Color secundario (detalles, sombras)

3. **Click en "Guardar Cambios"**

4. **Recarga la página** y verás los cambios aplicados

---

## 🎨 ¿Qué Se Personaliza?

### **Login:**
- Logo del restaurante
- Nombre del restaurante (color primario)

### **Sidebar:**
- Logo en el ícono
- Nombre del restaurante
- Color del gradiente (color primario)

### **Toda la App:**
- El color primario se usa en botones y enlaces
- El secundario se usará para detalles futuros

---

## 📊 Estructura de Base de Datos

### **Tabla `restaurants`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID único del restaurante |
| `name` | TEXT | Nombre visible del restaurante |
| `slug` | TEXT | Identificador único (ej: "sabor-latino") |
| `logo_url` | TEXT | URL del logo (ej: "/logos/logo.png") |
| `primary_color` | TEXT | Color principal (hex: #dc2626) |
| `secondary_color` | TEXT | Color secundario (hex: #1e293b) |
| `is_active` | BOOLEAN | Si el restaurante está activo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

---

## 🔄 Flujo de Carga

```
1. Usuario inicia sesión
   ↓
2. RestaurantContext carga configuración
   ↓
3. Obtiene restaurant_id del perfil del usuario
   ↓
4. Carga datos de tabla restaurants
   ↓
5. Guarda en localStorage para acceso rápido
   ↓
6. Toda la app usa useRestaurant() para obtener:
   - name
   - logo
   - primaryColor
   - secondaryColor
```

---

## 🛠️ Archivos Creados/Modificados

### **Nuevos Archivos:**
| Archivo | Propósito |
|---------|-----------|
| `supabase/multi-restaurant-setup.sql` | SQL de inicialización |
| `src/context/RestaurantContext.jsx` | Contexto de restaurante |
| `src/pages/RestaurantConfig.jsx` | Página de configuración |

### **Archivos Modificados:**
| Archivo | Cambios |
|---------|---------|
| `src/main.jsx` | Agrega RestaurantProvider |
| `src/pages/Login.jsx` | Usa nombre/logo del restaurante |
| `src/App.jsx` | Sidebar dinámico + ruta de configuración |

---

## 🎯 Próximos Pasos (Opcional)

### **Para Soporte Multi-Restaurante Real:**

1. **Crear sistema de registro:**
   - Landing page pública
   - Formulario de registro de nuevos restaurantes
   - Crear restaurante automáticamente en Supabase

2. **Sistema de subdominios:**
   - `restaurante1.tupos.com` → Restaurante A
   - `restaurante2.tupos.com` → Restaurante B

3. **Panel Super-Admin:**
   - Ver todos los restaurantes registrados
   - Activar/desactivar restaurantes
   - Ver métricas globales

4. **Subida de logos a Supabase Storage:**
   - Crear bucket `logos`
   - Subir logos realmente (ahora solo guarda el nombre)

---

## 📝 Ejemplo de Uso

### **Desde cualquier componente:**

```javascript
import { useRestaurant } from '../context/RestaurantContext'

function MiComponente() {
  const { name, logo, primaryColor } = useRestaurant()
  
  return (
    <div>
      <h1>{name}</h1>
      <img src={logo} alt="Logo" />
      <button style={{ background: primaryColor }}>
        Click aquí
      </button>
    </div>
  )
}
```

---

## ✅ Checklist de Verificación

- [ ] SQL ejecutado en Supabase
- [ ] Restaurante por defecto creado
- [ ] Login muestra nombre/logo correcto
- [ ] Sidebar muestra nombre del restaurante
- [ ] Página de configuración accesible para admin
- [ ] Cambios de configuración se guardan
- [ ] Cambios se reflejan inmediatamente
- [ ] Login y sidebar actualizados con colores

---

## 🆘 Solución de Problemas

### **Problema: "No se carga la configuración"**

**Solución:**
1. Verifica que el SQL se ejecutó correctamente
2. Revisa la consola del navegador para errores
3. Verifica que tu usuario tiene `restaurant_id` en `profiles`

```sql
SELECT id, email, restaurant_id FROM profiles WHERE email = 'tu@email.com';
```

### **Problema: "Los cambios no se guardan"**

**Solución:**
1. Verifica políticas RLS en Supabase
2. Asegúrate de estar logueado como admin
3. Revisa la consola para errores de permisos

### **Problema: "El logo no se muestra"**

**Solución:**
1. El logo debe estar en `/public/logos/`
2. O usa una URL absoluta de una imagen online
3. Verifica que la ruta sea correcta en `logo_url`

---

## 🎉 ¡Listo!

Ahora tu sistema POS soporta múltiples restaurantes, cada uno con su propia marca y configuración. ¡Puedes empezar a registrar clientes! 🚀
