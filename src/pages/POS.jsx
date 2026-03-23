import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, Minus, Trash2, StickyNote } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function POS() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [tables, setTables] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNotes, setShowNotes] = useState(false)
  const [noteItemIndex, setNoteItemIndex] = useState(null)
  const [noteText, setNoteText] = useState('')
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  // Seleccionar mesa automáticamente si viene por URL
  useEffect(() => {
    const tableId = searchParams.get('table')
    console.log('🔍 Parámetro table en URL:', tableId)
    console.log('🔍 Mesas cargadas:', tables.length)
    
    if (tableId && tables.length > 0) {
      setSelectedTable(tableId)
      const table = tables.find(t => t.id === tableId)
      if (table) {
        console.log('✅ Mesa encontrada:', table.name, table.status)
        toast.success(`Mesa ${table.name} seleccionada`)
      } else {
        console.log('❌ Mesa no encontrada en la lista')
      }
    }
  }, [searchParams, tables])

  async function fetchData() {
    try {
      setError(null)
      setLoading(true)

      console.log('🛒 Cargando mesas para pedido...')

      // Obtener TODAS las mesas primero
      const { data: allTables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('name')

      console.log('🪑 allTables:', allTables)
      console.log('🪑 tablesError:', tablesError)

      if (tablesError) {
        console.error('Error al obtener mesas:', tablesError)
        throw tablesError
      }

      console.log('🪑 Todas las mesas:', allTables?.length || 0)
      console.log('🪑 Estados de mesas:', allTables?.map(t => `${t.name} (${t.status})`))

      // Filtrar manualmente las que están occupied o reserved
      const mesasOcupadasOReservadas = allTables?.filter(t => 
        t.status === 'occupied' || t.status === 'reserved'
      ) || []

      console.log('🪑 Mesas occupied o reserved:', mesasOcupadasOReservadas.length)
      console.log('🪑 Mesas filtradas:', mesasOcupadasOReservadas)

      // Obtener mesas con órdenes activas
      const { data: ordenesActivas } = await supabase
        .from('orders')
        .select('table_id')
        .in('status', ['pending', 'cooking', 'served'])

      const mesasConOrden = new Set(ordenesActivas?.map(o => o.table_id) || [])

      console.log('🪑 Mesas con orden activa:', mesasConOrden.size)

      // Filtrar las que NO tienen órdenes activas
      const mesasDisponibles = mesasOcupadasOReservadas.filter(t => !mesasConOrden.has(t.id))

      console.log('🪑 Mesas disponibles para pedido:', mesasDisponibles.length)
      console.log('🪑 Mesas:', mesasDisponibles.map(m => `${m.name} (${m.status})`))

      const { data: categoriesData } = await supabase.from('categories').select('*').order('name')
      const { data: productsData } = await supabase.from('products').select('*, categories(name)').eq('available', true).order('name')

      setTables(mesasDisponibles)
      setCategories(categoriesData || [])
      setProducts(productsData || [])
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
      toast.error('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1, notes: '' }]
    })
  }

  function removeFromCart(index) {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  function updateQuantity(index, delta) {
    setCart(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }))
  }

  function addNoteToItem(index) {
    setNoteItemIndex(index)
    setNoteText(cart[index]?.notes || '')
    setShowNotes(true)
  }

  function saveNote() {
    if (noteItemIndex !== null) {
      setCart(prev => prev.map((item, i) => i === noteItemIndex ? { ...item, notes: noteText } : item))
      setShowNotes(false)
      setNoteItemIndex(null)
      setNoteText('')
      toast.success('Nota agregada')
    }
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = cartSubtotal * 0.19
  const cartTotal = cartSubtotal + tax

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  async function createOrder() {
    if (!selectedTable) {
      toast.warning('Selecciona una mesa primero')
      return
    }
    if (cart.length === 0) {
      toast.warning('Agrega productos al pedido')
      return
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          table_id: selectedTable,
          waiter_id: profile.id,  // Asignar mesero actual a la orden
          status: 'pending',
          subtotal: cartSubtotal,
          tax: tax,
          total: cartTotal
        }])
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        notes: item.notes,
        status: 'pending'
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      await supabase.from('tables').update({ status: 'occupied' }).eq('id', selectedTable)

      toast.success('¡Orden creada!')
      setCart([])
      setSelectedTable(null)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al crear orden: ' + error.message)
    }
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error al cargar datos</h3>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchData} style={{ marginTop: '1rem' }}>Reintentar</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Nuevo Pedido</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {tables.length} mesas ocupadas | {products.length} productos disponibles
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchData}>
          🔄 Refrescar
        </button>
      </div>

      {/* Layout responsive: Columna en móvil, fila en desktop */}
      <div style={{ 
        display: 'flex', 
        gap: '1.5rem',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block', fontSize: '0.925rem' }}>
              🪑 Paso 1: Seleccionar Mesa
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Solo aparecen mesas ocupadas sin pedido activo
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {tables.length === 0 ? (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    ⚠️ No hay mesas disponibles para nuevo pedido.
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Las mesas ocupadas ya tienen un pedido en curso.
                  </p>
                  <a href="/mesas" className="btn btn-primary btn-sm">Ir a Mesas</a>
                </div>
              ) : (
                tables.map(table => (
                  <button
                    key={table.id}
                    className={selectedTable === table.id ? 'btn btn-primary' : 'btn btn-outline'}
                    onClick={() => setSelectedTable(table.id)}
                    style={{ 
                      fontSize: window.innerWidth <= 768 ? '0.8125rem' : '0.875rem',
                      padding: window.innerWidth <= 768 ? '0.5rem 0.875rem' : '0.625rem 1rem'
                    }}
                  >
                    {table.name} {selectedTable === table.id && '✓'}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, minHeight: '40px' }}
              />
              <select 
                className="form-control" 
                style={{ 
                  width: window.innerWidth <= 768 ? '100%' : 'auto',
                  minHeight: '40px'
                }} 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid" style={{ 
            gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(3, 1fr)',
            gap: window.innerWidth <= 768 ? '1rem' : '1.5rem'
          }}>
            {filteredProducts.map(product => (
              <div key={product.id} className="card" onClick={() => addToCart(product)} style={{ 
                cursor: 'pointer',
                padding: window.innerWidth <= 768 ? '1rem' : '1.25rem'
              }}>
                <h4 style={{ 
                  fontSize: window.innerWidth <= 768 ? '0.925rem' : '1rem', 
                  marginBottom: '0.5rem' 
                }}>{product.name}</h4>
                <p style={{ 
                  fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '0.75rem', 
                  minHeight: '30px' 
                }}>
                  {product.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontWeight: 700, 
                    color: 'var(--primary)',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '1.125rem'
                  }}>${parseFloat(product.price).toFixed(2)}</span>
                  <button 
                    className="btn btn-primary" 
                    style={{ 
                      padding: window.innerWidth <= 768 ? '0.5rem 0.75rem' : '0.375rem 0.75rem'
                    }}
                  >
                    <Plus size={window.innerWidth <= 768 ? 18 : 16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carrito - En móvil va debajo, en desktop a la derecha */}
        <div style={{ 
          width: window.innerWidth <= 768 ? '100%' : '350px',
          flexShrink: 0
        }}>
          <div className="card" style={{ 
            position: window.innerWidth <= 768 ? 'relative' : 'sticky', 
            top: window.innerWidth <= 768 ? '0' : '1rem' 
          }}>
            <h3 style={{ 
              marginBottom: '1rem',
              fontSize: window.innerWidth <= 768 ? '1.0625rem' : '1.125rem'
            }}>🛒 Orden Actual</h3>
            
            {cart.length === 0 ? (
              <div className="empty-state">
                <p>Selecciona una mesa y agrega productos</p>
              </div>
            ) : (
              <>
                <div style={{ 
                  maxHeight: window.innerWidth <= 768 ? '400px' : '300px', 
                  overflowY: 'auto', 
                  marginBottom: '1rem' 
                }}>
                  {cart.map((item, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.5rem', 
                        padding: '0.5rem 0', 
                        borderBottom: '1px solid var(--border)' 
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: window.innerWidth <= 768 ? '0.8125rem' : '0.875rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>{item.name}</div>
                        <div style={{ 
                          fontSize: window.innerWidth <= 768 ? '0.6875rem' : '0.75rem', 
                          color: 'var(--text-secondary)' 
                        }}>${parseFloat(item.price).toFixed(2)} c/u</div>
                        {item.notes && (
                          <div style={{ 
                            fontSize: window.innerWidth <= 768 ? '0.625rem' : '0.7rem', 
                            color: 'var(--warning)', 
                            marginTop: '0.25rem' 
                          }}>📝 {item.notes}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ 
                            padding: window.innerWidth <= 768 ? '0.375rem' : '0.25rem',
                            minWidth: window.innerWidth <= 768 ? '32px' : '28px',
                            height: window.innerWidth <= 768 ? '32px' : '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }} 
                          onClick={() => updateQuantity(index, -1)}
                        >
                          <Minus size={window.innerWidth <= 768 ? 16 : 14} />
                        </button>
                        <span style={{ 
                          minWidth: '24px', 
                          textAlign: 'center', 
                          fontWeight: 600,
                          fontSize: window.innerWidth <= 768 ? '0.8125rem' : '0.875rem'
                        }}>{item.quantity}</span>
                        <button 
                          className="btn btn-outline" 
                          style={{ 
                            padding: window.innerWidth <= 768 ? '0.375rem' : '0.25rem',
                            minWidth: window.innerWidth <= 768 ? '32px' : '28px',
                            height: window.innerWidth <= 768 ? '32px' : '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }} 
                          onClick={() => updateQuantity(index, 1)}
                        >
                          <Plus size={window.innerWidth <= 768 ? 16 : 14} />
                        </button>
                      </div>
                      <button 
                        className="btn btn-outline" 
                        style={{ 
                          padding: window.innerWidth <= 768 ? '0.375rem' : '0.25rem',
                          minWidth: window.innerWidth <= 768 ? '32px' : '28px',
                          height: window.innerWidth <= 768 ? '32px' : '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }} 
                        onClick={() => addNoteToItem(index)}
                      >
                        <StickyNote size={window.innerWidth <= 768 ? 16 : 14} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ 
                          padding: window.innerWidth <= 768 ? '0.375rem' : '0.25rem',
                          minWidth: window.innerWidth <= 768 ? '32px' : '28px',
                          height: window.innerWidth <= 768 ? '32px' : '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }} 
                        onClick={() => removeFromCart(index)}
                      >
                        <Trash2 size={window.innerWidth <= 768 ? 16 : 14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                    <span>${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Impuesto (19%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: window.innerWidth <= 768 ? '1.125rem' : '1.25rem', 
                    fontWeight: 700, 
                    marginBottom: '1rem' 
                  }}>
                    <span>Total:</span>
                    <span style={{ color: 'var(--primary)' }}>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    className="btn btn-success btn-lg" 
                    style={{ 
                      width: '100%',
                      padding: window.innerWidth <= 768 ? '1rem' : '1.125rem',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '1.0625rem'
                    }} 
                    onClick={createOrder} 
                    disabled={!selectedTable}
                  >
                    📤 Enviar a Cocina
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showNotes && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📝 Agregar Nota</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Producto: <strong>{cart[noteItemIndex]?.name}</strong></p>
            <textarea className="form-control" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ej: Sin cebolla, extra salsa..." rows="4" autoFocus />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowNotes(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={saveNote}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POS
