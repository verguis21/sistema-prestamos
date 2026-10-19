/** Diagnóstico financiero de lectura local: no utiliza credenciales ni modifica la BD. */
import { TEA, BASE_ANUAL, DIAS_PERIODO, TASA_PERIODO, generarCronograma } from '../modules/prestamos/calculo.js';

const capital = 100;
const n = 24;
const cuotaFrancesa = (i: number) => capital * i / (1 - Math.pow(1 + i, -n));
const r = generarCronograma(10_000, n, '2026-10-19');
const mensualNominal = TEA / 12;
console.log(JSON.stringify({
  tipo: 'COMPARACION_INFORMATIVA_NO_MODIFICA_PRESTAMOS',
  capitalSoles: capital, cuotas: n,
  convenioProyecto: { teaAnualPorcentaje: TEA * 100, baseDias: BASE_ANUAL, diasPorCuota: DIAS_PERIODO },
  sistema: { tasaPor30DiasPorcentaje: +(TASA_PERIODO * 100).toFixed(8), cuotaIdeal: +cuotaFrancesa(TASA_PERIODO).toFixed(8), cuotaBase: r.cuotaFija, totalProgramado: r.montoTotal, intereses: r.interesTotal },
  referenciaWeb: { conversionUsada: '30% / 12 (TASA NOMINAL ANUAL /12)', tasaPorPeriodoPorcentaje: +(mensualNominal * 100).toFixed(8), cuotaIdeal: +cuotaFrancesa(mensualNominal).toFixed(8), totalAproximado: +(cuotaFrancesa(mensualNominal) * n).toFixed(2), teaEquivalentePorcentaje: +(100 * (Math.pow(1 + mensualNominal,12) - 1)).toFixed(6) },
  tcea: 'NO CALCULADA: no existen seguros/comisiones definidos; la mora por atraso se excluye de la proyección ordinaria',
  aviso: 'No se ha cambiado la TEA ni el cronograma de ningún préstamo existente.',
},null,2));
