import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { TrendingUp, DollarSign, ShoppingBag, Users, Calendar, Download, FileText, Table, FileSpreadsheet } from 'lucide-react'

function Reportes() {
  const { profile } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState('week')
  const [reportData, setReportData] = useState({
    totalVentas: 0,
    totalPedidos: 0,
    ticketPromedio: 0,
    metodoPago: { cash: 0, card: 0, transfer: 0, split: 0 },
    productosMasVendidos: [],
    reservasPorEstado: { confirmed: 0, seated: 0, completed: 0, cancelled: 0 },
    mesasOcupadas: 0,
    ventasPorDia: []
  })

  useEffect(() => {
    loadReportData()
  }, [filterPeriod])

  async function loadReportData() {
    try {
      setLoading(true)

      // Calcular fechas según el filtro
      const ahora = new Date()
      let fechaInicio = new Date()

      if (filterPeriod === 'week') {
        const diaSemana = ahora.getDay()
        fechaInicio.setDate(ahora.getDate() - diaSemana)
        fechaInicio.setHours(0, 0, 0, 0)
      } else if (filterPeriod === 'month') {
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      }

      const fechaInicioStr = fechaInicio.toISOString()

      // 1. Obtener pedidos pagados
      const { data: pedidos } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', fechaInicioStr)
        .eq('status', 'paid')

      // 2. Calcular totales
      const totalVentas = pedidos?.reduce((sum, p) => sum + parseFloat(p.total || 0), 0) || 0
      const totalPedidos = pedidos?.length || 0
      const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0

      // 3. Métodos de pago
      const metodoPago = { cash: 0, card: 0, transfer: 0, split: 0 }
      pedidos?.forEach(pedido => {
        const method = pedido.payment_method || 'cash'
        if (metodoPago[method] !== undefined) {
          metodoPago[method] += parseFloat(pedido.total || 0)
        }
      })

      // 4. Productos más vendidos
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_name, quantity')
        .in('status', ['served', 'ready', 'pending', 'cooking'])
        .gte('created_at', fechaInicioStr)

      const productosContador = {}
      orderItems?.forEach(item => {
        productosContador[item.product_name] = (productosContador[item.product_name] || 0) + item.quantity
      })

      const productosMasVendidos = Object.entries(productosContador)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      // 5. Reservas por estado
      const { data: reservas } = await supabase
        .from('reservations')
        .select('status')
        .gte('created_at', fechaInicioStr)

      const reservasPorEstado = { confirmed: 0, seated: 0, completed: 0, cancelled: 0 }
      reservas?.forEach(reserva => {
        if (reservasPorEstado[reserva.status] !== undefined) {
          reservasPorEstado[reserva.status]++
        }
      })

      // 6. Mesas ocupadas
      const { data: mesasData } = await supabase.from('tables').select('status')
      const mesasOcupadas = mesasData?.filter(m => m.status === 'occupied').length || 0
      const mesasTotales = mesasData?.length || 0

      // 7. Ventas por día (para gráfica)
      const ventasPorDia = []
      if (filterPeriod === 'week' || filterPeriod === 'month') {
        const dias = filterPeriod === 'week' ? 7 : 30
        for (let i = dias - 1; i >= 0; i--) {
          const dia = new Date()
          dia.setDate(dia.getDate() - i)
          const diaStr = dia.toISOString().split('T')[0]
          
          const ventasDelDia = pedidos?.filter(p => {
            const pDate = new Date(p.created_at).toISOString().split('T')[0]
            return pDate === diaStr
          }).reduce((sum, p) => sum + parseFloat(p.total || 0), 0) || 0

          ventasPorDia.push({
            date: diaStr,
            label: dia.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            value: ventasDelDia
          })
        }
      }

      setReportData({
        totalVentas,
        totalPedidos,
        ticketPromedio,
        metodoPago,
        productosMasVendidos,
        reservasPorEstado,
        mesasOcupadas,
        mesasTotales,
        ventasPorDia
      })
    } catch (error) {
      console.error('Error loading report data:', error)
      toast.error('Error al cargar reportes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function exportReport() {
    const reportDataStr = JSON.stringify(reportData, null, 2)
    const blob = new Blob([reportDataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${filterPeriod}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Reporte exportado')
  }

  function exportToPDF() {
    try {
      toast.info('Generando PDF profesional...')
      
      // Acceder a jsPDF correctamente desde CDN
      const { jsPDF } = window.jspdf
      
      if (!jsPDF) {
        throw new Error('jsPDF no está disponible')
      }
      
      // Crear PDF - Tamaño US Letter (8.5 x 11 pulgadas = 612 x 792 puntos)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      })
      
      // Colores
      const colors = {
        primary: '#1A3C5E',    // Azul marino
        secondary: '#D6E4F0',  // Azul claro
        gray: '#F5F5F5',       // Gris claro
        text: '#333333',       // Gris oscuro
        white: '#FFFFFF'
      }
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 40
      
      let yPos = margin
      
      // ============================================
      // HEADER
      // ============================================
      doc.setFont('arial', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(colors.primary)
      doc.text('POS RESTAURANTE', margin, yPos + 12)
      
      // Línea azul marino inferior
      doc.setDrawColor(colors.primary)
      doc.setLineWidth(2)
      doc.line(margin, yPos + 20, pageWidth - margin, yPos + 20)
      
      yPos += 45
      
      // ============================================
      // TÍTULO PRINCIPAL
      // ============================================
      doc.setFont('arial', 'bold')
      doc.setFontSize(28)
      doc.setTextColor(colors.primary)
      doc.text('REPORTE DE VENTAS DIARIO', pageWidth / 2, yPos, { align: 'center' })
      
      yPos += 20
      
      // Subtítulo con fecha
      doc.setFont('arial', 'normal')
      doc.setFontSize(12)
      doc.setTextColor('#666666')
      const periodoLabel = filterPeriod === 'week' ? 'Esta Semana' : 'Este Mes'
      const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      doc.text(`${periodoLabel} - ${fechaGeneracion}`, pageWidth / 2, yPos, { align: 'center' })
      
      yPos += 40
      
      // ============================================
      // TARJETAS KPI (4 columnas)
      // ============================================
      const cardWidth = (pageWidth - (margin * 2) - (3 * 10)) / 4
      
      // Función para crear tarjeta KPI
      const createKPICard = (x, y, value, label, color) => {
        // Fondo azul claro
        doc.setFillColor(colors.secondary)
        doc.roundedRect(x, y, cardWidth, 70, 3, 3, 'F')
        
        // Valor en grande
        doc.setFont('arial', 'bold')
        doc.setFontSize(24)
        doc.setTextColor(color || colors.primary)
        doc.text(value, x + cardWidth / 2, y + 35, { align: 'center' })
        
        // Label en gris
        doc.setFont('arial', 'normal')
        doc.setFontSize(10)
        doc.setTextColor('#666666')
        doc.text(label, x + cardWidth / 2, y + 50, { align: 'center' })
      }
      
      // Ventas Totales
      createKPICard(margin, yPos, `$${reportData.totalVentas.toFixed(2)}`, 'Ventas Totales', colors.primary)
      
      // Total Pedidos
      createKPICard(margin + cardWidth + 10, yPos, `${reportData.totalPedidos}`, 'Total Pedidos', colors.primary)
      
      // Ticket Promedio
      createKPICard(margin + (cardWidth + 10) * 2, yPos, `$${reportData.ticketPromedio.toFixed(2)}`, 'Ticket Promedio', colors.primary)
      
      // Mesas Ocupadas
      createKPICard(margin + (cardWidth + 10) * 3, yPos, `${reportData.mesasOcupadas}/${reportData.mesasTotales}`, 'Mesas Ocupadas', colors.primary)
      
      yPos += 110
      
      // ============================================
      // MÉTODOS DE PAGO - TABLA
      // ============================================
      yPos += 10
      
      doc.setFont('arial', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(colors.primary)
      doc.text('MÉTODOS DE PAGO', margin, yPos)
      
      yPos += 15
      
      // Configurar tabla
      const tableWidth = pageWidth - (margin * 2)
      const colWidths = [tableWidth * 0.5, tableWidth * 0.25, tableWidth * 0.25]
      
      // Header de la tabla
      doc.setFillColor(colors.primary)
      doc.rect(margin, yPos, tableWidth, 25, 'F')
      
      doc.setFont('arial', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(colors.white)
      doc.text('Método', margin + 10, yPos + 16)
      doc.text('Monto', margin + colWidths[0] + 10, yPos + 16, { align: 'right' })
      doc.text('Participación', margin + colWidths[0] + colWidths[1] + 10, yPos + 16, { align: 'right' })
      
      yPos += 25
      
      // Datos de métodos de pago
      const paymentMethods = [
        { name: 'Efectivo', value: reportData.metodoPago.cash, total: reportData.totalVentas },
        { name: 'Tarjeta', value: reportData.metodoPago.card, total: reportData.totalVentas },
        { name: 'Transferencia', value: reportData.metodoPago.transfer, total: reportData.totalVentas },
        { name: 'Dividido', value: reportData.metodoPago.split, total: reportData.totalVentas }
      ]
      
      doc.setFont('arial', 'normal')
      doc.setFontSize(10)
      
      paymentMethods.forEach((method, idx) => {
        // Fondo alternado
        if (idx % 2 === 0) {
          doc.setFillColor(colors.gray)
          doc.rect(margin, yPos, tableWidth, 20, 'F')
        }
        
        doc.setTextColor(colors.text)
        
        const percentage = method.total > 0 ? ((method.value / method.total) * 100).toFixed(1) : 0
        
        doc.text(method.name, margin + 10, yPos + 14)
        doc.text(`$${method.value.toFixed(2)}`, margin + colWidths[0] + 10, yPos + 14, { align: 'right' })
        doc.text(`${percentage}%`, margin + colWidths[0] + colWidths[1] + 10, yPos + 14, { align: 'right' })
        
        yPos += 20
      })
      
      yPos += 15
      
      // ============================================
      // PRODUCTOS MÁS VENDIDOS - TABLA
      // ============================================
      doc.setFont('arial', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(colors.primary)
      doc.text('PRODUCTOS MÁS VENDIDOS', margin, yPos)
      
      yPos += 15
      
      // Header de la tabla
      const productColWidths = [40, tableWidth - 100, 60]
      
      doc.setFillColor(colors.primary)
      doc.rect(margin, yPos, tableWidth, 25, 'F')
      
      doc.setFont('arial', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(colors.white)
      doc.text('#', margin + 10, yPos + 16)
      doc.text('Producto', margin + productColWidths[0] + 10, yPos + 16)
      doc.text('Unidades', margin + productColWidths[0] + productColWidths[1] + 10, yPos + 16, { align: 'right' })
      
      yPos += 25
      
      // Datos de productos
      doc.setFont('arial', 'normal')
      doc.setFontSize(10)
      
      reportData.productosMasVendidos.forEach((prod, idx) => {
        // Fondo alternado
        if (idx % 2 === 0) {
          doc.setFillColor(colors.gray)
          doc.rect(margin, yPos, tableWidth, 20, 'F')
        }
        
        doc.setTextColor(colors.text)
        
        // Medalla para top 3
        let rank = `${idx + 1}`
        if (idx === 0) rank = '1'
        else if (idx === 1) rank = '2'
        else if (idx === 2) rank = '3'
        
        doc.text(rank, margin + 10, yPos + 14)
        doc.text(prod.name, margin + productColWidths[0] + 10, yPos + 14)
        doc.text(`${prod.quantity}u`, margin + productColWidths[0] + productColWidths[1] + 10, yPos + 14, { align: 'right' })
        
        yPos += 20
        
        // Limitar a 10 productos para que quepa en una página
        if (idx >= 9) return
      })
      
      yPos += 20
      
      // ============================================
      // FOOTER
      // ============================================
      // Línea superior gris
      doc.setDrawColor('#DDDDDD')
      doc.setLineWidth(1)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      
      yPos += 15
      
      doc.setFont('arial', 'italic')
      doc.setFontSize(9)
      doc.setTextColor('#999999')
      doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} • Documento confidencial`, pageWidth / 2, yPos, { align: 'center' })
      
      // Línea de firma
      yPos += 40
      doc.setDrawColor('#DDDDDD')
      doc.line(pageWidth - 200, yPos, pageWidth - margin, yPos)
      
      yPos += 20
      doc.setFont('arial', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(colors.text)
      doc.text('Gerencia / Administración', pageWidth - 100, yPos, { align: 'right' })
      
      // ============================================
      // GUARDAR PDF
      // ============================================
      const fileName = `reporte-ventas-${filterPeriod}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      toast.success('PDF profesional exportado correctamente')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Error al exportar PDF: ' + error.message)
    }
  }

  function exportToExcel() {
    try {
      toast.info('Generando Excel...')

      const periodoLabel = filterPeriod === 'week' ? 'Esta Semana' : 'Este Mes'
      const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      // Crear HTML table que Excel puede abrir
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .title { background-color: #1A3C5E; color: white; font-size: 22px; font-weight: bold; text-align: center; padding: 10px; }
    .subtitle { background-color: #D6E4F0; color: #666; font-size: 10px; font-style: italic; text-align: center; padding: 5px; }
    .section { color: #1A3C5E; font-size: 14px; font-weight: bold; margin-top: 15px; }
    .kpi-value { background-color: #D6E4F0; font-size: 16px; font-weight: bold; text-align: center; padding: 8px; border: 2px solid #1A3C5E; }
    .kpi-label { background-color: #D6E4F0; color: #666; font-size: 9px; text-align: center; padding: 5px; border: 2px solid #1A3C5E; }
    .header { background-color: #1A3C5E; color: white; font-weight: bold; padding: 8px; }
    .row-even { background-color: #F2F2F2; }
    .row-odd { background-color: white; }
    .total { background-color: #1A3C5E; color: white; font-weight: bold; }
    .footer { color: #999; font-size: 9px; font-style: italic; text-align: center; margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 8px; }
  </style>
</head>
<body>
  <br>
  <div class="title">REPORTE DE VENTAS DIARIO</div>
  <div class="subtitle">${periodoLabel} - ${fechaGeneracion}</div>
  
  <br>
  <div class="section">ESTADÍSTICAS PRINCIPALES</div>
  <table>
    <tr>
      <td class="kpi-value">$${reportData.totalVentas.toFixed(2)}</td>
      <td class="kpi-value">${reportData.totalPedidos}</td>
      <td class="kpi-value">$${reportData.ticketPromedio.toFixed(2)}</td>
      <td class="kpi-value">${reportData.mesasOcupadas}/${reportData.mesasTotales}</td>
    </tr>
    <tr>
      <td class="kpi-label">Ventas Totales</td>
      <td class="kpi-label">Total Pedidos</td>
      <td class="kpi-label">Ticket Promedio</td>
      <td class="kpi-label">Mesas Ocupadas</td>
    </tr>
  </table>
  
  <br>
  <div class="section">MÉTODOS DE PAGO</div>
  <table>
    <tr>
      <th class="header">Método de Pago</th>
      <th class="header">Monto</th>
      <th class="header">Participación</th>
    </tr>
    <tr class="row-odd">
      <td>Efectivo</td>
      <td>$${reportData.metodoPago.cash.toFixed(2)}</td>
      <td>${reportData.totalVentas > 0 ? ((reportData.metodoPago.cash / reportData.totalVentas) * 100).toFixed(1) : 0}%</td>
    </tr>
    <tr class="row-even">
      <td>Tarjeta</td>
      <td>$${reportData.metodoPago.card.toFixed(2)}</td>
      <td>${reportData.totalVentas > 0 ? ((reportData.metodoPago.card / reportData.totalVentas) * 100).toFixed(1) : 0}%</td>
    </tr>
    <tr class="row-odd">
      <td>Transferencia</td>
      <td>$${reportData.metodoPago.transfer.toFixed(2)}</td>
      <td>${reportData.totalVentas > 0 ? ((reportData.metodoPago.transfer / reportData.totalVentas) * 100).toFixed(1) : 0}%</td>
    </tr>
    <tr class="row-even">
      <td>Dividido</td>
      <td>$${reportData.metodoPago.split.toFixed(2)}</td>
      <td>${reportData.totalVentas > 0 ? ((reportData.metodoPago.split / reportData.totalVentas) * 100).toFixed(1) : 0}%</td>
    </tr>
    <tr class="total">
      <td>TOTAL</td>
      <td>$${reportData.totalVentas.toFixed(2)}</td>
      <td>100.0%</td>
    </tr>
  </table>
  
  <br>
  <div class="section">PRODUCTOS MÁS VENDIDOS</div>
  <table>
    <tr>
      <th class="header">#</th>
      <th class="header">Producto</th>
      <th class="header">Unidades</th>
      <th class="header">% del Total</th>
    </tr>
    ${reportData.productosMasVendidos.slice(0, 8).map((prod, idx) => `
    <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td style="font-weight: bold; color: #1A3C5E;">${idx + 1}</td>
      <td>${prod.name}</td>
      <td>${prod.quantity}u</td>
      <td>${reportData.productosMasVendidos.reduce((sum, p) => sum + p.quantity, 0) > 0 ? ((prod.quantity / reportData.productosMasVendidos.reduce((sum, p) => sum + p.quantity, 0)) * 100).toFixed(1) : 0}%</td>
    </tr>
    `).join('')}
  </table>
  
  <div class="footer">Generado el ${new Date().toLocaleDateString('es-ES')} • Documento confidencial • POS Restaurante</div>
</body>
</html>
      `
      
      // Crear blob y descargar como .xls (Excel puede abrir HTML)
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-ventas-${filterPeriod}-${new Date().toISOString().split('T')[0]}.xls`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Excel exportado correctamente')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Error al exportar Excel: ' + error.message)
    }
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Acceso Denegado</h3>
          <p>Solo los administradores pueden acceder a esta sección</p>
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
          <h2>📊 Reportes y Estadísticas</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Análisis de ventas, pedidos y reservas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
          >
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
          </select>
          <button className="btn btn-outline" onClick={exportToPDF}>
            <FileText size={18} style={{ marginRight: '0.5rem' }} />
            PDF
          </button>
          <button className="btn btn-outline" onClick={exportToExcel}>
            <FileSpreadsheet size={18} style={{ marginRight: '0.5rem' }} />
            Excel
          </button>
        </div>
      </div>

      {/* Estadísticas Principales */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">
            <DollarSign size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
            Ventas Totales
          </div>
          <div className="value">${reportData.totalVentas.toFixed(2)}</div>
          <div className="change positive">
            <TrendingUp size={16} /> {reportData.totalPedidos} pedidos
          </div>
        </div>

        <div className="stat-card">
          <div className="label">
            <ShoppingBag size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
            Ticket Promedio
          </div>
          <div className="value">${reportData.ticketPromedio.toFixed(2)}</div>
          <div className="change">Por pedido</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <Users size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
            Mesas Ocupadas
          </div>
          <div className="value">{reportData.mesasOcupadas}/{reportData.mesasTotales}</div>
          <div className="change">
            {reportData.mesasTotales > 0 
              ? `${Math.round((reportData.mesasOcupadas / reportData.mesasTotales) * 100)}% ocupación`
              : 'Sin mesas'}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">
            <Calendar size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
            Reservas
          </div>
          <div className="value">{Object.values(reportData.reservasPorEstado).reduce((a, b) => a + b, 0)}</div>
          <div className="change">
            {reportData.reservasPorEstado.confirmed} confirmadas
          </div>
        </div>
      </div>

      {/* Métodos de Pago */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>💳 Métodos de Pago</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🪙 Efectivo</span>
              <strong>${reportData.metodoPago.cash.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💳 Tarjeta</span>
              <strong>${reportData.metodoPago.card.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📱 Transferencia</span>
              <strong>${reportData.metodoPago.transfer.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔀 Dividido</span>
              <strong>${reportData.metodoPago.split.toFixed(2)}</strong>
            </div>
            <div style={{ 
              marginTop: '0.5rem', 
              paddingTop: '0.5rem', 
              borderTop: '2px solid var(--border)',
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '1.125rem'
            }}>
              <strong>Total</strong>
              <strong style={{ color: 'var(--primary)' }}>
                ${(reportData.metodoPago.cash + reportData.metodoPago.card + reportData.metodoPago.transfer + reportData.metodoPago.split).toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🏆 Productos Más Vendidos</h3>
          {reportData.productosMasVendidos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reportData.productosMasVendidos.map((prod, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{prod.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{prod.quantity} unidades</div>
                  </div>
                  {idx < 3 && (
                    <span style={{ fontSize: '1.25rem' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>No hay ventas en este período</p>
            </div>
          )}
        </div>
      </div>

      {/* Reservas por Estado */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>📅 Reservas por Estado</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--success-light)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Confirmadas</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{reportData.reservasPorEstado.confirmed}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--info-light)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Sentadas</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>{reportData.reservasPorEstado.seated}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--secondary)', background: 'var(--background)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Completadas</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{reportData.reservasPorEstado.completed}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--danger-light)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Canceladas</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{reportData.reservasPorEstado.cancelled}</div>
          </div>
        </div>
      </div>

      {/* Ventas por Día (si hay datos) */}
      {reportData.ventasPorDia.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📈 Ventas por Día</h3>
          
          {/* Vista compacta para mes completo */}
          {filterPeriod === 'month' ? (
            /* Grid compacto de 30 días (6 filas x 5 columnas) */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.75rem'
            }}>
              {reportData.ventasPorDia.map((dia, idx) => (
                <div 
                  key={idx} 
                  style={{
                    padding: '0.75rem',
                    background: filterPeriod === 'month' ? 'var(--background)' : 'transparent',
                    borderRadius: '6px',
                    textAlign: 'center',
                    border: dia.value > 0 ? '1px solid var(--border)' : '1px dashed var(--border)'
                  }}
                >
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                    {dia.label.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div style={{
                    height: '60px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    marginBottom: '0.375rem'
                  }}>
                    <div style={{
                      width: '24px',
                      height: `${Math.max((dia.value / Math.max(...reportData.ventasPorDia.map(d => d.value))) * 50, 4)}px`,
                      background: dia.value > 0 ? 'var(--primary)' : 'var(--border)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s'
                    }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: dia.value > 0 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    ${dia.value.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista normal con barras horizontales para hoy/semana */
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '200px', overflowX: 'auto' }}>
              {reportData.ventasPorDia.map((dia, idx) => {
                const maxValue = Math.max(...reportData.ventasPorDia.map(d => d.value))
                const height = maxValue > 0 ? (dia.value / maxValue) * 160 : 0
                return (
                  <div key={idx} style={{ flex: 1, minWidth: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%',
                      height: `${height}px`,
                      background: 'var(--primary)',
                      borderRadius: '4px 4px 0 0',
                      minHeight: dia.value > 0 ? '4px' : '0'
                    }}></div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                      {dia.label}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      ${dia.value.toFixed(0)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Reportes
