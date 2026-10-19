import marcaCreditos from './assets/marca-creditos.svg'
import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import PrestamosPanel from './PrestamosPanel'
import GerenciaPanel from './GerenciaPanel'
import EmpresaPanel from './EmpresaPanel'
import ilustracionCreditos from './assets/ilustracion-creditos.svg'

type Trabajador = {
  id: string
  nombres: string
  apellidos: string
  correo: string
  rol: 'ASESOR' | 'GERENTE'
  agencia: { id: string; nombre: string; ciudad: string }
}

type LoginResponse = {
  token: string
  trabajador: Trabajador
}

type TipoDocumento = 'DNI' | 'RUC10'
type TipoConsulta = TipoDocumento | 'RUC20'
type Cliente = {
  id: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidos: string
  proveedorIdentidad?: string | null
  identidadVerificada?: boolean
  creadoEn?: string
  empresaOperacion?: { id: string; ruc: string; razonSocial: string }
  documentoOperacion?: { tipoDocumento: TipoConsulta; numeroDocumento: string; empresaId?: string }
  estadoCliente?: 'VIGENTE' | 'MOROSO' | 'EXTRAJUDICIAL' | 'SIN_DEUDA' | 'SIN_PRESTAMOS'
}
type Consulta = Pick<Cliente, 'tipoDocumento'|'numeroDocumento'|'nombres'|'apellidos'> & {
  proveedor: string
  estadoRuc?: string
  verificacionOficial: false
  requiereRevisionPresencial: true
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// Cada operación tiene un máximo de espera para no dejar bloqueado al asesor.
// Abortamos la petición del navegador, pero no asumimos que un POST no haya llegado al servidor.
async function fetchConTiempo(url: string, options: RequestInit = {}): Promise<Response> {
  const limiteMs = options.method === 'POST' ? 30000 : 15000
  const reloj = AbortSignal.timeout(limiteMs)
  const signal = options.signal ? AbortSignal.any([options.signal, reloj]) : reloj
  try {
    return await fetch(url, { ...options, signal })
  } catch (e) {
    if (reloj.aborted) throw new Error('La consulta tardó demasiado. Revisa tu conexión e inténtalo de nuevo.')
    throw e
  }
}

type NavigationIcon = 'inicio' | 'clientes' | 'prestamos' | 'gerencia'

function NavigationSymbol({ name }: { name: NavigationIcon }) {
  const comun = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return <svg className="nav-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...comun}>
    {name === 'inicio' ? <><path d="m3.5 10 8.5-7 8.5 7"/><path d="M6 9.5V21h12V9.5M10 21v-7h4v7"/></> : null}
    {name === 'clientes' ? <><circle cx="9" cy="8" r="3"/><path d="M2.8 20c0-4.2 2.5-6.5 6.2-6.5s6.2 2.3 6.2 6.5"/><path d="M17 7h4M17 11h4"/></> : null}
    {name === 'prestamos' ? <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></> : null}
    {name === 'gerencia' ? <><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></> : null}
  </svg>
}

function App() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null)
  const [token, setToken] = useState('')
  const [vista, setVista] = useState<'inicio' | 'clientes' | 'prestamos' | 'gerencia'>('inicio')
  const [clienteParaPrestamo, setClienteParaPrestamo] = useState<Cliente | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function ingresar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setCargando(true)

    try {
      const respuesta = await fetchConTiempo(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.trim(), password }),
      })
      const data: LoginResponse & { message?: string } = await respuesta.json()
      if (!respuesta.ok || !data.token) {
        throw new Error(data.message ?? 'No fue posible iniciar sesión.')
      }

      // Comprobar que una ruta protegida reconoce la sesión real.
      const perfil = await fetchConTiempo(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      })
      if (!perfil.ok) throw new Error('No fue posible validar la sesión.')
      const resultado: { trabajador: Trabajador } = await perfil.json()
      setTrabajador(resultado.trabajador)
      setToken(data.token)
      setVista(resultado.trabajador.rol === 'GERENTE' ? 'gerencia' : 'inicio')
      setPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con la API.')
    } finally {
      setCargando(false)
    }
  }

  if (trabajador) {
    const esGerente = trabajador.rol === 'GERENTE'
    return (
      <main className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark"><img src={marcaCreditos} alt="" aria-hidden="true" /></span><span>Gestión de<br />Créditos</span></div>
          <div className="sidebar-label">{esGerente ? 'PANEL DE GERENCIA' : 'ASESOR DE AGENCIA'}</div>
          <div className="sidebar-user"><span>{trabajador.nombres} {trabajador.apellidos}</span><small>{esGerente ? 'Gerencia general' : trabajador.agencia.nombre}</small></div>
          <nav className="side-nav" aria-label="Navegación principal">
            {esGerente ? (
              <button type="button" className="active" onClick={() => setVista('gerencia')}><NavigationSymbol name="gerencia" /> Gerencia</button>
            ) : <>
              <button type="button" className={vista === 'inicio' ? 'active' : ''} onClick={() => setVista('inicio')}><NavigationSymbol name="inicio" /> Inicio</button>
              <button type="button" className={vista === 'clientes' ? 'active' : ''} onClick={() => setVista('clientes')}><NavigationSymbol name="clientes" /> Clientes</button>
              <button type="button" className={vista === 'prestamos' ? 'active' : ''} onClick={() => { setClienteParaPrestamo(null); setVista('prestamos') }}><NavigationSymbol name="prestamos" /> Préstamos</button>
            </>}
          </nav>
          <button className="logout" onClick={() => { setTrabajador(null); setToken(''); setClienteParaPrestamo(null); setVista('inicio'); setCorreo(''); setPassword(''); setError('') }}>Salir de la cuenta</button>
        </aside>
        <section className="dashboard view-enter">
          {esGerente ? <GerenciaPanel token={token} /> : vista === 'clientes' ? <ClientesPanel token={token} trabajador={trabajador} onNuevoPrestamo={cliente => { setClienteParaPrestamo(cliente); setVista('prestamos') }} /> : vista === 'prestamos' ? <PrestamosPanel token={token} trabajador={trabajador} clienteInicial={clienteParaPrestamo} /> : <>
          <div className="home-view">
            <section className="home-hero" aria-labelledby="home-title">
              <div className="home-hero-copy">
                <div className="eyebrow">ÁREA DEL ASESOR</div>
                <h1 id="home-title">Tu espacio de trabajo</h1>
                <p className="muted page-lead">Todo lo necesario para atender a tus clientes.</p>
                <span className="home-agency-indicator"><span className="home-status-dot" aria-hidden="true" />{trabajador.agencia.nombre}</span>
              </div>
              <div className="home-illustration" aria-hidden="true">
                <img src={ilustracionCreditos} alt="" loading="eager" />
              </div>
            </section>
            <div className="home-work-heading">
              <div>
                <span className="eyebrow">OPERACIONES</span>
                <h2>¿Qué deseas hacer?</h2>
              </div>
            </div>
            <div className="action-grid home-action-grid">
              <button type="button" className="action-tile" onClick={() => setVista('clientes')}>
                <span className="action-symbol" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8 10.5h5M10.5 8v5"/></svg>
                </span>
                <strong>Consultar clientes</strong>
                <small>Busca por DNI o RUC y revisa su estado.</small>
                <span className="action-arrow">Continuar <span aria-hidden="true">→</span></span>
              </button>
              <button type="button" className="action-tile featured" onClick={() => { setClienteParaPrestamo(null); setVista('prestamos') }}>
                <span className="action-symbol" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/><path d="m15 16 1.5 1.5L19 15"/></svg>
                </span>
                <strong>Registrar préstamo</strong>
                <small>Calcula las cuotas y registra el crédito.</small>
                <span className="action-arrow">Continuar <span aria-hidden="true">→</span></span>
              </button>
            </div>
          </div>
          </>}
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="intro-panel">
        <div className="brand"><span className="brand-mark"><img src={marcaCreditos} alt="" aria-hidden="true" /></span><span>Gestión de<br />Créditos</span></div>
        <div className="intro-content">
          <span className="intro-kicker">GESTIÓN DE CRÉDITOS</span>
          <h1>Cada crédito bajo control.</h1>
          <p>Una gestión clara y confiable para cada operación.</p>
        </div>
        <div className="intro-footer">Acceso exclusivo para trabajadores autorizados</div>
      </section>
      <section className="form-panel">
        <div className="form-wrap">
          <span className="eyebrow">ACCESO AL SISTEMA</span>
          <h2>Iniciar sesión</h2>
          <p className="muted">Accede de forma segura a tus herramientas de trabajo.</p>
          <form onSubmit={ingresar}>
            <label htmlFor="correo">Correo institucional o de acceso</label>
            <input id="correo" type="email" autoComplete="username" required value={correo} onChange={e => setCorreo(e.target.value)} placeholder="asesor@ejemplo.com" />
            <label htmlFor="password">Contraseña</label>
            <div className="password-field">
              <input id="password" type={mostrarPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" />
              <button type="button" className="show-password" onClick={() => setMostrarPassword(p => !p)} aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{mostrarPassword ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            {error && <div role="alert" className="form-error">{error}</div>}
            <button className="submit" disabled={cargando} type="submit">{cargando ? 'Validando acceso...' : 'Ingresar al sistema'} <span aria-hidden="true">→</span></button>
          </form>
          <p className="help">¿No tienes acceso? Solicita tus credenciales al responsable del sistema.</p>
        </div>
      </section>
    </main>
  )
}


function ClientesPanel({ token, trabajador, onNuevoPrestamo }: { token: string; trabajador: Trabajador; onNuevoPrestamo: (cliente: Cliente) => void }) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoConsulta>('DNI')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)
  const [revisionPresencial, setRevisionPresencial] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargandoLista, setCargandoLista] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorCliente, setErrorCliente] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargarClientes() {
    setCargandoLista(true)
    try {
      const respuesta = await fetchConTiempo(`${API_URL}/api/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data: { clientes?: Cliente[]; message?: string } = await respuesta.json()
      if (!respuesta.ok) throw new Error(data.message ?? 'No fue posible cargar los clientes.')
      setClientes(data.clientes ?? [])
    } catch (e) {
      setErrorCliente(e instanceof Error ? e.message : 'Error de conexión.')
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => {
    void cargarClientes()
    // La vista se monta al abrir Clientes y usa el token activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const regex = tipoDocumento === 'DNI' ? /^\d{8}$/ : /^10\d{9}$/
  const formatoValido = regex.test(numeroDocumento)

  function cambiarDocumento(nuevoNumero: string) {
    setNumeroDocumento(nuevoNumero.replace(/\D/g, '').slice(0, tipoDocumento === 'DNI' ? 8 : 11))
    setConsulta(null)
    setClienteExistente(null)
    setRevisionPresencial(false)
    setErrorCliente('')
    setMensaje('')
  }

  async function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorCliente('')
    setMensaje('')
    setConsulta(null)
    setClienteExistente(null)
    setRevisionPresencial(false)
    if (tipoDocumento === 'RUC20') return
    if (!formatoValido) { setErrorCliente('Revisa la cantidad de dígitos del documento.'); return }
    setConsultando(true)
    try {
      const parametros = new URLSearchParams({ tipoDocumento, numeroDocumento })
      const headers = { Authorization: `Bearer ${token}` }
      // Si ya existe, no gastar una consulta externa ni mostrar Registrar cliente.
      const existente = await fetchConTiempo(`${API_URL}/api/clientes/existente?${parametros}`, { headers, cache: 'no-store' })
      const encontrado: { existe?: boolean; cliente?: Cliente | null; message?: string } = await existente.json()
      if (!existente.ok) throw new Error(encontrado.message ?? 'No se pudo revisar el registro central.')
      if (encontrado.existe && encontrado.cliente) {
        setClienteExistente(encontrado.cliente)
        return
      }
      const respuesta = await fetchConTiempo(`${API_URL}/api/clientes/consulta?${parametros}`, { headers, cache: 'no-store' })
      const data: { datos?: Consulta; message?: string } = await respuesta.json()
      if (!respuesta.ok || !data.datos) throw new Error(data.message ?? 'Consulta no disponible.')
      setConsulta(data.datos)
    } catch (e) {
      setErrorCliente(e instanceof Error ? e.message : 'Error al consultar los datos.')
    } finally { setConsultando(false) }
  }

  async function registrar() {
    if (!consulta || !revisionPresencial) return
    setGuardando(true)
    setErrorCliente('')
    setMensaje('')
    try {
      const respuesta = await fetchConTiempo(`${API_URL}/api/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipoDocumento: consulta.tipoDocumento, numeroDocumento: consulta.numeroDocumento, revisionPresencialConfirmada: true }),
      })
      const data: { message?: string; cliente?: Cliente } = await respuesta.json()
      if (!respuesta.ok) throw new Error(data.message ?? 'No fue posible registrar al cliente.')
      setMensaje(data.message ?? 'Cliente guardado correctamente. No equivale a verificación oficial de identidad.')
      if (data.cliente) setClienteExistente(data.cliente)
      setConsulta(null)
      setRevisionPresencial(false)
      await cargarClientes()
    } catch (e) {
      setErrorCliente(e instanceof Error && e.message.includes('tardó demasiado') ? 'No pudimos confirmar si el cliente fue guardado. Actualiza la lista o vuelve a buscar el documento antes de repetir el registro.' : e instanceof Error ? e.message : 'Error guardando cliente.')
    } finally { setGuardando(false) }
  }

  return (
    <div className="clientes-view">
      <div className="eyebrow">MÓDULO DE CLIENTES</div>
      <h1>Clientes</h1>
      <p className="muted">Consulta un documento o revisa los clientes registrados.</p>
      <div className="clients-grid">
        <section className="client-card">
          <h2>{tipoDocumento === 'RUC20' ? 'Buscar empresa' : 'Buscar persona'}</h2>
          <p className="muted">{tipoDocumento === 'RUC20' ? 'Consulta la razón social y los datos vinculados.' : 'Busca por documento antes de iniciar la operación.'}</p>
          <form onSubmit={buscar} className="document-form">
            <label htmlFor="tipoDoc">Tipo de documento</label>
            <select id="tipoDoc" value={tipoDocumento} onChange={e => { setTipoDocumento(e.target.value as TipoConsulta); cambiarDocumento('') }}>
              <option value="DNI">DNI — 8 dígitos</option>
              <option value="RUC10">RUC 10 — 11 dígitos</option>
              <option value="RUC20">RUC 20 — Empresa</option>
            </select>
            {tipoDocumento !== 'RUC20' && <>
            <label htmlFor="docNumero">Número de documento</label>
            <input id="docNumero" value={numeroDocumento} onChange={e => cambiarDocumento(e.target.value)} inputMode="numeric" autoComplete="off" placeholder={tipoDocumento === 'DNI' ? '8 números' : '10 + DNI + dígito verificador'} maxLength={tipoDocumento === 'DNI' ? 8 : 11} required />
            <button className="submit" type="submit" disabled={!formatoValido || consultando}>{consultando ? 'Consultando...' : 'Consultar datos'} <span aria-hidden="true">→</span></button>
            </>}
          </form>
          {tipoDocumento === 'RUC20' && <EmpresaPanel token={token} onNuevoPrestamo={onNuevoPrestamo} />}
          {errorCliente && tipoDocumento !== 'RUC20' && <div role="alert" className="form-error notice">{errorCliente}</div>}
          {mensaje && <div role="status" className="success-notice">{mensaje}</div>}
          {tipoDocumento !== 'RUC20' && clienteExistente && <section className="person-result" aria-label="Cliente existente">
            <span className="status-pill">Cliente registrado</span>
            {clienteExistente.estadoCliente && <span className={`client-source estado-${clienteExistente.estadoCliente.toLowerCase()}`} style={{marginLeft:8}}>{({VIGENTE:'Vigente',MOROSO:'Moroso',EXTRAJUDICIAL:'Extrajudicial',SIN_DEUDA:'Sin deuda',SIN_PRESTAMOS:'Sin préstamos'} as const)[clienteExistente.estadoCliente]}</span>}
            <h3>{clienteExistente.apellidos}, {clienteExistente.nombres}</h3>
            <p className="muted">Documento consultado: {tipoDocumento} {numeroDocumento}</p>
            <p className="muted">Ficha principal: {clienteExistente.tipoDocumento} {clienteExistente.numeroDocumento} · Límite único de S/ 10 000.</p>
            <p className="identity-warning">Esta consulta no genera otro registro. Confirma presencialmente la identidad antes de otorgar crédito.</p>
            <button type="button" className="submit" onClick={() => onNuevoPrestamo({ ...clienteExistente, documentoOperacion: { tipoDocumento: tipoDocumento as TipoDocumento, numeroDocumento } })}>Continuar a nuevo préstamo <span aria-hidden="true">→</span></button>
          </section>}
          {tipoDocumento !== 'RUC20' && consulta && <section className="person-result" aria-label="Datos consultados">
            <span className="status-pill">Datos encontrados</span>
            <h3>{consulta.apellidos}, {consulta.nombres}</h3>
            <dl><div><dt>Documento</dt><dd>{consulta.numeroDocumento}</dd></div><div><dt>Origen</dt><dd>Decolecta · Datos públicos</dd></div>{consulta.estadoRuc && <div><dt>Estado RUC</dt><dd>{consulta.estadoRuc}</dd></div>}</dl>
            <p className="identity-warning">Esta consulta ayuda a evitar errores de digitación. No comprueba por sí sola que quien está frente al trabajador sea el titular ni que su DNI esté vigente.</p>
            <label className="confirm-check"><input type="checkbox" checked={revisionPresencial} onChange={e => setRevisionPresencial(e.target.checked)} /> Confirmo que contrasté los datos mostrados con el documento presentado presencialmente.</label>
            <button type="button" className="submit" disabled={!revisionPresencial || guardando} onClick={registrar}>{guardando ? 'Guardando...' : 'Registrar cliente'} <span aria-hidden="true">✓</span></button>
          </section>}
        </section>
        <section className="client-card">
          <div className="client-card-header"><div><h2>Clientes de {trabajador.agencia.nombre}</h2><p className="muted">Registrados o atendidos aquí · últimos 50</p></div><button className="refresh-list" type="button" onClick={() => void cargarClientes()} disabled={cargandoLista}>Actualizar</button></div>
          {cargandoLista ? <p className="muted">Cargando...</p> : clientes.length ?
          <div className="client-list">{clientes.map(cliente => <div className="client-row" key={cliente.id}>
            <div><strong>{cliente.apellidos}, {cliente.nombres}</strong><small>{cliente.tipoDocumento === 'DNI' ? 'DNI' : 'RUC 10'} · {cliente.numeroDocumento}</small></div>
            <span className={`client-source estado-${(cliente.estadoCliente ?? 'SIN_PRESTAMOS').toLowerCase()}`}>{({VIGENTE:'Vigente',MOROSO:'Moroso',EXTRAJUDICIAL:'Extrajudicial',SIN_DEUDA:'Sin deuda',SIN_PRESTAMOS:'Sin préstamos'} as const)[cliente.estadoCliente ?? 'SIN_PRESTAMOS']}</span>
          </div>)}</div> : <p className="empty-list">Todavía no hay clientes vinculados a esta agencia. Registra un cliente nuevo o completa un préstamo en esta agencia para empezar.</p>}
        </section>
      </div>
      
    </div>
  )
}

export default App
