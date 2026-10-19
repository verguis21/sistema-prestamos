import { useEffect, useState } from 'react'

type Estado = { VIGENTE: number; MOROSO: number; EXTRAJUDICIAL: number; LIQUIDADO: number }
type ClienteEstado = { VIGENTE: number; MOROSO: number; EXTRAJUDICIAL: number; SIN_DEUDA: number; SIN_PRESTAMOS: number }
type Resumen = {
  fechaCorte: string
  clientesUnicos: number
  prestamosRegistrados: number
  capitalOtorgadoHistorico: string
  capitalPendienteProgramado: string
  interesesPendientesProgramados: string
  importeCuotasVencidas: string
  capitalEnCuotasVencidas: string
  capitalPrestamosMorosos: string
  capitalPrestamosExtrajudiciales: string
  cuotasVencidas: number
  prestamosPorEstado: Estado
  clientesPorEstado: ClienteEstado
  pagosRecibidos: null
  beneficioNeto: null
  reglaExtrajudicial: string
  nota: string
}
const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const dinero = (v: string) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(v))
const entero = (v: number) => new Intl.NumberFormat('es-PE').format(v)

type MetricaProps = { etiqueta: string; cifra: string; aclaracion: string; tono?: 'normal' | 'alerta' | 'critico'; principal?: boolean }
function Metrica({ etiqueta, cifra, aclaracion, tono = 'normal', principal = false }: MetricaProps) {
  return <article className={`gerencia-stat tone-${tono}${principal ? ' metric-primary' : ''}`}>
    <span>{etiqueta}</span><strong>{cifra}</strong><small>{aclaracion}</small>
  </article>
}

export default function GerenciaPanel({ token }: { token: string }) {
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    async function cargar() {
      setCargando(true); setError('')
      try {
        const response = await fetch(`${API}/api/gerencia/resumen`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
        })
        const json = await response.json()
        if (!response.ok) throw new Error(json.message ?? 'No se pudo consultar la cartera.')
        setResumen(json as Resumen)
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Error de conexión.')
        else setError('La consulta tardó demasiado. Comprueba que Render esté activo y vuelve a actualizar.')
      } finally { clearTimeout(timeout); setCargando(false) }
    }
    void cargar()
    return () => { clearTimeout(timeout); controller.abort() }
  }, [token, recargar])

  return <section className="gerencia-view">
    <div className="gerencia-heading">
      <div>
        <span className="eyebrow">GERENCIA GENERAL / TODAS LAS AGENCIAS</span>
        <h1>Estado de la cartera</h1>
        <p className="muted page-lead">Capital otorgado, deuda pendiente y cartera en riesgo.</p>
      </div>
      <button type="button" className="refresh-list" disabled={cargando} onClick={() => setRecargar(v => v + 1)}>{cargando ? 'Consultando…' : '↻ Actualizar cifras'}</button>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {!resumen && cargando && <div className="gerencia-loading" role="status">Obteniendo información consolidada…</div>}
    {resumen && <>
      <p className="gerencia-cutoff">Corte: {new Date(resumen.fechaCorte).toLocaleString('es-PE')} · Datos internos registrados</p>
      <div className="gerencia-grid financial-grid">
        <Metrica principal etiqueta="Capital total colocado" cifra={dinero(resumen.capitalOtorgadoHistorico)} aclaracion="Suma histórica de préstamos otorgados" />
        <Metrica principal etiqueta="Capital pendiente de recuperar" cifra={dinero(resumen.capitalPendienteProgramado)} aclaracion="Capital de cuotas aún no pagadas" />
        <Metrica principal tono="alerta" etiqueta="Cuotas vencidas por cobrar" cifra={dinero(resumen.importeCuotasVencidas)} aclaracion={`${entero(resumen.cuotasVencidas)} cuotas vencidas · capital e intereses`} />
        <Metrica principal tono="critico" etiqueta="Capital en extrajudicial" cifra={dinero(resumen.capitalPrestamosExtrajudiciales)} aclaracion="Capital pendiente vinculado a cartera extrajudicial" />
        <Metrica etiqueta="Capital con atraso" cifra={dinero(resumen.capitalPrestamosMorosos)} aclaracion="Capital pendiente de créditos con cuotas vencidas" tono="alerta" />
        <Metrica etiqueta="Préstamos activos" cifra={entero(resumen.prestamosPorEstado.VIGENTE + resumen.prestamosPorEstado.MOROSO + resumen.prestamosPorEstado.EXTRAJUDICIAL)} aclaracion={`${entero(resumen.prestamosRegistrados)} registrados en total`} />
        <Metrica etiqueta="Clientes morosos" cifra={entero(resumen.clientesPorEstado.MOROSO)} aclaracion="Con cuotas vencidas sin pagar" tono="alerta" />
        <Metrica etiqueta="Clientes en extrajudicial" cifra={entero(resumen.clientesPorEstado.EXTRAJUDICIAL)} aclaracion="Según regla provisional de 360 días" tono="critico" />
      </div>
      <div className="gerencia-bottom-grid">
        <section className="gerencia-pending">
          <h2>Situación de la cartera</h2>
          <p className="muted">Préstamos clasificados según el vencimiento de sus cuotas.</p>
          <div className="portfolio-rows">
            <div><span className="portfolio-label"><span className="state-dot ok"/>Al día</span><strong>{entero(resumen.prestamosPorEstado.VIGENTE)}</strong></div>
            <div><span className="portfolio-label"><span className="state-dot warning"/>Con cuotas vencidas</span><strong>{entero(resumen.prestamosPorEstado.MOROSO)}</strong></div>
            <div><span className="portfolio-label"><span className="state-dot danger"/>Extrajudiciales</span><strong>{entero(resumen.prestamosPorEstado.EXTRAJUDICIAL)}</strong></div>
            <div><span className="portfolio-label"><span className="state-dot neutral"/>Liquidados</span><strong>{entero(resumen.prestamosPorEstado.LIQUIDADO)}</strong></div>
          </div>
        </section>
        <section className="gerencia-pending">
          <h2>Proyección y cobranza</h2>
          <div className="finance-detail"><span>Intereses pendientes programados</span><strong>{dinero(resumen.interesesPendientesProgramados)}</strong></div>
          <div className="finance-detail"><span>Capital en cuotas vencidas</span><strong>{dinero(resumen.capitalEnCuotasVencidas)}</strong></div>
          <div className="finance-detail"><span>Ingresos realmente cobrados</span><strong className="unavailable">Por habilitar</strong></div>
          <p className="muted metric-footnote">Los intereses programados no representan ganancias cobradas. La utilidad real se mostrará cuando exista registro de pagos e ingresos/gastos.</p>
        </section>
      </div>
      <p className="gerencia-disclaimer">{resumen.nota} El criterio extrajudicial sigue pendiente de validación del profesor.</p>
    </>}
  </section>
}
