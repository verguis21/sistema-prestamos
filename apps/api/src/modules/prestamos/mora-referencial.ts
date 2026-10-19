/** SOLO CÁLCULO DE PRUEBA, NO COBRO NI ALTERACIÓN DE SALDOS.
 * Base provisional: capital de cada cuota vencida e impaga, sin interés compensatorio.
 * La tasa y su admisibilidad legal NO están confirmadas para producción.
 */
import { centimos, diasTranscurridos, estadoDeCuota } from './estados.js';
export type CuotaParaMora = {
  fechaVencimiento: string | Date;
  estado: 'PENDIENTE' | 'PAGADA';
  capital: { toString(): string } | string | number;
  montoCuota: { toString(): string } | string | number;
};
export function moraAcademicaInformativa(
  cuotas: readonly CuotaParaMora[],
  fechaHoy: string,
  tasaDiaria: number,
) {
  if (!Number.isFinite(tasaDiaria) || tasaDiaria < 0 || tasaDiaria > 1) {
    throw new Error('Tasa diaria de prueba inválida.');
  }
  let capitalVencidoCentimos = 0;
  let moraSinRedondearCentimos = 0;
  for (const cuota of cuotas) {
    if (estadoDeCuota(cuota, fechaHoy) !== 'VENCIDA') continue;
    const capital = centimos(cuota.capital);
    const vencimiento = cuota.fechaVencimiento instanceof Date
      ? cuota.fechaVencimiento.toISOString().slice(0, 10) : cuota.fechaVencimiento.slice(0, 10);
    const dias = diasTranscurridos(vencimiento, fechaHoy);
    capitalVencidoCentimos += capital;
    moraSinRedondearCentimos += capital * tasaDiaria * dias;
  }
  return {
    capitalVencidoCentimos,
    moraReferencialCentimos: Math.round(moraSinRedondearCentimos),
    modalidad: 'PRUEBA_NO_COBRABLE' as const,
  };
}
