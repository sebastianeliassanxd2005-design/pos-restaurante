import { useState, useRef, useCallback, useEffect } from "react"
import { Users, Clock, UserCheck, ShoppingBag, WifiOff, Plus, X, Square, Circle, Palette, Copy, Clipboard } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STATUS_CONFIG = {
  available: { label: "Disponible", color: "#4ade80", bg: "#f0fdf4", border: "#22c55e", text: "#15803d" },
  occupied: { label: "Ocupada", color: "#f87171", bg: "#fef2f2", border: "#ef4444", text: "#b91c1c" },
  reserved: { label: "Reservada", color: "#fb923c", bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
};

const TABLE_SIZE = 72;

const ZONE_COLORS = [
  { value: '#eef2ff', label: 'Azul', border: '#6366f1' },
  { value: '#fef2f2', label: 'Rojo', border: '#ef4444' },
  { value: '#f0fdf4', label: 'Verde', border: '#22c55e' },
  { value: '#fff7ed', label: 'Naranja', border: '#f97316' },
  { value: '#fefce8', label: 'Amarillo', border: '#eab308' },
  { value: '#fdf4ff', label: 'Rosado', border: '#d946ef' },
  { value: '#f0f9ff', label: 'Cian', border: '#06b6d4' },
  { value: '#faf5ff', label: 'Violeta', border: '#a855f7' },
];

// Componente para estructuras (paredes, columnas)
function StructureElement({ element, isSelected, onClick, onDelete, onMove, onCopy }) {
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onMove(e, element.id);
  }, [element.id, onMove]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onClick(element.id); }}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.type === 'wall' ? element.width : element.size,
        height: element.type === 'wall' ? element.height : element.size,
        background: element.type === 'wall'
          ? "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)"
          : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
        borderRadius: element.type === 'column' ? "50%" : element.type === 'wall' ? 4 : 8,
        border: isSelected ? "2px solid #6366f1" : "none",
        boxShadow: element.type === 'wall'
          ? "0 2px 8px rgba(0,0,0,0.15)"
          : "0 4px 12px rgba(0,0,0,0.2)",
        cursor: isSelected ? "move" : "pointer",
        opacity: 0.9,
        zIndex: 0,
      }}
    >
      {isSelected && (
        <div style={{
          position: "absolute",
          top: -32,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 6px",
          background: "white",
          borderRadius: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
            {element.type === 'wall' ? 'Pared' : 'Columna'}
          </span>
          {/* Botón Copiar */}
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(element, element.type); }}
            style={{
              width: 20,
              height: 20,
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              background: "#f8fafc",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            title="Copiar"
          >
            <Copy size={12} />
          </button>
          {/* Botón Eliminar */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
            style={{
              width: 20,
              height: 20,
              border: "none",
              borderRadius: "50%",
              background: "#ef4444",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// Componente para zonas/áreas
function ZoneRect({ zone, isSelected, onClick, onUpdate, onDelete, onResize, onMove, onCopy }) {
  const inputRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleZoneMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onMove(e, zone.id);
  }, [zone.id, onMove]);

  // Obtener configuración del color actual
  const currentColor = ZONE_COLORS.find(c => c.value === zone.color) || ZONE_COLORS[0];
  const bgColor = zone.color || currentColor.value;
  const borderColor = zone.borderColor || currentColor.border;

  return (
    <div
      onMouseDown={handleZoneMouseDown}
      onClick={(e) => { e.stopPropagation(); onClick(zone.id); }}
      style={{
        position: "absolute",
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height,
        border: `3px dashed ${isSelected ? "#6366f1" : borderColor}`,
        background: isSelected ? "rgba(99, 102, 241, 0.15)" : `${bgColor}cc`,
        borderRadius: 8,
        cursor: isSelected ? "default" : "pointer",
        transition: "all 0.2s",
      }}
    >
      {/* Barra superior con controles */}
      <div style={{
        position: "absolute",
        top: -36,
        left: 0,
        right: 0,
        display: isSelected ? "flex" : "none",
        alignItems: "center",
        gap: 6,
        padding: "4px 6px",
      }}>
        <input
          ref={inputRef}
          value={zone.name || ''}
          onChange={(e) => onUpdate({ name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Nombre..."
          style={{
            flex: 1,
            border: "1px solid #6366f1",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 500,
            color: "#1e293b",
            background: "white",
            outline: "none",
            minWidth: 80,
          }}
        />
        {/* Selector de color */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 4,
              border: "2px solid white",
              background: bgColor,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              position: "relative",
            }}
            title="Cambiar color de zona"
          >
            <Palette size={14} style={{ color: "#1e293b", opacity: 0.7 }} />
          </button>
          {showColorPicker && (
            <div style={{
              position: "absolute",
              top: 28,
              left: 0,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 4,
              padding: 8,
              background: "white",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              zIndex: 10000,
              border: "1px solid #e2e8f0",
            }}>
              {ZONE_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ color: color.value, borderColor: color.border });
                    setShowColorPicker(false);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: `2px solid ${color.border}`,
                    background: color.value,
                    cursor: "pointer",
                    opacity: bgColor === color.value ? 1 : 0.7,
                    transform: bgColor === color.value ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.15s",
                  }}
                  title={color.label}
                />
              ))}
            </div>
          )}
        </div>
        {/* Botón Copiar */}
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(zone, 'zone'); }}
          title="Copiar zona"
          style={{
            width: 24,
            height: 24,
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            background: "#f8fafc",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Copy size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(zone.id); }}
          title="Eliminar zona"
          style={{
            width: 24,
            height: 24,
            border: "none",
            borderRadius: 4,
            background: "#ef4444",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Label cuando no está seleccionada */}
      {!isSelected && zone.name && (
        <div style={{
          position: "absolute",
          top: 8,
          left: 8,
          fontSize: 11,
          fontWeight: 600,
          color: "#1e293b",
          background: "rgba(255,255,255,0.95)",
          padding: "3px 8px",
          borderRadius: 4,
          pointerEvents: "none",
        }}>
          {zone.name}
        </div>
      )}

      {/* Handle para redimensionar */}
      {isSelected && (
        <div
          onMouseDown={(e) => onResize(e, zone)}
          style={{
            position: "absolute",
            bottom: -8,
            right: -8,
            width: 16,
            height: 16,
            background: "#6366f1",
            borderRadius: "50%",
            cursor: "se-resize",
            border: "2px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        />
      )}
    </div>
  );
}

// Componente para mesas
function TableNode({ table, isSelected, onMouseDown, onClick, onTouchStart, onTouchMove, onTouchEnd, isAdmin }) {
  if (!table || !table.id) return null;

  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
  const isRound = table.shape === "round";

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, table.id, isAdmin)}
      onTouchStart={(e) => onTouchStart(e, table.id)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => { e.stopPropagation(); onClick(table.id); }}
      style={{
        position: "absolute",
        left: table.x || 0,
        top: table.y || 0,
        width: TABLE_SIZE,
        height: TABLE_SIZE,
        borderRadius: isRound ? "50%" : "12px",
        background: cfg.bg,
        border: `3px solid ${isSelected ? "#6366f1" : cfg.border}`,
        boxShadow: isSelected
          ? `0 0 0 3px rgba(99,102,241,0.35), 0 4px 16px rgba(0,0,0,0.12)`
          : `0 2px 8px rgba(0,0,0,0.08)`,
        cursor: isAdmin ? "grab" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
        zIndex: isSelected ? 10 : 1,
        pointerEvents: isAdmin ? "auto" : "none",
        touchAction: isAdmin ? "none" : "auto",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 14, color: cfg.text, fontFamily: "monospace" }}>
        {table.name || '?'}
      </span>
      <span style={{ fontSize: 11, color: cfg.text, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '3px' }}>
        <Users size={12} /> {table.capacity || 0}
      </span>
      <div
        style={{
          position: "absolute",
          bottom: isRound ? 8 : 6,
          right: isRound ? 8 : 6,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: cfg.color,
        }}
      />
    </div>
  );
}

