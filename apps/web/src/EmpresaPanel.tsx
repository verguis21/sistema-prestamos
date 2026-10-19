import { useState, type FormEvent } from 'react'

type Empresa = { id: string; ruc: string; razonSocial: string; estadoSunat: string | null }
type Representante = { id: string; nombres: string; apellidos: string; tipoDocumento: 'DNI' | 'RUC10'; numeroDocumento: string; proveedorIdentidad?: string | null }
type ConsultaEmpresa = { ruc: string; razonSocial: string; estadoRuc: string | null; condicionRuc: string | null }
type RepresentanteHallado = { dni: string | null; nombreCompleto: string; cargo: string | null; fechaDesde: string | null }
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
export default function EmpresaPanel({ token, onNuevoPrestamo }: { token: string; onNuevoPrestamo: (cliente: Representante & { empresaOperacion: { id: string; ruc: string; razonSocial: string }; documentoOperacion: { tipoDocumento: 'RUC20'; numeroDocumento: string; empresaId: string } }) => void }) {
  const [ruc, setRuc] = useState('')
  const [dni, setDni] = useState('')
  const [consulta, setConsulta] = useState<ConsultaEmpresa | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [representante, setRepresentante] = useState<Representante | null>(null)
  const [revision, setRevision] = useState(false)
  const [encontrados, setEncontrados] = useState<RepresentanteHallado[]>([])
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)
  const [seleccionAutomatica, setSeleccionAutomatica] = useState(false)
  const [avisoBusqueda, setAvisoBusqueda] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  async function api<T>(path: string, body?: object): Promise<T> {
    const response = await fetch(`${BASE}/api/empresas${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000), cache:'no-store',
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json.message || 'Consulta no disponible.')
    return json as T
  }
  async function consultar(e: FormEvent) {
    e.preventDefault(); setError(''); setMensaje(''); setConsulta(null); setEmpresa(null); setRepresentante(null); setRevision(false); setEncontrados([]); setBusquedaRealizada(false); setSeleccionAutomatica(false); setAvisoBusqueda('')
    if (!/^20\d{9}$/.test(ruc)) { setError('El RUC 20 debe tener 11 dígitos.'); return }
    setOcupado(true)
    try {
      const existente = await api<{ empresa: Empresa | null; representante: Representante | null }>(`/existente?ruc=${ruc}`)
      if (existente.empresa && existente.representante) { setEmpresa(existente.empresa); setRepresentante(existente.representante); return }
      const resultado = await api<{ datos: ConsultaEmpresa }>(`/consulta?ruc=${ruc}`)
      setConsulta(resultado.datos)
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible consultar la empresa.') }
    finally { setOcupado(false) }
  }
  async function buscarRepresentantes() {
    if (!consulta) return
    setOcupado(true); setError(''); setAvisoBusqueda(''); setEncontrados([])
    setBusquedaRealizada(true); setSeleccionAutomatica(false); setDni(''); setRevision(false)
    try {
      const resultado = await api<{ representantes: RepresentanteHallado[]; advertencia: string }>(`/representantes?ruc=${consulta.ruc}`)
      setEncontrados(resultado.representantes)
      setAvisoBusqueda(resultado.representantes.length
        ? 'Revisa los representantes encontrados. Si el DNI está oculto, compruébalo con los documentos originales.'
        : 'No se encontraron representantes con DNI en esta consulta. Revisa SUNAT y SUNARP manualmente.')
    } catch (e) {
      setAvisoBusqueda(e instanceof Error ? e.message : 'Consulta automática no disponible. Utiliza revisión documental.')
    } finally { setOcupado(false) }
  }
  async function registrar() {
    if (!consulta || !/^\d{8}$/.test(dni) || !revision) return
    setOcupado(true); setError(''); setMensaje('')
    try {
      const resultado = await api<{ empresa: Empresa; representante: Representante; message: string }>('/', {
        ruc: consulta.ruc, representanteDni: dni, revisionPresencialConfirmada: true, representacionDocumentada: true, consultaAutomatica: seleccionAutomatica,
      })
      setEmpresa(resultado.empresa); setRepresentante(resultado.representante); setConsulta(null)
      setMensaje(resultado.message)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar la empresa.') }
    finally { setOcupado(false) }
  }
  function continuar() {
    if (!empresa || !representante) return
    onNuevoPrestamo({ ...representante, empresaOperacion: { id: empresa.id, ruc: empresa.ruc, razonSocial: empresa.razonSocial },
      documentoOperacion: { tipoDocumento:'RUC20', numeroDocumento: empresa.ruc, empresaId: empresa.id } })
  }
  return <div className="empresa-flow">
    <form className="document-form" onSubmit={consultar}>
      <label htmlFor="ruc-empresa">RUC de la empresa</label>
      <input id="ruc-empresa" inputMode="numeric" autoComplete="off" placeholder="20 + 9 dígitos" maxLength={11} value={ruc}
        onChange={e => { setRuc(e.target.value.replace(/\D/g,'').slice(0,11)); setEmpresa(null); setRepresentante(null); setConsulta(null); setError(''); setEncontrados([]); setBusquedaRealizada(false); setSeleccionAutomatica(false) }} />
      <button className="submit" type="submit" disabled={ocupado || !/^20\d{9}$/.test(ruc)}>{ocupado ? 'Consultando…' : 'Consultar empresa'} <span aria-hidden="true">→</span></button>
    </form>
    {error && <div className="form-error notice" role="alert">{error}</div>}
    {mensaje && <div className="success-notice" role="status">{mensaje}</div>}
    {consulta && <section className="person-result" aria-label="Empresa encontrada">
      <span className="status-pill">Datos SUNAT consultados</span>
      <h3>{consulta.razonSocial}</h3>
      <p className="muted">RUC {consulta.ruc} · {consulta.estadoRuc ?? 'Estado no informado'}</p>
      <div className="representantes-consulta">
        <button type="button" className="btn-representantes" disabled={ocupado} onClick={()=>void buscarRepresentantes()}>
          {ocupado ? 'Consultando…' : 'Buscar representante legal por RUC'}
        </button>
        <small>Consulta opcional mediante proveedor especializado. La vigencia de poderes se revisa documentalmente.</small>
        {busquedaRealizada && avisoBusqueda && <p className="muted" role="status">{avisoBusqueda}</p>}
        {encontrados.length > 0 && <div className="representantes-lista" role="group" aria-label="Representantes encontrados">
          {encontrados.map((persona, indice) => <label key={`${persona.dni ?? 'oculto'}-${indice}`} className="representante-opcion">
            <input type="radio" name="representante-ruc" disabled={!persona.dni} checked={Boolean(persona.dni && seleccionAutomatica && dni === persona.dni)}
              onChange={() => { if (persona.dni) { setDni(persona.dni); setSeleccionAutomatica(true); setRevision(false) } }} />
            <span><strong>{persona.nombreCompleto}</strong><small>{persona.dni ? `DNI ${persona.dni}` : 'DNI oculto: verificar documento'} · {persona.cargo || 'Cargo no informado'}{persona.fechaDesde ? ` · Desde ${persona.fechaDesde}` : ''}</small></span>
          </label>)}
        </div>}
      </div>
      <p className="muted">Si la consulta no está disponible, comprueba SUNAT y SUNARP y escribe el DNI según los documentos.</p>
      <div className="representantes-enlaces">
        <a href="https://www.gob.pe/565-consulta-de-ruc/565-consultar-el-estado-del-ruc" target="_blank" rel="noreferrer">Consultar SUNAT ↗</a>
        <a href="https://vigenciaexpress.sunarp.gob.pe/" target="_blank" rel="noreferrer">Comprobar poder en SUNARP ↗</a>
      </div>
      <label htmlFor="representante-dni" className="representante-label">DNI del representante</label>
      <input id="representante-dni" className="representante-input" placeholder="8 dígitos" inputMode="numeric" maxLength={8} value={dni}
        onChange={e => { setDni(e.target.value.replace(/\D/g,'').slice(0,8)); setSeleccionAutomatica(false); setRevision(false) }} />
      <p className="muted">Consultaremos el nombre asociado al DNI. La API de SUNAT no acredita por sí sola la representación legal.</p>
      <label className="confirm-check"><input type="checkbox" checked={revision} onChange={e=>setRevision(e.target.checked)} />
        Confirmo que revisé presencialmente el DNI y la documentación de representación de esta empresa.</label>
      <button type="button" className="submit" disabled={ocupado || !/^\d{8}$/.test(dni) || !revision} onClick={()=>void registrar()}>{ocupado ? 'Registrando…' : 'Vincular representante y empresa'}</button>
    </section>}
    {empresa && representante && <section className="person-result" aria-label="Empresa registrada">
      <span className="status-pill">Empresa registrada</span>
      <h3>{empresa.razonSocial}</h3>
      <p className="muted">RUC 20 {empresa.ruc}</p>
      <div className="empresa-representante"><span>Representante vinculado</span><strong>{representante.apellidos}, {representante.nombres}</strong><small>{representante.tipoDocumento} {representante.numeroDocumento}</small></div>
      <p className="identity-warning">El préstamo se vinculará al representante para controlar el límite global de S/ 10 000. La representación oficial requiere comprobación documental.</p>
      <button className="submit" type="button" onClick={continuar}>Continuar con préstamo RUC 20 <span aria-hidden="true">→</span></button>
    </section>}
  </div>
}
