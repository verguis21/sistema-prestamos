import { useEffect, useState } from 'react'

type Resumen = {
  fechaCorte: string
  alcance: 'TODAS_LAS_AGENCIAS'
  clientesUnicos: number
  prestamosRegistrados: number
  prestamosActivos: number
  prestamosCancelados: number
  capitalOtorgadoHistorico: string
  capitalComprometidoSinAmortizar: string
  interesesProgramadosNoCobrados: string
  pagosRecibidos: null
  morosidadConfirmada: null
  carteraExtrajudicial: null
  beneficioNeto: null
  nota: string
}

const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const formatoSol = (v: string) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(v))
const formatoEntero = (v: number) => new Intl.NumberFormat('es-PE').format(v)

export default function GerenciaPanel({ token }: { token: string }) {
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    async function cargar() {
      setCargando(true)
      setError('')
      try {
        const response = await fetch(`${API}/api/gerencia/resumen`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        })
        const json = await response.json()
        if (!response.ok) throw new Error(json.message ?? 'No fue posible cargar el resumen general.')
        setResumen(json as Resumen)
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Error de conexión.')
        else setError('El servidor tardó más de 15 segundos. Revisa la conexión y actualiza.')
      } finally {
        clearTimeout(timeout)
        setCargando(false)
      }
    }
    void cargar()
    return () => { clearTimeout(timeout); controller.abort() }
  }, [token, recargar])

  return <section className="gerencia-view">
    <div className="eyebrow">GERENCIA · VISTA GENERAL</div>
    <div className="gerencia-heading">
      <div>
        <h1>Resumen del negocio</h1>
        <p className="muted">Consolidado de las cinco agencias. Por ahora sin filtros por sucursal.</p>
      </div>
      <button className="refresh-list" type="button" disabled={cargando} onClick={() => setRecargar(v => v + 1)}>{cargando ? 'Actualizando…' : 'Actualizar'}</button>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {!resumen && cargando && <p className="muted">Consultando cifras de la empresa…</p>}
    {resumen && <>
      <p className="gerencia-cutoff">Información registrada hasta {new Date(resumen.fechaCorte).toLocaleString('es-PE')}</p>
      <div className="gerencia-grid">
        <article className="gerencia-stat"><span>Capital total otorgado</span><strong>{formatoSol(resumen.capitalOtorgadoHistorico)}</strong><small>Acumulado histórico de préstamos</small></article>
        <article className="gerencia-stat"><span>Préstamos registrados</span><strong>{formatoEntero(resumen.prestamosRegistrados)}</strong><small>{formatoEntero(resumen.prestamosActivos)} activos · {formatoEntero(resumen.prestamosCancelados)} cancelados en base de datos</small></article>
        <article className="gerencia-stat"><span>Clientes únicos</span><strong>{formatoEntero(resumen.clientesUnicos)}</strong><small>Una ficha por persona natural en el modelo actual</small></article>
        <article className="gerencia-stat"><span>Capital comprometido</span><strong>{formatoSol(resumen.capitalComprometidoSinAmortizar)}</strong><small>Capital inicial de préstamos activos; no es saldo real actualizado</small></article>
        <article className="gerencia-stat"><span>Intereses programados</span><strong>{formatoSol(resumen.interesesProgramadosNoCobrados)}</strong><small>Proyección contractual, no ingresos recibidos</small></article>
      </div>
      <section className="gerencia-pending">
        <h2>Indicadores por habilitar</h2>
        <p className="muted">No mostraremos montos inventados ni convertiremos una cuota no registrada como pagada en una pérdida contable.</p>
        <div className="gerencia-pending-grid">
          <div><span>Pagos efectivamente recibidos</span><strong>Sin datos de cobros</strong></div>
          <div><span>Morosidad confirmada</span><strong>Pendiente de pagos</strong></div>
          <div><span>Cartera extrajudicial</span><strong>Regla por confirmar</strong></div>
          <div><span>Beneficio o pérdida neta</span><strong>Pendiente de ingresos y gastos</strong></div>
        </div>
      </section>
      <p className="identity-footnote">{resumen.nota} Los préstamos mostrados son registros del sistema; no equivalen necesariamente a desembolsos bancarios comprobados.</p>
    </>}
  </section>
}
