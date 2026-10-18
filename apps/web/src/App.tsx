import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import PrestamosPanel from './PrestamosPanel'

type Trabajador = {
  id: string
  nombres: string
  apellidos: string
  correo: string
  agencia: { id: string; nombre: string; ciudad: string }
}

type LoginResponse = {
  token: string
  trabajador: Trabajador
}

type TipoDocumento = 'DNI' | 'RUC10'
type Cliente = {
  id: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidos: string
  proveedorIdentidad: string | null
  identidadVerificada: boolean
  creadoEn: string
  documentoOperacion?: { tipoDocumento: TipoDocumento; numeroDocumento: string }
}
type Consulta = Pick<Cliente, 'tipoDocumento'|'numeroDocumento'|'nombres'|'apellidos'> & {
  proveedor: string
  estadoRuc?: string
  verificacionOficial: false
  requiereRevisionPresencial: true
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function App() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null)
  const [token, setToken] = useState('')
  const [vista, setVista] = useState<'inicio' | 'clientes' | 'prestamos'>('inicio')
  const [clienteParaPrestamo, setClienteParaPrestamo] = useState<Cliente | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function ingresar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setCargando(true)

    try {
      const respuesta = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.trim(), password }),
      })
      const data: LoginResponse & { message?: string } = await respuesta.json()
      if (!respuesta.ok || !data.token) {
        throw new Error(data.message ?? 'No fue posible iniciar sesión.')
      }

      // Comprobar que una ruta protegida reconoce la sesión real.
      const perfil = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      })
      if (!perfil.ok) throw new Error('No fue posible validar la sesión.')
      const resultado: { trabajador: Trabajador } = await perfil.json()
      setTrabajador(resultado.trabajador)
      setToken(data.token)
      setVista('inicio')
      setPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con la API.')
    } finally {
      setCargando(false)
    }
  }

  if (trabajador) {
    return (
      <main className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark">SP</span><span>Sistema de<br />Préstamos</span></div>
          <div className="sidebar-label">SESIÓN ACTIVA</div>
          <div className="sidebar-user">{trabajador.nombres} {trabajador.apellidos}<small>{trabajador.correo}</small></div>
          <div className="side-nav" aria-label="Módulos del sistema">
            <button type="button" className={vista === 'inicio' ? 'active' : ''} onClick={() => setVista('inicio')}>Inicio</button>
            <button type="button" className={vista === 'clientes' ? 'active' : ''} onClick={() => setVista('clientes')}>Clientes</button>
            <button type="button" className={vista === 'prestamos' ? 'active' : ''} onClick={() => { setClienteParaPrestamo(null); setVista('prestamos') }}>Préstamos</button>
          </div>
          <button className="logout" onClick={() => { setTrabajador(null); setToken(''); setClienteParaPrestamo(null); setVista('inicio'); setCorreo(''); setPassword(''); setError('') }}>Cerrar sesión</button>
        </aside>
        <section className="dashboard">
          {vista === 'clientes' ? <ClientesPanel token={token} trabajador={trabajador} onNuevoPrestamo={cliente => { setClienteParaPrestamo(cliente); setVista('prestamos') }} /> : vista === 'prestamos' ? <PrestamosPanel token={token} trabajador={trabajador} clienteInicial={clienteParaPrestamo} /> : <>
          <div className="eyebrow">Panel de trabajador</div>
          <h1>Bienvenido, {trabajador.nombres}</h1>
          <p className="muted">Tu acceso fue validado contra la base de datos del sistema.</p>
          <div className="summary-grid">
            <article className="summary"><span>Agencia asignada</span><strong>{trabajador.agencia.nombre}</strong><small>{trabajador.agencia.ciudad}</small></article>
            <article className="summary"><span>Identidad de usuario</span><strong>Autenticada</strong><small>Credenciales verificadas por el backend</small></article>
          </div>
          <section className="next-module">
            <span className="status-pill">MVP - Registro de préstamos</span>
            <h2>Registrar préstamos y generar cronogramas</h2>
            <p>Ahora puedes registrar préstamos y generar sus cronogramas franceses con TEA del 30 %, sin registrar pagos todavía.</p>
            <button type="button" className="go-clients" onClick={() => { setClienteParaPrestamo(null); setVista('prestamos') }}>Registrar un préstamo →</button>
          </section>
          </>}
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="intro-panel">
        <div className="brand"><span className="brand-mark">SP</span><span>Sistema de<br />Préstamos</span></div>
        <div className="intro-content">
          <span className="intro-kicker">GESTIÓN DE CRÉDITOS</span>
          <h1>Un registro preciso. Una operación más segura.</h1>
          <p>Plataforma interna para el personal de las agencias. Consulta, registra y gestiona operaciones con información centralizada.</p>
        </div>
        <div className="intro-footer">Acceso exclusivo para trabajadores autorizados</div>
      </section>
      <section className="form-panel">
        <div className="form-wrap">
          <span className="eyebrow">ACCESO AL SISTEMA</span>
          <h2>Iniciar sesión</h2>
          <p className="muted">Ingresa con las credenciales asignadas a tu agencia.</p>
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
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI')
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
      const respuesta = await fetch(`${API_URL}/api/clientes`, {
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
    if (!formatoValido) { setErrorCliente('Revisa la cantidad de dígitos del documento.'); return }
    setConsultando(true)
    try {
      const parametros = new URLSearchParams({ tipoDocumento, numeroDocumento })
      const headers = { Authorization: `Bearer ${token}` }
      // Si ya existe, no gastar una consulta externa ni mostrar Registrar cliente.
      const existente = await fetch(`${API_URL}/api/clientes/existente?${parametros}`, { headers, cache: 'no-store' })
      const encontrado: { existe?: boolean; cliente?: Cliente | null; message?: string } = await existente.json()
      if (!existente.ok) throw new Error(encontrado.message ?? 'No se pudo revisar el registro central.')
      if (encontrado.existe && encontrado.cliente) {
        setClienteExistente(encontrado.cliente)
        return
      }
      const respuesta = await fetch(`${API_URL}/api/clientes/consulta?${parametros}`, { headers, cache: 'no-store' })
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
      const respuesta = await fetch(`${API_URL}/api/clientes`, {
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
      setErrorCliente(e instanceof Error ? e.message : 'Error guardando cliente.')
    } finally { setGuardando(false) }
  }

  return (
    <div className="clientes-view">
      <div className="eyebrow">MÓDULO DE CLIENTES</div>
      <h1>Consulta y registro</h1>
      <p className="muted">Agencia {trabajador.agencia.nombre} · Consulta DNI y RUC 10 en fuentes públicas. Solo para personal autorizado.</p>
      <div className="clients-grid">
        <section className="client-card">
          <h2>Buscar persona</h2>
          <p className="muted">Busca primero en la base central. Si ya existe, no necesitas registrarlo otra vez.</p>
          <form onSubmit={buscar} className="document-form">
            <label htmlFor="tipoDoc">Tipo de documento</label>
            <select id="tipoDoc" value={tipoDocumento} onChange={e => { setTipoDocumento(e.target.value as TipoDocumento); cambiarDocumento('') }}>
              <option value="DNI">DNI — 8 dígitos</option>
              <option value="RUC10">RUC 10 — 11 dígitos</option>
            </select>
            <label htmlFor="docNumero">Número de documento</label>
            <input id="docNumero" value={numeroDocumento} onChange={e => cambiarDocumento(e.target.value)} inputMode="numeric" autoComplete="off" placeholder={tipoDocumento === 'DNI' ? '8 números' : '10 + DNI + dígito verificador'} maxLength={tipoDocumento === 'DNI' ? 8 : 11} required />
            <button className="submit" type="submit" disabled={!formatoValido || consultando}>{consultando ? 'Consultando...' : 'Consultar datos'} <span aria-hidden="true">→</span></button>
          </form>
          {errorCliente && <div role="alert" className="form-error notice">{errorCliente}</div>}
          {mensaje && <div role="status" className="success-notice">{mensaje}</div>}
          {clienteExistente && <section className="person-result" aria-label="Cliente existente">
            <span className="status-pill">Ya registrado en la empresa</span>
            <h3>{clienteExistente.apellidos}, {clienteExistente.nombres}</h3>
            <p className="muted">Documento consultado: {tipoDocumento} {numeroDocumento}</p>
            <p className="muted">Registro principal: {clienteExistente.tipoDocumento} {clienteExistente.numeroDocumento}. Se utiliza una única identidad para controlar el límite global, aunque consultes con DNI o RUC 10.</p>
            <p className="identity-warning">No se creará otro cliente ni se cambiará su sucursal por esta consulta. Si usaste un RUC 10, confirma también que esté activo en SUNAT.</p>
            <button type="button" className="submit" onClick={() => onNuevoPrestamo({ ...clienteExistente, documentoOperacion: { tipoDocumento, numeroDocumento } })}>Continuar a nuevo préstamo <span aria-hidden="true">→</span></button>
          </section>}
          {consulta && <section className="person-result" aria-label="Datos consultados">
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
            <span className="client-source">Datos consultados</span>
          </div>)}</div> : <p className="empty-list">Todavía no hay clientes vinculados a esta agencia. Registra un cliente nuevo o completa un préstamo en esta agencia para empezar.</p>}
        </section>
      </div>
      <p className="identity-footnote">Para un sistema crediticio en operación real se necesitarán controles de identidad autorizados, revisión de documentos y protección de datos personales.</p>
    </div>
  )
}

export default App
