/** Estados de lectura, derivados de vencimientos y pagos registrados; nunca crean pagos. */
export type EstadoVisibleCuota = 'PENDIENTE' | 'VENCIDA' | 'PAGADA';
export type EstadoVisiblePrestamo = 'VIGENTE' | 'MOROSO' | 'EXTRAJUDICIAL' | 'LIQUIDADO';
export type EstadoVisibleCliente = EstadoVisiblePrestamo | 'SIN_DEUDA' | 'SIN_PRESTAMOS';

export type CuotaEvaluable = {
  fechaVencimiento: Date | string;
  estado: 'PENDIENTE' | 'PAGADA';
  montoCuota: { toString(): string } | string | number;
  capital: { toString(): string } | string | number;
};
export type PrestamoEvaluable = {
  estado: 'ACTIVO' | 'CANCELADO';
  cuotas: readonly CuotaEvaluable[];
};

/** Fecha del negocio: se usa la zona horaria peruana, no la del servidor Render. */
export function fechaPeru(hora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(hora);
  const obtener = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function fechaIso(fecha: Date | string): string {
  return fecha instanceof Date ? fecha.toISOString().slice(0, 10) : fecha.slice(0, 10);
}

function diaUTC(fecha: string): number {
  return Date.parse(`${fecha.slice(0, 10)}T00:00:00.000Z`);
}

export function diasTranscurridos(desde: string, hasta: string): number {
  return Math.max(0, Math.floor((diaUTC(hasta) - diaUTC(desde)) / 86_400_000));
}

export function estadoDeCuota(cuota: CuotaEvaluable, hoy = fechaPeru()): EstadoVisibleCuota {
  if (cuota.estado === 'PAGADA') return 'PAGADA';
  return fechaIso(cuota.fechaVencimiento) < hoy ? 'VENCIDA' : 'PENDIENTE';
}

export function centimos(decimal: { toString(): string } | string | number): number {
  return Math.round(Number(decimal.toString()) * 100);
}

export function evaluarPrestamo(prestamo: PrestamoEvaluable, hoy = fechaPeru()) {
  const cuotasVencidas = prestamo.cuotas.filter(c => estadoDeCuota(c, hoy) === 'VENCIDA');
  const cuotasPendientes = prestamo.cuotas.filter(c => c.estado !== 'PAGADA');
  const primeraImpaga = cuotasVencidas.length
    ? cuotasVencidas.map(c => fechaIso(c.fechaVencimiento)).sort()[0]
    : null;
  const diasMora = primeraImpaga ? diasTranscurridos(primeraImpaga, hoy) : 0;
  const todasPagadas = prestamo.cuotas.length > 0 && cuotasPendientes.length === 0;
  const estadoCalculado: EstadoVisiblePrestamo = todasPagadas || (prestamo.estado === 'CANCELADO' && cuotasPendientes.length === 0)
    ? 'LIQUIDADO' : cuotasVencidas.length === 0 ? 'VIGENTE' : diasMora >= 360 ? 'EXTRAJUDICIAL' : 'MOROSO';

  return {
    estadoCalculado,
    diasMora,
    primeraCuotaImpaga: primeraImpaga,
    cuotasVencidas: cuotasVencidas.length,
    importeCuotasVencidasCentimos: cuotasVencidas.reduce((s, c) => s + centimos(c.montoCuota), 0),
    capitalDeCuotasPendientesCentimos: cuotasPendientes.reduce((s, c) => s + centimos(c.capital), 0),
  };
}

export function estadoDeCliente(estados: readonly EstadoVisiblePrestamo[]): EstadoVisibleCliente {
  if (!estados.length) return 'SIN_PRESTAMOS';
  if (estados.includes('EXTRAJUDICIAL')) return 'EXTRAJUDICIAL';
  if (estados.includes('MOROSO')) return 'MOROSO';
  if (estados.includes('VIGENTE')) return 'VIGENTE';
  return 'SIN_DEUDA';
}