export default function FloorPlan({ tables = [], onTableClick, isAdmin = false }) {
  const [localTables, setLocalTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [structures, setStructures] = useState([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedStructureId, setSelectedStructureId] = useState(null);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [isResizingZone, setIsResizingZone] = useState(false);
  const [structureMode, setStructureMode] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showOrientationAlert, setShowOrientationAlert] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(() => {
    // Cargar altura guardada en localStorage
    const saved = localStorage.getItem('floorplan_canvas_height');
    return saved ? parseInt(saved) : 520;
  });
  const [copiedElement, setCopiedElement] = useState(null); // Elemento copiado
  const canvasRef = useRef(null);
  const dragging = useRef(null);
  const hasDragged = useRef(false);
  const zoneStart = useRef(null);
  const resizeStart = useRef(null);
  const structureStart = useRef(null);
  const moveStart = useRef(null);
  const touchStartTime = useRef(0);

  // Detectar móvil y orientación
  useEffect(() => {
    const checkOrientation = () => {
      const mobile = window.innerWidth <= 768
      const landscape = window.innerWidth > window.innerHeight
      setIsMobile(mobile)
      setIsLandscape(landscape)
      
      // Mostrar alerta si es móvil y está en vertical
      if (mobile && !landscape) {
        setShowOrientationAlert(true)
      } else {
        setShowOrientationAlert(false)
      }
    }
    
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  // Detectar móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Guardar altura del canvas en localStorage
  useEffect(() => {
    localStorage.setItem('floorplan_canvas_height', canvasHeight.toString());
  }, [canvasHeight]);

  // Cargar estructuras desde Supabase
  useEffect(() => {
    async function loadStructures() {
      try {
        const { data, error } = await supabase
          .from('floorplan_structures')
          .select('*')
          .order('created_at', { ascending: true })
        
        if (error) throw error
        setStructures(data || [])
      } catch (error) {
        console.error('Error loading structures:', error)
      }
    }
    loadStructures()
  }, [])

  // Cargar zonas desde Supabase
  useEffect(() => {
    async function loadZones() {
      try {
        const { data, error } = await supabase
          .from('floorplan_zones')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedZones = (data || []).map(zone => ({
          id: zone.id,
          name: zone.name || '',
          x: zone.x,
          y: zone.y,
          width: zone.width,
          height: zone.height,
          color: zone.color || '#fef2f2',  // Color por defecto (rojo claro)
          borderColor: zone.border_color || '#ef4444',  // Borde por defecto (rojo)
        }));

        setZones(formattedZones);
      } catch (error) {
        console.error('Error loading zones:', error);
      } finally {
        setIsLoadingZones(false);
      }
    }

    loadZones();
  }, []);

  // Guardar zonas en Supabase (debounced)
  useEffect(() => {
    if (zones.length === 0 || isLoadingZones) return;

    const timeoutId = setTimeout(async () => {
      try {
        const { data: existingZones, error: fetchError } = await supabase
          .from('floorplan_zones')
          .select('id');

        if (fetchError) throw fetchError;

        const existingIds = new Set((existingZones || []).map(z => z?.id).filter(Boolean));
        const validZones = zones
          .filter(z => z && z.id && !z.id.startsWith('zone_'))
          .map(z => ({
            id: z.id,
            name: z.name || null,
            x: z.x || 0,
            y: z.y || 0,
            width: z.width || 0,
            height: z.height || 0,
            color: z.color || null,
            border_color: z.borderColor || null,
          }));

        const currentIds = new Set(validZones.map(z => z.id));

        for (const existingId of existingIds) {
          if (!currentIds.has(existingId)) {
            await supabase.from('floorplan_zones').delete().eq('id', existingId);
          }
        }

        for (const zone of validZones) {
          await supabase.from('floorplan_zones').upsert(zone);
        }
      } catch (error) {
        console.error('Error saving zones:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [zones, isLoadingZones]);

  // Cargar mesas con posiciones guardadas
  useEffect(() => {
    if (tables.length > 0) {
      setLocalTables(tables.map((t, i) => ({
        id: t.id,
        name: t.name,
        x: t.floor_x || (80 + (i % 5) * 140),
        y: t.floor_y || (80 + Math.floor(i / 5) * 140),
        capacity: t.capacity || 4,
        shape: t.floor_shape || 'round',
        status: t.status || 'available',
        waiter_name: t.waiter_name,
        has_active_order: t.has_active_order,
      })));
    }
  }, [tables]);

  const selectedTable = localTables.find((t) => t.id === selectedId);

  const handleMouseDown = useCallback((e, id, isAdmin) => {
    // Solo admin puede arrastrar mesas
    if (!isAdmin) {
      console.log('🚫 Solo administradores pueden editar el Floor Plan');
      return;
    }
    
    e.preventDefault();
    const canvas = canvasRef.current.getBoundingClientRect();
    const table = localTables.find((t) => t.id === id);
    dragging.current = {
      id,
      offsetX: e.clientX - canvas.left - table.x,
      offsetY: e.clientY - canvas.top - table.y,
    };
    hasDragged.current = false;
    console.log('🖱️ Mouse DOWN en mesa:', { id, name: table?.name, x: table?.x, y: table?.y });
  }, [localTables, isAdmin]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    if (!canvasRef.current) return;

    const draggingId = dragging.current.id;
    if (!draggingId) return;

    const canvas = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width - TABLE_SIZE, e.clientX - canvas.left - dragging.current.offsetX));
    const y = Math.max(0, Math.min(canvas.height - TABLE_SIZE, e.clientY - canvas.top - dragging.current.offsetY));

    setLocalTables((prev) => {
      if (!prev || !Array.isArray(prev)) return prev;
      return prev.map((t) => {
        if (!t || !t.id) return t;
        return t.id === draggingId ? { ...t, x, y } : t;
      });
    });
    hasDragged.current = true;
    console.log('✋ Mouse MOVE - arrastrando:', { draggingId, x: Math.round(x), y: Math.round(y) });
  }, []);

  const handleMouseUp = useCallback(async () => {
    console.log('🖐️ Mouse UP - dragging.current:', dragging.current, 'hasDragged:', hasDragged.current);
    
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

  // Funciones para Touch (móviles)
  const handleTouchStart = useCallback((e, id) => {
    // Solo admin puede arrastrar mesas
    if (!isAdmin) {
      console.log('🚫 Solo administradores pueden editar el Floor Plan');
      return;
    }
    
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current.getBoundingClientRect();
    const table = localTables.find((t) => t.id === id);
    
    if (table) {
      dragging.current = {
        id,
        offsetX: touch.clientX - canvas.left - table.x,
        offsetY: touch.clientY - canvas.top - table.y,
      };
      hasDragged.current = false;
      touchStartTime.current = Date.now();
      console.log('👆 Touch DOWN en mesa:', { id, name: table.name });
    }
  }, [localTables, isAdmin]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    if (!canvasRef.current) return;

    e.preventDefault();
    const touch = e.touches[0];
    const draggingId = dragging.current.id;
    if (!draggingId) return;

    const canvas = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width - TABLE_SIZE, touch.clientX - canvas.left - dragging.current.offsetX));
    const y = Math.max(0, Math.min(canvas.height - TABLE_SIZE, touch.clientY - canvas.top - dragging.current.offsetY));

    setLocalTables((prev) => {
      if (!prev || !Array.isArray(prev)) return prev;
      return prev.map((t) => {
        if (!t || !t.id) return t;
        return t.id === draggingId ? { ...t, x, y } : t;
      });
    });
    hasDragged.current = true;
    console.log('👆 Touch MOVE - arrastrando:', { draggingId, x: Math.round(x), y: Math.round(y) });
  }, []);

  const handleTouchEnd = useCallback(async () => {
    console.log('👆 Touch UP - dragging.current:', dragging.current, 'hasDragged:', hasDragged.current);
    
    // Guardar posición en Supabase si se movió una mesa
    if (dragging.current && dragging.current.id) {
      const table = localTables.find(t => t.id === dragging.current.id);
      if (table && table.x && table.y) {
        try {
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
            console.log('✅ Mesa guardada correctamente');
          }
        } catch (error) {
          console.error('❌ Error guardando posición de mesa:', error);
        }
      }
    }
    dragging.current = null;
  }, [localTables]);

  const handleUpdate = useCallback((changes) => {
    setLocalTables((prev) => prev.map((t) => t.id === selectedId ? { ...t, ...changes } : t));
  }, [selectedId]);

  const handleTableClick = useCallback((id) => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }
    
    const table = localTables.find(t => t.id === id);
    if (table && onTableClick) {
      onTableClick(table);
    }
  }, [localTables, onTableClick]);

  const handleZoneClick = useCallback((id) => {
    setSelectedZoneId(id);
    setSelectedId(null);
  }, []);

  const handleZoneUpdate = useCallback((id, changes) => {
    setZones((prev) => prev.map((z) => {
      if (z.id === id) {
        return { ...z, ...changes };
      }
      return z;
    }));

    if (id && !id.startsWith('zone_')) {
      // Preparar datos para guardar (incluir color y borderColor si existen)
      const updateData = {
        name: changes.name || null,
        updated_at: new Date().toISOString(),
      };

      // Agregar color si se está actualizando
      if (changes.color !== undefined) {
        updateData.color = changes.color;
      }

      // Agregar border_color si se está actualizando
      if (changes.borderColor !== undefined) {
        updateData.border_color = changes.borderColor;
      }

      supabase
        .from('floorplan_zones')
        .update(updateData)
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating zone:', error);
          } else {
            console.log('✅ Zona actualizada:', { id, ...updateData });
          }
        });
    }
  }, []);

  const handleZoneDelete = useCallback((id) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    
    if (id && !id.startsWith('zone_')) {
      supabase
        .from('floorplan_zones')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Error deleting zone:', error);
        });
    }
  }, []);

  const handleStartDrawingZone = useCallback(async (e) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvas.left;
    const y = e.clientY - canvas.top;
    zoneStart.current = { x, y };
    setIsDrawingZone(true);

    const tempId = `zone_${Date.now()}`;
    // Color por defecto para nuevas zonas (azul claro)
    const defaultColor = '#eef2ff';
    const defaultBorder = '#6366f1';
    const newZone = { id: tempId, x, y, width: 0, height: 0, name: '', color: defaultColor, borderColor: defaultBorder };
    setZones((prev) => [...prev, newZone]);
    setSelectedZoneId(tempId);

    const { data, error } = await supabase
      .from('floorplan_zones')
      .insert({ 
        x: Math.round(x), 
        y: Math.round(y), 
        width: 0, 
        height: 0,
        color: defaultColor,
        border_color: defaultBorder,
      })
      .select()
      .single();

    if (data && !error) {
      setZones((prev) => prev.map((z) => z.id === tempId ? { ...z, id: data.id, color: data.color || defaultColor, borderColor: data.border_color || defaultBorder } : z));
      setSelectedZoneId(data.id);
    }
  }, []);

  const handleDrawZone = useCallback((e) => {
    if (!isDrawingZone || !zoneStart.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - canvas.left;
    const currentY = e.clientY - canvas.top;
    
    setZones((prev) => prev.map((z, i) => {
      if (i === prev.length - 1) {
        const width = currentX - zoneStart.current.x;
        const height = currentY - zoneStart.current.y;
        return {
          ...z,
          width: Math.abs(width),
          height: Math.abs(height),
          x: width < 0 ? currentX : zoneStart.current.x,
          y: height < 0 ? currentY : zoneStart.current.y,
        };
      }
      return z;
    }));
  }, [isDrawingZone]);

  const handleStopDrawingZone = useCallback(async () => {
    setIsDrawingZone(false);

    if (selectedZoneId && !selectedZoneId.startsWith('zone_')) {
      const zone = zones.find(z => z.id === selectedZoneId);
      if (zone && zone.width > 10 && zone.height > 10) {
        await supabase
          .from('floorplan_zones')
          .update({
            width: Math.round(zone.width),
            height: Math.round(zone.height),
            color: zone.color,
            border_color: zone.borderColor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedZoneId);
        console.log('✅ Zona creada:', { id: selectedZoneId, width: Math.round(zone.width), height: Math.round(zone.height), color: zone.color, borderColor: zone.borderColor });
      } else if (zone) {
        setZones((prev) => prev.filter(z => z.id !== selectedZoneId));
        await supabase.from('floorplan_zones').delete().eq('id', selectedZoneId);
      }
    }

    zoneStart.current = null;
  }, [selectedZoneId, zones]);

  const handleStartResizeZone = useCallback((e, zone) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const canvas = canvasRef.current.getBoundingClientRect();
    resizeStart.current = {
      x: e.clientX - canvas.left,
      y: e.clientY - canvas.top,
      zoneId: zone.id,
      originalWidth: zone.width,
      originalHeight: zone.height,
      originalX: zone.x,
      originalY: zone.y,
    };
    setIsResizingZone(true);
  }, []);

  const handleResizeZone = useCallback((e) => {
    if (!isResizingZone || !resizeStart.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - canvas.left;
    const currentY = e.clientY - canvas.top;
    
    setZones((prev) => prev.map((z) => {
      if (z.id === resizeStart.current.zoneId) {
        const newWidth = Math.max(50, currentX - resizeStart.current.originalX);
        const newHeight = Math.max(50, currentY - resizeStart.current.originalY);
        return { ...z, width: newWidth, height: newHeight };
      }
      return z;
    }));
  }, [isResizingZone]);

  const handleStopResizeZone = useCallback(async () => {
    setIsResizingZone(false);

    if (resizeStart.current && resizeStart.current.zoneId) {
      const zone = zones.find(z => z.id === resizeStart.current.zoneId);
      if (zone) {
        await supabase
          .from('floorplan_zones')
          .update({
            width: Math.round(zone.width),
            height: Math.round(zone.height),
            color: zone.color,
            border_color: zone.borderColor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resizeStart.current.zoneId);
        console.log('✅ Zona redimensionada:', { id: zone.id, width: Math.round(zone.width), height: Math.round(zone.height) });
      }
    }

    resizeStart.current = null;
  }, [zones]);

  // Mover estructuras
  const handleStartMoveStructure = useCallback((e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const canvas = canvasRef.current.getBoundingClientRect();
    const structure = structures.find(s => s.id === id);
    if (!structure) return;
    
    moveStart.current = {
      id,
      type: 'structure',
      offsetX: e.clientX - canvas.left - structure.x,
      offsetY: e.clientY - canvas.top - structure.y,
    };
  }, [structures]);

  // Mover zonas
  const handleStartMoveZone = useCallback((e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const canvas = canvasRef.current.getBoundingClientRect();
    const zone = zones.find(z => z.id === id);
    if (!zone) return;
    
    moveStart.current = {
      id,
      type: 'zone',
      offsetX: e.clientX - canvas.left - zone.x,
      offsetY: e.clientY - canvas.top - zone.y,
    };
  }, [zones]);

  const handleMoveElement = useCallback((e) => {
    if (!moveStart.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvas.left - moveStart.current.offsetX;
    const y = e.clientY - canvas.top - moveStart.current.offsetY;
    
    if (moveStart.current.type === 'structure') {
      setStructures((prev) => prev.map((s) => {
        if (s.id === moveStart.current.id) {
          return { ...s, x: Math.max(0, x), y: Math.max(0, y) };
        }
        return s;
      }));
    } else if (moveStart.current.type === 'zone') {
      setZones((prev) => prev.map((z) => {
        if (z.id === moveStart.current.id) {
          return { ...z, x: Math.max(0, x), y: Math.max(0, y) };
        }
        return z;
      }));
    }
  }, []);

  const handleStopMoveElement = useCallback(async () => {
    if (!moveStart.current) return;

    // Guardar posición en Supabase si es zona
    if (moveStart.current.type === 'zone' && !moveStart.current.id.startsWith('zone_')) {
      const zone = zones.find(z => z.id === moveStart.current.id);
      if (zone) {
        await supabase
          .from('floorplan_zones')
          .update({
            x: Math.round(zone.x),
            y: Math.round(zone.y),
            updated_at: new Date().toISOString(),
          })
          .eq('id', moveStart.current.id);
      }
    }

    // Guardar posición en Supabase si es estructura
    if (moveStart.current.type === 'structure' && !moveStart.current.id.startsWith('struct_')) {
      const structure = structures.find(s => s.id === moveStart.current.id);
      if (structure) {
        try {
          await supabase
            .from('floorplan_structures')
            .update({
              x: Math.round(structure.x),
              y: Math.round(structure.y),
              updated_at: new Date().toISOString(),
            })
            .eq('id', moveStart.current.id);
          console.log('✅ Estructura movida guardada:', { id: structure.id, x: Math.round(structure.x), y: Math.round(structure.y) });
        } catch (error) {
          console.error('❌ Error guardando estructura movida:', error);
        }
      }
    }

    moveStart.current = null;
  }, [zones, structures]);

  // Estructuras
  const handleStartStructure = useCallback(async (e, type) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const canvas = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvas.left;
    const y = e.clientY - canvas.top;
    structureStart.current = { x, y, type };

    const newStructure = {
      id: `struct_${Date.now()}`,
      type,
      x,
      y,
      width: type === 'wall' ? 0 : 40,
      height: type === 'wall' ? 0 : undefined,
      size: type === 'column' ? 40 : undefined,
    };
    setStructures((prev) => [...prev, newStructure]);
    setSelectedStructureId(newStructure.id);

    // Guardar en Supabase
    try {
      console.log('Guardando estructura:', { type, x: Math.round(x), y: Math.round(y) });
      
      const { data, error } = await supabase
        .from('floorplan_structures')
        .insert({
          type,
          x: Math.round(x),
          y: Math.round(y),
          width: type === 'wall' ? 0 : null,
          height: type === 'wall' ? 0 : null,
          size: type === 'column' ? 40 : null,
        })
        .select()
        .single();

      console.log('Resultado:', data, error);

      if (data && !error) {
        // Reemplazar ID temporal con ID real
        setStructures((prev) => prev.map((s) => s.id === newStructure.id ? { ...s, id: data.id } : s));
        setSelectedStructureId(data.id);
      }
    } catch (error) {
      console.error('Error guardando estructura:', error);
    }
  }, []);

  const handleDrawStructure = useCallback((e) => {
    if (!structureStart.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - canvas.left;
    const currentY = e.clientY - canvas.top;
    
    setStructures((prev) => prev.map((s, i) => {
      if (i === prev.length - 1 && s.type === 'wall') {
        const width = currentX - structureStart.current.x;
        const height = currentY - structureStart.current.y;
        return {
          ...s,
          width: Math.abs(width),
          height: Math.abs(height),
          x: width < 0 ? currentX : structureStart.current.x,
          y: height < 0 ? currentY : structureStart.current.y,
        };
      }
      return s;
    }));
  }, []);

  const handleStopStructure = useCallback(async () => {
    // Guardar estructura en Supabase cuando se termina de dibujar
    if (structureStart.current) {
      const lastStructure = structures[structures.length - 1];
      if (lastStructure && lastStructure.type === 'wall' && !lastStructure.id.startsWith('struct_')) {
        try {
          // Solo guardar si tiene dimensiones válidas
          if (lastStructure.width > 10 && lastStructure.height > 10) {
            await supabase
              .from('floorplan_structures')
              .update({
                width: Math.round(lastStructure.width),
                height: Math.round(lastStructure.height),
                updated_at: new Date().toISOString(),
              })
              .eq('id', lastStructure.id);
            console.log('✅ Pared guardada con dimensiones:', { id: lastStructure.id, width: Math.round(lastStructure.width), height: Math.round(lastStructure.height) });
          }
        } catch (error) {
          console.error('❌ Error guardando pared:', error);
        }
      }
    }

    structureStart.current = null;
    setStructureMode(null);
  }, [structures]);

  const handleDeleteStructure = useCallback(async (id) => {
    setStructures((prev) => prev.filter(s => s.id !== id));
    
    // Eliminar de Supabase si no es ID temporal
    if (!id.startsWith('struct_')) {
      try {
        await supabase
          .from('floorplan_structures')
          .delete()
          .eq('id', id);
      } catch (error) {
        console.error('Error eliminando estructura:', error);
      }
    }
  }, []);

  // Copiar elemento
  const handleCopy = useCallback((element, type) => {
    setCopiedElement({ ...element, type });
  }, []);

  // Pegar elemento
  const handlePaste = useCallback(async () => {
    if (!copiedElement) return;

    if (copiedElement.type === 'zone') {
      const newZone = {
        id: `zone_${Date.now()}`,
        x: copiedElement.x + 20,
        y: copiedElement.y + 20,
        width: copiedElement.width,
        height: copiedElement.height,
        name: `${copiedElement.name} (copia)`,
        color: copiedElement.color,
        borderColor: copiedElement.borderColor,
      };
      setZones(prev => [...prev, newZone]);
      setSelectedZoneId(newZone.id);

      // Guardar en Supabase inmediatamente
      try {
        const { data, error } = await supabase
          .from('floorplan_zones')
          .insert({
            x: Math.round(newZone.x),
            y: Math.round(newZone.y),
            width: Math.round(newZone.width),
            height: Math.round(newZone.height),
            name: newZone.name,
            color: newZone.color,
            border_color: newZone.borderColor,
          })
          .select()
          .single();

        if (data && !error) {
          // Reemplazar ID temporal con ID real
          setZones(prev => prev.map(z => z.id === newZone.id ? { ...z, id: data.id } : z));
          setSelectedZoneId(data.id);
          console.log('✅ Zona copiada guardada:', { id: data.id, name: data.name });
        } else if (error) {
          console.error('❌ Error guardando zona copiada:', error);
        }
      } catch (error) {
        console.error('❌ Error guardando zona copiada:', error);
      }

    } else if (copiedElement.type === 'wall' || copiedElement.type === 'column') {
      const newStructure = {
        id: `struct_${Date.now()}`,
        type: copiedElement.type,
        x: copiedElement.x + 20,
        y: copiedElement.y + 20,
        width: copiedElement.width,
        height: copiedElement.height,
        size: copiedElement.size,
      };
      setStructures(prev => [...prev, newStructure]);
      setSelectedStructureId(newStructure.id);

      // Guardar en Supabase inmediatamente
      try {
        const { data, error } = await supabase
          .from('floorplan_structures')
          .insert({
            type: newStructure.type,
            x: Math.round(newStructure.x),
            y: Math.round(newStructure.y),
            width: newStructure.type === 'wall' ? Math.round(newStructure.width) : null,
            height: newStructure.type === 'wall' ? Math.round(newStructure.height) : null,
            size: newStructure.type === 'column' ? Math.round(newStructure.size) : null,
          })
          .select()
          .single();

        if (data && !error) {
          // Reemplazar ID temporal con ID real
          setStructures(prev => prev.map(s => s.id === newStructure.id ? { ...s, id: data.id } : s));
          setSelectedStructureId(data.id);
          console.log('✅ Estructura copiada guardada:', { id: data.id, type: data.type });
        } else if (error) {
          console.error('❌ Error guardando estructura copiada:', error);
        }
      } catch (error) {
        console.error('❌ Error guardando estructura copiada:', error);
      }
    }
  }, [copiedElement]);

  const counts = localTables.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f1f5f9", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: isMobile ? "10px 12px" : "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "10px" : "0",
      }}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, color: "#1e293b" }}>📍 Plano de Sala</div>
          {/* Badge de Solo Lectura para meseros */}
          {!isAdmin && (
            <span style={{
              padding: '3px 8px',
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              👁️ Solo Lectura
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: val.color }} />
              <span style={{ color: "#475569", fontSize: isMobile ? 10 : 11 }}>{val.label}</span>
              <span style={{ fontWeight: 700, color: "#1e293b", fontSize: isMobile ? 10 : 11 }}>{counts[key] || 0}</span>
            </div>
          ))}
        </div>
        {/* Botones de herramientas - Solo para admin */}
        {isAdmin && (
        <div style={{ display: "flex", gap: "4px", flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '8px' : '0' }}>
          {/* Botón Pegar - Solo aparece si hay algo copiado */}
          {copiedElement && (
            <button
              onClick={handlePaste}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 6,
                border: "2px solid #8b5cf6", background: "#f5f3ff",
                color: "#7c3aed", fontWeight: 700, fontSize: 10,
                cursor: "pointer",
              }}
              title={`Pegar ${copiedElement.type === 'zone' ? 'zona' : copiedElement.type}`}
            >
              <Clipboard size={isMobile ? 12 : 14} /> Pegar
            </button>
          )}
          {/* Botón Crear Zona */}
          <button
            onClick={() => { setIsDrawingZone(true); setSelectedZoneId(null); }}
            disabled={isDrawingZone}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 6,
              border: isDrawingZone ? "2px solid #6366f1" : "1px solid #e2e8f0",
              background: isDrawingZone ? "#eef2ff" : "#f8fafc",
              color: isDrawingZone ? "#6366f1" : "#64748b", fontWeight: 600, fontSize: 10,
              cursor: isDrawingZone ? "not-allowed" : "pointer",
            }}
          >
            <Plus size={isMobile ? 12 : 14} /> {isMobile ? (isDrawingZone ? "..." : "Zona") : (isDrawingZone ? "Arrastra..." : "Crear Zona")}
          </button>
          {/* Botón Pared */}
          <button
            onClick={() => setStructureMode(structureMode === 'wall' ? null : 'wall')}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 6,
              border: structureMode === 'wall' ? "2px solid #64748b" : "1px solid #e2e8f0",
              background: structureMode === 'wall' ? "#f1f5f9" : "#f8fafc",
              color: structureMode === 'wall' ? "#475569" : "#64748b", fontWeight: 600, fontSize: 10,
              cursor: "pointer",
            }}
          >
            <Square size={isMobile ? 12 : 14} /> {isMobile ? (structureMode === 'wall' ? "..." : "Pared") : (structureMode === 'wall' ? "Arrastra..." : "Pared")}
          </button>
          {/* Botón Columna */}
          <button
            onClick={() => setStructureMode(structureMode === 'column' ? null : 'column')}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 6,
              border: structureMode === 'column' ? "2px solid #64748b" : "1px solid #e2e8f0",
              background: structureMode === 'column' ? "#f1f5f9" : "#f8fafc",
              color: structureMode === 'column' ? "#475569" : "#64748b", fontWeight: 600, fontSize: 10,
              cursor: "pointer",
            }}
          >
            <Circle size={isMobile ? 12 : 14} /> {isMobile ? (structureMode === 'column' ? "..." : "Col.") : (structureMode === 'column' ? "Click..." : "Columna")}
          </button>
          {/* Botones para ampliar canvas */}
          <button
            onClick={() => setCanvasHeight(h => Math.min(h + 100, 1200))}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 6,
              border: "1px solid #22c55e", background: "#f0fdf4", color: "#16a34a",
              fontWeight: 600, fontSize: 10, cursor: "pointer",
            }}
            title="Ampliar área"
          >
            <Plus size={isMobile ? 12 : 14} /> {canvasHeight < 1200 ? 'Ampliar' : 'Max'}
          </button>
          <button
            onClick={() => setCanvasHeight(h => Math.max(h - 100, 300))}
            disabled={canvasHeight <= 300}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 6,
              border: "1px solid #ef4444", background: canvasHeight <= 300 ? '#f9fafb' : "#fef2f2",
              color: canvasHeight <= 300 ? '#9ca3af' : "#dc2626",
              fontWeight: 600, fontSize: 10, cursor: canvasHeight <= 300 ? "not-allowed" : "pointer",
            }}
            title="Reducir área"
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>−</span> {canvasHeight > 300 ? 'Reducir' : 'Min'}
          </button>
          {zones.length > 0 && (
            <button
              onClick={async () => {
                if (confirm('¿Eliminar todas las zonas?')) {
                  setZones([]);
                  await supabase.from('floorplan_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                  localStorage.removeItem('floorplan_zones');
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 6,
                border: "1px solid #ef4444", background: "#fef2f2", color: "#dc2626",
                fontWeight: 600, fontSize: 10, cursor: "pointer",
              }}
            >
              <X size={isMobile ? 12 : 14} />
              {isMobile ? "Borrar" : "Limpiar Zonas"}
            </button>
          )}
        </div>
        )}
        {/* Mensaje para meseros - Sin botones */}
        {!isAdmin && isMobile && (
          <div style={{ 
            padding: '8px', 
            background: '#fef3c7', 
            borderRadius: '6px', 
            fontSize: '10px', 
            color: '#92400e',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            👁️ Vista de solo lectura - Contacta al admin para editar
          </div>
        )}
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", margin: 24, borderRadius: 16, overflow: "hidden", background: "#e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        {/* Alerta de orientación para móviles */}
        {showOrientationAlert && isAdmin && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: 'white',
            padding: '1rem',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <path d="M12 18h.01"/>
              </svg>
            </div>
            <div>
              <div>📱 Gira tu dispositivo</div>
              <div style={{fontSize: '0.75rem', fontWeight: 400, opacity: 0.9}}>Coloca en horizontal para ver el Floor Plan completo</div>
            </div>
            <button
              onClick={() => setShowOrientationAlert(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {isLoadingZones && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(255,255,255,0.9)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div style={{
              width: 40, height: 40, border: "4px solid #e2e8f0",
              borderTopColor: "#6366f1", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}></div>
          </div>
        )}
        <div
          ref={canvasRef}
          onMouseMove={(e) => {
            handleMouseMove(e);
            handleDrawZone(e);
            handleResizeZone(e);
            handleMoveElement(e);
            if (structureMode) handleDrawStructure(e);
          }}
          onTouchMove={(e) => {
            handleTouchMove(e);
            handleDrawZone(e);
            handleResizeZone(e);
            handleMoveElement(e);
            if (structureMode) handleDrawStructure(e);
          }}
          onMouseUp={() => {
            handleMouseUp();
            handleStopDrawingZone();
            handleStopResizeZone();
            handleStopMoveElement();
            if (structureMode) handleStopStructure();
          }}
          onTouchEnd={() => {
            handleTouchEnd();
            handleStopDrawingZone();
            handleStopResizeZone();
            handleStopMoveElement();
            if (structureMode) handleStopStructure();
          }}
          onMouseLeave={() => {
            handleMouseUp();
            handleStopDrawingZone();
            handleStopResizeZone();
            handleStopMoveElement();
            handleStopStructure();
          }}
          onMouseDown={(e) => {
            if (isDrawingZone) handleStartDrawingZone(e);
            else if (isResizingZone) { }
            else if (structureMode) handleStartStructure(e, structureMode);
            else {
              setSelectedId(null);
              setSelectedZoneId(null);
              setSelectedStructureId(null);
            }
          }}
          onTouchStart={(e) => {
            if (isDrawingZone) handleStartDrawingZone(e);
            else if (isResizingZone) { }
            else if (structureMode) handleStartStructure(e, structureMode);
            else {
              setSelectedId(null);
              setSelectedZoneId(null);
              setSelectedStructureId(null);
            }
          }}
          onClick={() => {
            if (!isDrawingZone && !isResizingZone && !structureMode && !moveStart.current) {
              setSelectedId(null);
              setSelectedZoneId(null);
              setSelectedStructureId(null);
            }
          }}
          style={{
            position: "relative",
            height: canvasHeight,
            backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: isMobile ? "20px 20px" : "28px 28px",
            backgroundPosition: "14px 14px",
            cursor: isDrawingZone ? "crosshair" : isResizingZone ? "se-resize" : moveStart.current ? "move" : structureMode ? "crosshair" : "default",
            overflow: 'hidden',
            transition: 'height 0.3s ease',
            touchAction: 'none'
          }}
        >
          {/* Decor */}
          <div style={{ position: "absolute", left: 260, top: 130, width: 140, height: 18, background: "#e2e8f0", borderRadius: 4, opacity: 0.6 }} />
          <div style={{ position: "absolute", left: 380, top: 70, width: 16, height: 200, background: "#cbd5e1", borderRadius: 4, opacity: 0.5 }} />
          <div style={{ position: "absolute", left: 260, top: 280, width: 280, height: 18, background: "#e2e8f0", borderRadius: 4, opacity: 0.6 }} />

          {/* Estructuras */}
          {structures.map((element) => (
            <StructureElement
              key={element.id}
              element={element}
              isSelected={selectedStructureId === element.id}
              onClick={setSelectedStructureId}
              onDelete={handleDeleteStructure}
              onMove={handleStartMoveStructure}
              onCopy={handleCopy}
            />
          ))}

          {/* Zonas */}
          {zones.map((zone) => (
            <ZoneRect
              key={zone.id}
              zone={zone}
              isSelected={selectedZoneId === zone.id}
              onClick={handleZoneClick}
              onUpdate={(changes) => handleZoneUpdate(zone.id, changes)}
              onDelete={handleZoneDelete}
              onResize={handleStartResizeZone}
              onMove={handleStartMoveZone}
              onCopy={handleCopy}
            />
          ))}

          {/* Mesas */}
          {localTables.map((table) => (
            <TableNode
              key={table.id}
              table={table}
              isSelected={table.id === selectedId}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleTableClick}
              isAdmin={isAdmin}
            />
          ))}

          {/* Panel config mesa */}
          {selectedTable && (
            <div style={{
              position: "absolute", top: 16, right: 16, width: 240,
              background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
              padding: "20px 18px", zIndex: 100, border: "1px solid #e2e8f0",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Mesa {selectedTable.name}</span>
                <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4 }}>Estado</label>
                <select
                  value={selectedTable.status}
                  onChange={(e) => handleUpdate({ status: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0" }}
                >
                  <option value="available">Disponible</option>
                  <option value="occupied">Ocupada</option>
                  <option value="reserved">Reservada</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
