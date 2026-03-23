import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { useToast } from '../context/ToastContext'

function Menu() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', cost: '', category_id: '', available: true, preparation_time: 10
  })
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setError(null)
      setLoading(true)
      
      const { data: cats } = await supabase.from('categories').select('*').order('name')
      const { data: prods } = await supabase.from('products').select('*, categories(name)').order('name')
      
      setCategories(cats || [])
      setProducts(prods || [])
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
      toast.error('Error al cargar menú: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        preparation_time: parseInt(formData.preparation_time) || 0,
        category_id: formData.category_id || null
      }
      
      if (editingProduct) {
        const { error } = await supabase.from('products').update(data).eq('id', editingProduct.id)
        if (error) throw error
        toast.success('Producto actualizado')
      } else {
        const { error } = await supabase.from('products').insert([data])
        if (error) throw error
        toast.success('Producto creado')
      }
      
      setShowModal(false)
      setEditingProduct(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  function resetForm() {
    setFormData({ name: '', description: '', price: '', cost: '', category_id: '', available: true, preparation_time: 10 })
  }

  async function deleteProduct(id) {
    if (!confirm('¿Eliminar producto?')) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      toast.success('Producto eliminado')
      fetchData()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  async function toggleAvailability(id, available) {
    try {
      await supabase.from('products').update({ available: !available }).eq('id', id)
      toast.success(!available ? 'Producto disponible' : 'Producto oculto')
      fetchData()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  function editProduct(product) {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
      category_id: product.category_id || '',
      available: product.available,
      preparation_time: product.preparation_time || 10
    })
    setShowModal(true)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error al cargar menú</h3>
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
          <h2>Menú / Productos</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {products.length} productos | {products.filter(p => p.available).length} disponibles
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select className="form-control" style={{ width: 'auto' }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">Todas las categorías</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No se encontraron productos</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      {product.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{product.description}</div>}
                    </td>
                    <td>
                      <span className="badge badge-secondary">{product.categories?.name || '-'}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${parseFloat(product.price).toFixed(2)}</td>
                    <td>
                      <span className={'badge badge-' + (product.available ? 'success' : 'secondary')}>
                        {product.available ? 'Disponible' : 'No disponible'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => editProduct(product)}><Edit size={14} /></button>
                        <button className="btn btn-outline btn-sm" onClick={() => toggleAvailability(product.id, product.available)}>
                          {product.available ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(product.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <h3>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="3" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Precio *</label>
                  <input type="number" step="0.01" className="form-control" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Costo</label>
                  <input type="number" step="0.01" className="form-control" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select className="form-control" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Tiempo preparación (min)</label>
                <input type="number" className="form-control" value={formData.preparation_time} onChange={(e) => setFormData({ ...formData, preparation_time: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={formData.available} onChange={(e) => setFormData({ ...formData, available: e.target.checked })} />
                  Disponible para venta
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Menu
