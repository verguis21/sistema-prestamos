import { useEffect, useRef, useState, type FormEvent } from 'react'

type Trabajador = { agencia: { nombre: string } }
type TipoDocumento = 'DNI' | 'RUC10' | 'RUC20'
type DocumentoOperacion = { tipoDocumento: TipoDocumento; numeroDocumento: string; empresaId?: string }
type Cliente = { id: string; nombres: string; apellidos: string; numeroDocumento: string; tipoDocumento: 'DNI' | 'RUC10'; documentoOperacion?: DocumentoOperacion; empresaOperacion?: { id: string; ruc: string; razonSocial: string } }
type Fila = { numeroCuota: number; fechaVencimiento: string; capital: string; interes: string; montoCuota: string; saldoRestante: string; estado?: 'PENDIENTE' | 'PAGADA'; estadoVisible?: 'PENDIENTE' | 'VENCIDA' | 'PAGADA' }
type Cronograma = { cuotaFija: string; montoTotal: string; interesTotal: string; tasaPeriodoPorcentaje: number; avisoRedondeo: string | null; cuotas: Fila[] }
type Preview = { comprometido: string; disponible: string; cronograma: Cronograma; documentoOperacion: DocumentoOperacion }
type EstadoPrestamoVisible = 'VIGENTE' | 'MOROSO' | 'EXTRAJUDICIAL' | 'LIQUIDADO'
type PrestamoLista = { estadoCalculado: EstadoPrestamoVisible; diasMora: number; cuotasVencidas: number; id: string; fechaPrestamo: string; monto: string; plazoMeses: number; cuotaFija: string; estado: string; tipoDocumentoOperacion: TipoDocumento | null; numeroDocumentoOperacion: string | null; cliente: { nombres: string; apellidos: string; numeroDocumento: string; tipoDocumento: TipoDocumento }; empresa?: { razonSocial: string; ruc: string } | null; agencia: { nombre: string } }
type Detalle = { estadoCalculado: EstadoPrestamoVisible; diasMora: number; cuotasVencidas: number; importeCuotasVencidasCentimos: number; id: string; tipoDocumentoOperacion: TipoDocumento | null; numeroDocumentoOperacion: string | null; monto: string; fechaPrestamo: string; plazoMeses: number; cuotaFija: string; interesTotal: string; montoTotal: string; baseDias: number; diasPeriodo: number; cliente: Cliente; empresa?: { razonSocial: string; ruc: string } | null; agencia: { nombre: string }; cuotas: Fila[] }
type EstadoFiltro = 'TODOS' | EstadoPrestamoVisible
type PaginaPrestamos = { prestamos: PrestamoLista[]; total: number; pagina: number; porPagina: number; totalPaginas: number }

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const moneda = (v: string) => `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
const FACTORES_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
function generarRuc10(dni: string) {
  const base = `10${dni}`
  const suma = [...base].reduce((total, cifra, i) => total + Number(cifra) * FACTORES_RUC[i], 0)
  return `${base}${(11 - (suma % 11)) % 10}`
}
function documentosDisponibles(cliente: Cliente): DocumentoOperacion[] {
  const dni = cliente.tipoDocumento === 'DNI' ? cliente.numeroDocumento : cliente.numeroDocumento.slice(2, 10)
  return [
    { tipoDocumento: 'DNI', numeroDocumento: dni },
    { tipoDocumento: 'RUC10', numeroDocumento: generarRuc10(dni) },
    ...(cliente.empresaOperacion ? [{ tipoDocumento: 'RUC20' as const, numeroDocumento: cliente.empresaOperacion.ruc, empresaId: cliente.empresaOperacion.id }] : []),
  ]
}
function elegirDocumento(cliente: Cliente, consultado: string): DocumentoOperacion {
  return documentosDisponibles(cliente).find(d => d.numeroDocumento === consultado.trim())
    ?? { tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }
}
const rotuloDocumento = (d: DocumentoOperacion) => `${d.tipoDocumento === 'RUC10' ? 'RUC 10' : d.tipoDocumento === 'RUC20' ? 'RUC 20' : 'DNI'} ${d.numeroDocumento}`
// El cliente conserva su documento principal, pero el resultado de búsqueda
// debe mostrar claramente el DNI/RUC que el asesor escribió para esta operación.
function rotuloHallazgo(cliente: Cliente, busqueda: string): string {
  const consultado = busqueda.trim()
  const documentos = documentosDisponibles(cliente)
  const encontrado = documentos.find(d => d.numeroDocumento === consultado)
  return encontrado ? `Encontrado con ${rotuloDocumento(encontrado)} · ficha principal: ${cliente.tipoDocumento === 'RUC10' ? 'RUC 10' : 'DNI'}`
    : `Ficha principal: ${cliente.tipoDocumento === 'RUC10' ? 'RUC 10' : 'DNI'} ${cliente.numeroDocumento}`
}
// Los estados de esta pantalla se derivan de las fechas y de pagos REGISTRADOS.
// No crea pagos ni aplica mora; es una lectura del cronograma actual.
function estadoVisible(cuota: Fila): 'Pagada' | 'Vencida' | 'Pendiente' {
  if (cuota.estadoVisible === 'PAGADA' || cuota.estado === 'PAGADA') return 'Pagada'
  if (cuota.estadoVisible === 'VENCIDA') return 'Vencida'
  return cuota.fechaVencimiento.slice(0, 10) < hoy ? 'Vencida' : 'Pendiente'
}


export default function PrestamosPanel({ token, trabajador, clienteInicial = null }: { token: string; trabajador: Trabajador; clienteInicial?: Cliente | null }) {
  const [textoCliente, setTextoCliente] = useState(clienteInicial ? `${clienteInicial.apellidos}, ${clienteInicial.nombres} · ${rotuloDocumento(clienteInicial.documentoOperacion ?? elegirDocumento(clienteInicial, clienteInicial.numeroDocumento))}` : '')
  const [coincidencias, setCoincidencias] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(clienteInicial)
  const [documentoOperacion, setDocumentoOperacion] = useState<DocumentoOperacion | null>(clienteInicial ? (clienteInicial.documentoOperacion ?? elegirDocumento(clienteInicial, clienteInicial.numeroDocumento)) : null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [errorCliente, setErrorCliente] = useState('')
  const [prestamos, setPrestamos] = useState<PrestamoLista[]>([])
  const [clienteId, setClienteId] = useState(clienteInicial?.id ?? '')
  const [monto, setMonto] = useState('1000')
  const [plazoMeses, setPlazoMeses] = useState(12)
  const [fechaPrestamo, setFechaPrestamo] = useState(hoy)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [detalle, setDetalle] = useState<Detalle | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [error, setError] = useState('')
  const [errorLista, setErrorLista] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(false)
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('TODOS')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [estadoAplicado, setEstadoAplicado] = useState<EstadoFiltro>('TODOS')
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [recargar, setRecargar] = useState(0)
  const previewRef = useRef<HTMLElement | null>(null)
  const cerrarRef = useRef<HTMLButtonElement | null>(null)
  const scrollAnteriorRef = useRef(0)

  async function peticion<T>(url: string, options: RequestInit = {}): Promise<T> {
    const limiteMs = options.method === 'POST' ? 30000 : 15000
    const reloj = AbortSignal.timeout(limiteMs)
    const signal = options.signal ? AbortSignal.any([options.signal, reloj]) : reloj
    let respuesta: Response
    try {
      respuesta = await fetch(`${BASE}${url}`, {
        ...options,
        signal,
        headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
        cache: 'no-store',
      })
    } catch (e) {
      if (reloj.aborted) throw new Error('La operación tardó demasiado. Comprueba tu conexión con el servidor.')
      throw e
    }
    let data: T & { message?: string }
    try { data = await respuesta.json() }
    catch { throw new Error('El servidor respondió con datos que no se pudieron interpretar.') }
    if (!respuesta.ok) throw new Error(data.message ?? 'No fue posible completar la operación.')
    return data
  }

  useEffect(() => {
    const busqueda = textoCliente.trim()
    if (clienteSeleccionado || busqueda.length < 2) {
      setCoincidencias([])
      setBuscandoCliente(false)
      return
    }
    const abort = new AbortController()
    const timer = window.setTimeout(async () => {
      setBuscandoCliente(true)
      setErrorCliente('')
      try {
        const datos = await peticion<{ clientes: Cliente[] }>(
          `/api/clientes/buscar?q=${encodeURIComponent(busqueda)}`,
          { signal: abort.signal },
        )
        if (!abort.signal.aborted) setCoincidencias(datos.clientes)
      } catch (e) {
        if (!abort.signal.aborted) {
          setCoincidencias([])
          setErrorCliente(e instanceof Error ? e.message : 'No se pudo buscar el cliente.')
        }
      } finally {
        if (!abort.signal.aborted) setBuscandoCliente(false)
      }
    }, 350)
    return () => { window.clearTimeout(timer); abort.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, textoCliente, clienteSeleccionado])

  function escribirBusquedaCliente(texto: string) {
    setTextoCliente(texto)
    setClienteId('')
    setClienteSeleccionado(null)
    setDocumentoOperacion(null)
    setCoincidencias([])
    setErrorCliente('')
    invalidar()
  }

  function seleccionarCliente(cliente: Cliente) {
    setClienteId(cliente.id)
    setClienteSeleccionado(cliente)
    const seleccionado = elegirDocumento(cliente, textoCliente)
    setDocumentoOperacion(seleccionado)
    setTextoCliente(`${cliente.apellidos}, ${cliente.nombres} · ${rotuloDocumento(seleccionado)}`)
    setCoincidencias([])
    setErrorCliente('')
    invalidar()
  }

  useEffect(() => {
    let cancelado = false
    async function cargarPrestamos() {
      setCargandoLista(true); setErrorLista('')
      try {
        const params = new URLSearchParams({ pagina: String(pagina), buscar: busquedaAplicada, estado: estadoAplicado })
        const resultado = await peticion<PaginaPrestamos>(`/api/prestamos?${params.toString()}`)
        if (cancelado) return
        setPrestamos(resultado.prestamos)
        setTotal(resultado.total)
        setTotalPaginas(resultado.totalPaginas)
      } catch (e) {
        if (!cancelado) setErrorLista(e instanceof Error ? e.message : 'No se pudo cargar la lista.')
      } finally {
        if (!cancelado) setCargandoLista(false)
      }
    }
    void cargarPrestamos()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pagina, busquedaAplicada, estadoAplicado, recargar])

  useEffect(() => {
    if (preview) previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [preview])

  // El cronograma ocupa una vista dentro del módulo, no una ventana modal.
  // Se desplaza la página principal y se conserva la posición al volver.
  useEffect(() => {
    if (!modalAbierto) return
    window.scrollTo(0, 0)
    cerrarRef.current?.focus({ preventScroll: true })
    function cerrarConEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalAbierto(false)
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [modalAbierto])

  function mostrarCronograma(prestamo: Detalle) {
    scrollAnteriorRef.current = window.scrollY
    setDetalle(prestamo)
    setModalAbierto(true)
  }

  function volverAPrestamos() {
    setModalAbierto(false)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.scrollTo(0, scrollAnteriorRef.current))
    })
  }

  function invalidar() { setPreview(null); setError(''); setMensaje('') }
  const formulario = { clienteId, monto: monto.trim(), plazoMeses, fechaPrestamo, tipoDocumentoOperacion: documentoOperacion?.tipoDocumento, numeroDocumentoOperacion: documentoOperacion?.numeroDocumento, ...(documentoOperacion?.empresaId ? { empresaId: documentoOperacion.empresaId } : {}) }

  async function simular(e: FormEvent) {
    e.preventDefault(); setOcupado(true); setError(''); setMensaje(''); setPreview(null)
    try {
      const resultado = await peticion<Preview>('/api/prestamos/simular', { method: 'POST', body: JSON.stringify(formulario) })
      setPreview(resultado)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo calcular el cronograma.') }
    finally { setOcupado(false) }
  }

  async function confirmar() {
    if (!preview || ocupado || !window.confirm('¿Confirmas el registro del préstamo y de todas sus cuotas?')) return
    setOcupado(true); setError(''); setMensaje('')
    let guardado: { id: string }
    try {
      guardado = await peticion<{ id: string }>('/api/prestamos', { method: 'POST', body: JSON.stringify(formulario) })
    } catch (e) {
      // Si la red falla al guardar, el servidor podría haber recibido el POST.
      // Nunca hacer un reintento automático que podría duplicar el préstamo.
      const texto = e instanceof Error ? e.message : 'No fue posible confirmar el registro.'
      setError(texto.includes('tardó demasiado') || e instanceof TypeError
        ? 'No se pudo confirmar si el préstamo quedó guardado. Actualiza el listado y revisa los préstamos de este cliente ANTES de intentar registrarlo otra vez.'
        : texto)
      setRecargar(n => n + 1)
      setOcupado(false)
      return
    }

    // El POST sí confirmó el registro: limpiar el formulario INMEDIATAMENTE.
    // No supeditar el éxito del guardado a que una segunda consulta abra el cronograma.
    setClienteId('')
    setClienteSeleccionado(null)
    setDocumentoOperacion(null)
    setTextoCliente('')
    setCoincidencias([])
    setErrorCliente('')
    setMonto('')
    setPlazoMeses(12)
    setFechaPrestamo(hoy)
    setPreview(null)
    setMensaje('Préstamo guardado correctamente. El formulario quedó listo para una nueva atención.')
    setPagina(1); setBusquedaAplicada(''); setEstadoAplicado('TODOS')
    setTextoBusqueda(''); setFiltroEstado('TODOS'); setRecargar(n => n + 1)

    try {
      const resultado = await peticion<{ prestamo: Detalle }>(`/api/prestamos/${guardado.id}`)
      mostrarCronograma(resultado.prestamo)
    } catch {
      // El préstamo YA está guardado: no mostrar un error falso de guardado.
      setMensaje('Préstamo guardado. No se pudo abrir el cronograma automáticamente; búscalo en el listado con «Ver cronograma».')
    } finally {
      setOcupado(false)
    }
  }

  async function verDetalle(id: string) {
    setErrorLista(''); setOcupado(true)
    try {
      const resultado = await peticion<{ prestamo: Detalle }>(`/api/prestamos/${id}`)
      mostrarCronograma(resultado.prestamo)
    } catch (e) { setErrorLista(e instanceof Error ? e.message : 'No se pudo abrir el cronograma.') }
    finally { setOcupado(false) }
  }

  function buscarPrestamos(e: FormEvent) {
    e.preventDefault()
    setPagina(1)
    setBusquedaAplicada(textoBusqueda.trim())
    setEstadoAplicado(filtroEstado)
    setRecargar(n => n + 1)
  }

  const inicio = total ? (pagina - 1) * 10 + 1 : 0
  const fin = Math.min(pagina * 10, total)

  // Detalle del cronograma como pantalla completa. No bloqueamos body ni
  // creamos una segunda barra de desplazamiento para decenas de cuotas.
  if (modalAbierto && detalle) {
    return <div className="clientes-view prestamos-view prestamos-detail-view">
      <article className="schedule-page" aria-label="Cronograma registrado">
        <div className="schedule-page-toolbar no-print">
          <button type="button" className="schedule-back" ref={cerrarRef} onClick={volverAPrestamos}>
            <span aria-hidden="true">←</span> Volver a préstamos
          </button>
          <button type="button" className="schedule-print" onClick={() => window.print()}>
            Imprimir cronograma
          </button>
        </div>
        <header className="schedule-page-heading">
          <div>
            <span className="eyebrow">PRÉSTAMO REGISTRADO · {detalle.agencia.nombre}</span>
            <h1 id="schedule-title">Cronograma de pagos</h1>
            <p className="schedule-page-person">
              {detalle.empresa ? `${detalle.empresa.razonSocial} · Representante: ` : ''}
              {detalle.cliente.apellidos}, {detalle.cliente.nombres}
            </p>
            <p className="muted schedule-page-documento">
              {detalle.tipoDocumentoOperacion ?? detalle.cliente.tipoDocumento} {detalle.numeroDocumentoOperacion ?? detalle.cliente.numeroDocumento}
            </p>
          </div>
          <div className="schedule-page-status">
            <span className={`cuota-estado estado-${detalle.estadoCalculado.toLowerCase()}`}>
              {detalle.estadoCalculado === 'MOROSO' ? 'Con cuotas vencidas' : detalle.estadoCalculado}
            </span>
            <span>{detalle.cuotasVencidas} cuotas vencidas</span>
          </div>
        </header>
        <div className="schedule-summary schedule-page-summary">
          <div><small>Capital</small><strong>{moneda(detalle.monto)}</strong></div>
          <div><small>Plazo</small><strong>{detalle.plazoMeses} cuotas</strong></div>
          <div><small>Intereses programados</small><strong>{moneda(detalle.interesTotal)}</strong></div>
          <div><small>Total programado</small><strong>{moneda(detalle.montoTotal)}</strong></div>
        </div>
        <section className="schedule-page-content" aria-labelledby="schedule-rows-title">
          <div className="schedule-page-table-heading">
            <div>
              <h2 id="schedule-rows-title">Detalle de cuotas</h2>
              <p className="muted">{detalle.cuotas.length} cuotas · vencimientos cada 30 días</p>
            </div>
            <span className="schedule-page-hint no-print">Desliza hacia abajo para ver las demás cuotas</span>
          </div>
          <div className="schedule-scroll schedule-page-table" role="region" aria-label="Tabla de cuotas" tabIndex={0}>
            <table className="schedule-table">
              <thead><tr><th>N.º</th><th>Vencimiento</th><th>Capital</th><th>Interés</th><th>Cuota</th><th>Saldo</th><th>Estado</th></tr></thead>
              <tbody>{detalle.cuotas.map(f => <tr key={f.numeroCuota}>
                <td>{f.numeroCuota}</td><td>{f.fechaVencimiento.slice(0, 10)}</td>
                <td>{moneda(f.capital)}</td><td>{moneda(f.interes)}</td>
                <td><strong>{moneda(f.montoCuota)}</strong></td><td>{moneda(f.saldoRestante)}</td>
                <td><span className={`cuota-estado estado-${estadoVisible(f).toLowerCase()}`}>{estadoVisible(f)}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <p className="schedule-note schedule-page-note">TEA 30 % · Tasa efectiva cada 30 días: 2.210445 % · Sistema francés, base 360 días. TCEA no calculada: faltan definir costos adicionales. Sin mora por atraso.</p>
        <div className="schedule-page-bottom no-print">
          <button type="button" className="schedule-back" onClick={volverAPrestamos}>← Volver a préstamos</button>
        </div>
      </article>
    </div>
  }

  return <div className="clientes-view prestamos-view">
    <div className="eyebrow">MÓDULO DE PRÉSTAMOS</div>
    <h1>Gestión de préstamos</h1>
    <p className="muted">Registra créditos y consulta cronogramas de {trabajador.agencia.nombre}.</p>
    <div className="clients-grid">
      <section className="client-card">
        <h2>Nuevo préstamo</h2>
        <p className="muted">Revisa condiciones y cuotas antes de guardar.</p>
        <form className="document-form" onSubmit={simular}>
          <label htmlFor="loanClienteBusqueda">Cliente registrado</label>
          <div className="loan-client-search">
            <input
              id="loanClienteBusqueda"
              type="search"
              value={textoCliente}
              onChange={e => escribirBusquedaCliente(e.target.value)}
              placeholder="DNI, RUC 10 o RUC 20"
              autoComplete="off"
              maxLength={80}
              aria-describedby="loanClienteAyuda"
            />
            <p id="loanClienteAyuda" className="loan-client-hint">Documento completo: búsqueda global. Nombre: clientes de tu agencia.</p>
            {buscandoCliente && !clienteSeleccionado && <p className="loan-client-feedback" role="status">Buscando en la base de datos...</p>}
            {errorCliente && <p className="form-error notice" role="alert">{errorCliente}</p>}
            {!clienteSeleccionado && textoCliente.trim().length >= 2 && !buscandoCliente && !errorCliente && coincidencias.length === 0 &&
              <p className="loan-client-feedback" role="status">Sin coincidencias. Si es nuevo, regístralo primero en Clientes.</p>}
            {!clienteSeleccionado && coincidencias.length > 0 && <div className="loan-client-results" aria-label="Clientes encontrados">
              {coincidencias.map(c => <button className="loan-client-option" type="button" key={c.id} onClick={() => seleccionarCliente(c)}>
                <strong>{c.apellidos}, {c.nombres}</strong>
                <small>{rotuloHallazgo(c, textoCliente)}</small>
              </button>)}
            </div>}
            {clienteSeleccionado && <div className="loan-client-selected" role="status">
              <span><strong>Cliente seleccionado</strong><small>{clienteSeleccionado.apellidos}, {clienteSeleccionado.nombres}</small></span>
              <button type="button" className="refresh-list" onClick={() => escribirBusquedaCliente('')}>Cambiar</button>
            </div>}
            {clienteSeleccionado && documentoOperacion && <>
              <label htmlFor="loanDocumentoOperacion">Documento utilizado para este préstamo</label>
              <select id="loanDocumentoOperacion" value={`${documentoOperacion.tipoDocumento}|${documentoOperacion.numeroDocumento}`}
                onChange={e => {
                  const doc = documentosDisponibles(clienteSeleccionado).find(d => `${d.tipoDocumento}|${d.numeroDocumento}` === e.target.value)
                  if (doc) { setDocumentoOperacion(doc); invalidar() }
                }}>
                {documentosDisponibles(clienteSeleccionado).map(d => <option key={d.tipoDocumento} value={`${d.tipoDocumento}|${d.numeroDocumento}`}>{rotuloDocumento(d)}</option>)}
              </select>
              {clienteSeleccionado.empresaOperacion && <p className="empresa-context">Empresa: <strong>{clienteSeleccionado.empresaOperacion.razonSocial}</strong> · RUC {clienteSeleccionado.empresaOperacion.ruc}</p>}
              <p className="loan-client-hint">Límite global S/ 10 000 por representante o persona natural. Si usa RUC 20, la empresa queda asociada a la operación.</p>
            </>}
          </div>
          <label htmlFor="loanMonto">Capital solicitado (S/)</label>
          <input id="loanMonto" type="number" min="1" max="10000" step="0.01" value={monto} onChange={e => { setMonto(e.target.value); invalidar() }} required />
          <label htmlFor="loanPlazo">Plazo (meses, de 1 a 60)</label>
          <input id="loanPlazo" type="number" min="1" max="60" step="1" value={plazoMeses} onChange={e => { setPlazoMeses(Number(e.target.value)); invalidar() }} required />
          <label htmlFor="loanFecha">Fecha de préstamo</label>
          <input id="loanFecha" type="date" value={fechaPrestamo} onChange={e => { setFechaPrestamo(e.target.value); invalidar() }} required />
          <button className="submit" type="submit" disabled={ocupado || !clienteId || !documentoOperacion}>{ocupado ? 'Procesando...' : 'Calcular cronograma'} <span aria-hidden="true">→</span></button>
        </form>
        {preview && <div className="person-result">
          <span className="status-pill">Vista previa — no registrada</span>
          <div className="loan-metrics">
            <div><small>Capital comprometido</small><strong>{moneda(preview.comprometido)}</strong></div>
            <div><small>Disponible antes de este préstamo</small><strong>{moneda(preview.disponible)}</strong></div>
            <div><small>Cuota periódica base</small><strong>{moneda(preview.cronograma.cuotaFija)}</strong></div>
            <div><small>Total a pagar</small><strong>{moneda(preview.cronograma.montoTotal)}</strong></div>
          </div>
          <p className="muted">Préstamo solicitado con {rotuloDocumento(preview.documentoOperacion)}. Intereses totales: {moneda(preview.cronograma.interesTotal)}.</p>
          {preview.cronograma.avisoRedondeo && <p className="identity-warning">{preview.cronograma.avisoRedondeo}</p>}
          <button type="button" className="submit" onClick={() => void confirmar()} disabled={ocupado}>Confirmar y guardar préstamo ✓</button>
        </div>}
        {error && <div className="form-error notice" role="alert">{error}</div>}
        {mensaje && <div className="success-notice" role="status">{mensaje}</div>}
      </section>
      <section className="client-card loan-list-card">
        <div className="client-card-header"><div><h2>Préstamos registrados</h2><p className="muted">Busca y revisa el estado de los préstamos de esta agencia.</p></div><button type="button" className="refresh-list" onClick={() => setRecargar(n => n + 1)} disabled={cargandoLista}>Actualizar</button></div>
        <form className="loan-search-form" onSubmit={buscarPrestamos}>
          <label htmlFor="buscarPrestamo">Buscar préstamo</label>
          <input id="buscarPrestamo" type="search" maxLength={100} placeholder="Nombre, apellido o DNI/RUC" value={textoBusqueda} onChange={e => setTextoBusqueda(e.target.value)} />
          <label htmlFor="estadoPrestamo">Estado</label>
          <select id="estadoPrestamo" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as EstadoFiltro)}>
            <option value="TODOS">Todos</option><option value="VIGENTE">Vigentes</option><option value="MOROSO">Con atraso</option><option value="EXTRAJUDICIAL">Extrajudiciales</option><option value="LIQUIDADO">Liquidados</option>
          </select>
          <button type="submit" className="refresh-list" disabled={cargandoLista}>Buscar</button>
        </form>
        {errorLista && <div className="form-error notice" role="alert">{errorLista}</div>}
        {cargandoLista ? <p className="muted">Cargando préstamos...</p> : prestamos.length ?
          <div className="client-list">{prestamos.map(p => <div key={p.id} className="client-row loan-row">
            <div><strong>{p.empresa ? `${p.empresa.razonSocial} · ` : ''}{p.cliente.apellidos}, {p.cliente.nombres}</strong><small>{p.tipoDocumentoOperacion ?? p.cliente.tipoDocumento} {p.numeroDocumentoOperacion ?? p.cliente.numeroDocumento} · {moneda(p.monto)} · {p.plazoMeses} cuotas</small><small>{p.agencia.nombre} · <span className={`cuota-estado estado-${p.estadoCalculado.toLowerCase()}`}>{({VIGENTE:'Al día',MOROSO:'Con cuotas vencidas',EXTRAJUDICIAL:'Extrajudicial',LIQUIDADO:'Liquidado'} as const)[p.estadoCalculado]}</span>{p.cuotasVencidas > 0 ? ` · ${p.cuotasVencidas} cuotas vencidas` : ''}</small></div>
            <button type="button" className="refresh-list" disabled={ocupado} onClick={() => void verDetalle(p.id)}>Ver cronograma</button>
          </div>)}</div> : <p className="empty-list">No se encontraron préstamos con esos filtros.</p>}
        <div className="loan-pagination" aria-label="Paginación de préstamos">
          <span>Mostrando {inicio}–{fin} de {total} préstamos</span>
          <div>
            <button className="refresh-list" disabled={cargandoLista || pagina === 1} type="button" onClick={() => setPagina(p => p - 1)}>Anterior</button>
            <span aria-live="polite">Página {pagina} de {totalPaginas}</span>
            <button className="refresh-list" disabled={cargandoLista || pagina >= totalPaginas} type="button" onClick={() => setPagina(p => p + 1)}>Siguiente</button>
          </div>
        </div>
      </section>
    </div>
    {preview && <section ref={previewRef} className="client-card schedule-section" aria-label="Vista previa del cronograma">
      <div className="client-card-header"><div><h2>Vista previa del cronograma</h2><p className="muted">No se almacenará hasta confirmar el préstamo.</p></div></div>
      <div className="schedule-scroll"><table className="schedule-table"><thead><tr><th>N.º</th><th>Vencimiento</th><th>Capital</th><th>Interés</th><th>Cuota</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>{preview.cronograma.cuotas.map(f => <tr key={f.numeroCuota}><td>{f.numeroCuota}</td><td>{f.fechaVencimiento.slice(0, 10)}</td><td>{moneda(f.capital)}</td><td>{moneda(f.interes)}</td><td><strong>{moneda(f.montoCuota)}</strong></td><td>{moneda(f.saldoRestante)}</td><td><span className={`cuota-estado estado-${estadoVisible(f).toLowerCase()}`}>{estadoVisible(f)}</span></td></tr>)}</tbody></table></div>
    </section>}


  </div>
}
