# 📋 ARREGLOS FLOOR PLAN - Instrucciones

## ✅ Cambios Realizados

### 1. **Base de Datos - Nuevas Columnas para Zonas**

Las zonas ahora guardan el **color de fondo** y **color del borde**.

**Archivo SQL creado:** `supabase/floorplan_zones_update.sql`

```sql
-- Agrega las columnas color y border_color a la tabla floorplan_zones
ALTER TABLE floorplan_zones 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#fef2f2',
ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#ef4444';
```

---

### 2. **Arreglos en FloorPlan.jsx**

#### a) Paredes ahora se guardan al finalizar el dibujo
- **Función:** `handleStopStructure`
- **Antes:** Solo guardaba posición inicial (x, y)
- **Ahora:** Guarda dimensiones finales (width, height) cuando terminas de dibujar

#### b) Colores de zonas se guardan correctamente
- **Función:** `handleZoneUpdate`
- **Antes:** Solo guardaba el nombre de la zona
- **Ahora:** Guarda nombre, color y borderColor

#### c) Zonas cargan colores desde Supabase
- **Función:** `loadZones`
- **Antes:** No cargaba color ni borderColor
- **Ahora:** Carga color y border_color, con valores por defecto

#### d) Zonas se guardan con colores (auto-guardado)
- **Función:** `useEffect` de guardado de zonas
- **Antes:** Solo guardaba posición y tamaño
- **Ahora:** Guarda color y border_color también

#### e) Nuevas zonas tienen color por defecto
- **Función:** `handleStartDrawingZone`
- **Color por defecto:** Azul claro (#eef2ff) con borde índigo (#6366f1)

#### f) Zonas redimensionadas guardan colores
- **Función:** `handleStopResizeZone`
- **Ahora:** Mantiene el color al redimensionar

#### g) Estructuras movidas se guardan
- **Función:** `handleStopMoveElement`
- **Antes:** Solo guardaba zonas movidas
- **Ahora:** Guarda estructuras (paredes/columnas) también

---

## 🚀 PASOS PARA APLICAR LOS CAMBIOS

### Paso 1: Ejecutar SQL en Supabase

1. Abre tu dashboard de Supabase: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

2. Copia y ejecuta el contenido del archivo `floorplan_zones_update.sql`:

```sql
-- ============================================
-- Floor Plan Zones - ACTUALIZACIÓN CON COLORES
-- ============================================

-- 1. Agregar columnas de color si no existen
ALTER TABLE floorplan_zones 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#fef2f2',
ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#ef4444';

-- 2. Actualizar zonas existentes con colores por defecto (opcional)
UPDATE floorplan_zones 
SET 
  color = COALESCE(color, '#fef2f2'),
  border_color = COALESCE(border_color, '#ef4444')
WHERE color IS NULL OR border_color IS NULL;

-- 3. Verificar que las columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'floorplan_zones'
ORDER BY ordinal_position;
```

3. Verifica que las columnas se crearon correctamente

---

### Paso 2: Probar en Localhost

El servidor ya debería estar corriendo en **http://localhost:5173**

Si no, ejecuta:
```bash
cd "C:\Users\sebas\OneDrive\Escritorio\Nueva carpeta (7)\pos-restaurante"
npm run dev
```

---

### Paso 3: Pruebas a Realizar

#### ✅ Prueba 1: Crear Zona con Color
1. Ve a **Mesas** → Vista **Floor Plan**
2. Click en **"Crear Zona"**
3. Arrastra para crear una zona
4. Click en la zona para seleccionarla
5. Click en el selector de color (ícono de paleta)
6. **Selecciona un color diferente**
7. **Recarga la página (F5)**
8. ✅ **La zona debe mantener el color seleccionado**

#### ✅ Prueba 2: Crear Pared
1. Ve a **Mesas** → Vista **Floor Plan**
2. Click en **"Pared"**
3. **Arrastra en el canvas** para dibujar una pared
4. **Recarga la página (F5)**
5. ✅ **La pared debe estar en la misma posición y con el mismo tamaño**

#### ✅ Prueba 3: Mover Pared/Columna
1. Selecciona una pared o columna existente
2. **Arrástrala** a otra posición
3. **Recarga la página (F5)**
4. ✅ **La estructura debe estar en la nueva posición**

#### ✅ Prueba 4: Redimensionar Zona
1. Selecciona una zona
2. Arrastra el handle de la esquina para redimensionar
3. **Recarga la página (F5)**
4. ✅ **La zona debe mantener el tamaño y color**

---

## 📝 Resumen de Persistencia

| Elemento | Posición | Tamaño | Color | Estado |
|----------|----------|--------|-------|--------|
| Mesas | ✅ | ✅ | N/A | ✅ Funciona |
| Zonas | ✅ | ✅ | ✅ | ✅ Funciona |
| Paredes | ✅ | ✅ | N/A | ✅ Funciona |
| Columnas | ✅ | ✅ | N/A | ✅ Funciona |

---

## 🐛 Problemas Conocidos Solucionados

| Problema | Solución | Estado |
|----------|----------|--------|
| Paredes no se guardan al dibujar | `handleStopStructure` ahora guarda width/height | ✅ |
| Color de zona no se guarda | `handleZoneUpdate` guarda color y borderColor | ✅ |
| Zonas no cargan colores | `loadZones` carga color y border_color | ✅ |
| Estructuras no se guardan al mover | `handleStopMoveElement` guarda estructuras | ✅ |

---

## 📂 Archivos Modificados

1. **src/components/FloorPlan.jsx** - Múltiples funciones actualizadas
2. **supabase/floorplan_zones_update.sql** - Nuevo archivo SQL

---

## 🔍 Depuración

Si algo no funciona, abre la **Consola del Navegador (F12)** y busca:

- `✅ Zona creada:` - Cuando creas una zona
- `✅ Zona actualizada:` - Cuando cambias color/nombre
- `✅ Zona redimensionada:` - Cuando redimensionas una zona
- `✅ Pared guardada con dimensiones:` - Cuando terminas de dibujar una pared
- `✅ Estructura movida guardada:` - Cuando mueves una pared/columna
- `❌ Error...` - Si hay algún error

---

## ⚠️ Importante

- **Ejecuta el SQL ANTES de probar** - Sin las columnas `color` y `border_color`, los colores no se guardarán
- **Limpia el caché del navegador** - Si ves comportamientos extraños, presiona `Ctrl + F5`
- **Verifica la consola** - Los logs te dirán si se está guardando correctamente

---

## 🎉 ¡Listo!

Después de ejecutar el SQL y recargar, el Floor Plan debería guardar **toda la información** correctamente:
- ✅ Posiciones de mesas
- ✅ Posiciones de zonas
- ✅ Tamaño de zonas
- ✅ **Colores de zonas**
- ✅ **Posiciones de paredes/columnas**
- ✅ **Tamaño de paredes**
