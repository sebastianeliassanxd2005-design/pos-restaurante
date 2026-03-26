# 📋 ARREGLO COMPLETO - POSICIÓN DE MESAS

## 🐛 Problema Reportado
> "Cuando muevo las mesas de lugar al recargar no se guardan y vuelven al lugar de origen"

---

## 🔍 Diagnóstico

El código de guardado **SÍ está implementado** en `handleMouseUp`, pero hay 2 posibilidades:

1. **Las columnas `floor_x` y `floor_y` NO existen** en la tabla `tables` de Supabase
2. **El guardado no se está ejecutando** correctamente

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Verificar columnas en Supabase

1. Abre: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

2. Ejecuta este SQL para verificar:

```sql
-- Verificar si las columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tables'
  AND column_name IN ('floor_x', 'floor_y', 'floor_shape')
ORDER BY column_name;
```

3. **Resultado esperado:**

| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| floor_x | integer | YES | 0 |
| floor_shape | text | YES | 'round' |
| floor_y | integer | YES | 0 |

---

### Paso 2: Si las columnas NO existen

Ejecuta este SQL para crearlas:

```sql
-- Agregar columnas para posiciones al tabla tables
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS floor_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor_shape TEXT DEFAULT 'round';

-- Índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tables_floor_position ON tables(floor_x, floor_y);
```

---

### Paso 3: Probar en Localhost

1. Abre: http://localhost:5173

2. Ve a **Mesas** → Vista **Floor Plan**

3. **Abre la consola del navegador (F12)**

4. **Arrastra una mesa** a otra posición

5. **Busca en la consola:**
   - `💾 Guardando posición de mesa:` - Debe aparecer cuando sueltas la mesa
   - `✅ Mesa guardada correctamente:` - Si se guardó bien
   - `❌ Error guardando posición de mesa:` - Si hubo error

6. **Recarga la página (F5)**

7. **Verifica:** La mesa debe estar en la nueva posición

---

## 🎯 Depuración Detallada

### Si NO ves el mensaje "💾 Guardando posición de mesa:"

**Problema:** `handleMouseUp` no se está llamando

**Solución:** Verifica que el `onMouseUp` del canvas incluya `handleMouseUp()`:

```javascript
onMouseUp={() => {
  handleMouseUp();           // ← Debe estar aquí
  handleStopDrawingZone();
  handleStopResizeZone();
  handleStopMoveElement();
  if (structureMode) handleStopStructure();
}}
```

---

### Si ves "❌ Error guardando posición de mesa:"

**Posibles causas:**

1. **Columnas no existen** → Ejecuta el SQL del Paso 2
2. **Error de permisos RLS** → Verifica las políticas en Supabase
3. **Mesa no tiene ID válido** → Revisa que `dragging.current.id` sea un UUID válido

---

### Si ves "✅ Mesa guardada correctamente:" pero al recargar vuelve al origen

**Problema:** El `fetchTables()` en Tables.jsx no está cargando las columnas

**Verifica:** La consulta debe usar `.select('*')` para incluir `floor_x` y `floor_y`:

```javascript
const { data: tablesData, error: tablesError } = await supabase
  .from('tables')
  .select('*')  // ← Debe ser '*' para incluir todas las columnas
  .order('name')
```

---

## 📊 Flujo Completo de Guardado

```
1. Usuario arrastra mesa
   ↓
2. handleMouseMove actualiza estado local (localTables)
   ↓
3. Usuario suelta mesa
   ↓
4. handleMouseUp se ejecuta
   ↓
5. Busca la mesa en localTables por ID
   ↓
6. Si tiene coordenadas X/Y → guarda en Supabase
   ↓
7. Supabase actualiza: floor_x, floor_y, floor_shape
   ↓
8. Console.log muestra resultado
   ↓
9. Al recargar → fetchTables() carga floor_x y floor_y
   ↓
10. FloorPlan usa las coordenadas guardadas
```

---

## 🔧 Código Actualizado (FloorPlan.jsx)

### handleMouseUp (línea ~576)

```javascript
const handleMouseUp = useCallback(async () => {
  // Guardar posición en Supabase si se movió una mesa
  if (dragging.current && dragging.current.id) {
    const table = localTables.find(t => t.id === dragging.current.id);
    if (table && table.x && table.y) {
      try {
        console.log('💾 Guardando posición de mesa:', {
          id: dragging.current.id,
          name: table.name,
          floor_x: Math.round(table.x),
          floor_y: Math.round(table.y),
          floor_shape: table.shape || 'round'
        });

        const { data, error } = await supabase
          .from('tables')
          .update({
            floor_x: Math.round(table.x),
            floor_y: Math.round(table.y),
            floor_shape: table.shape || 'round',
            updated_at: new Date().toISOString(),
          })
          .eq('id', dragging.current.id);

        if (error) {
          console.error('❌ Error guardando posición de mesa:', error);
        } else {
          console.log('✅ Mesa guardada correctamente:', data);
        }
      } catch (error) {
        console.error('❌ Error guardando posición de mesa:', error);
      }
    }
  }
  dragging.current = null;
}, [localTables]);
```

---

## ✅ Checklist de Verificación

- [ ] Ejecutar SQL de verificación de columnas
- [ ] Si no existen → ejecutar SQL de creación
- [ ] Abrir localhost:5173
- [ ] Abrir consola del navegador (F12)
- [ ] Ir a Mesas → Floor Plan
- [ ] Arrastrar una mesa
- [ ] Verificar mensaje "💾 Guardando posición de mesa:"
- [ ] Verificar mensaje "✅ Mesa guardada correctamente:"
- [ ] Recargar página (F5)
- [ ] Verificar que la mesa mantiene la posición

---

## 🎯 Resumen

| Elemento | Estado | Notas |
|----------|--------|-------|
| Código de guardado | ✅ Implementado | handleMouseUp actualizado |
| Console logs | ✅ Agregados | Para depuración |
| Columnas en BD | ⚠️ Verificar | Ejecutar SQL de verificación |
| Carga de columnas | ✅ Implementado | fetchTables usa .select('*') |

---

## 📂 Archivos Relacionados

- `src/components/FloorPlan.jsx` - handleMouseUp actualizado
- `src/pages/Tables.jsx` - fetchTables carga todas las columnas
- `supabase/verificar_columnas_mesas.sql` - SQL para verificar
- `supabase/floorplan_tables.sql` - SQL completo para mesas

---

## 🆘 Si el problema persiste

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Arrastra una mesa
4. **Copia todos los mensajes** que aparecen
5. Compártelos para diagnosticar el problema exacto
