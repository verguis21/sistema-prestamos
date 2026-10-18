/** Motor de cronograma francés: TEA 30%, año comercial 360, periodos de 30 días. */
export const TEA = 0.30;
export const DIAS_PERIODO = 30;
export const BASE_ANUAL = 360;
export const LIMITE_CENTIMOS = 1_000_000;
export const TASA_PERIODO = Math.pow(1 + TEA, DIAS_PERIODO / BASE_ANUAL) - 1;

export type FilaCronograma = {
  numeroCuota: number;
  fechaVencimiento: string;
  capital: string;
  interes: string;
  montoCuota: string;
  saldoRestante: string;
};

export type ResultadoCronograma = {
  cuotaFija: string;
  interesTotal: string;
  montoTotal: string;
  tasaPeriodoPorcentaje: number;
  cuotas: FilaCronograma[];
  avisoRedondeo: string | null;
};

export function centimosDeMonto(valor: string): number {
  if (!/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(valor)) {
    throw new Error('El monto debe tener como máximo dos decimales.');
  }
  const [entero, decimal = ''] = valor.split('.');
  const centimos = Number(entero) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(centimos) || centimos < 100 || centimos > LIMITE_CENTIMOS) {
    throw new Error('El monto debe estar entre S/ 1 y S/ 10 000.');
  }
  return centimos;
}

export function dinero(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

export function convertirFecha(fecha: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('La fecha debe utilizar AAAA-MM-DD.');
  const valor = new Date(`${fecha}T00:00:00.000Z`);
  if (!Number.isFinite(valor.getTime()) || valor.toISOString().slice(0, 10) !== fecha) {
    throw new Error('La fecha del préstamo no es válida.');
  }
  return valor;
}

export function generarCronograma(montoCentimos: number, plazoMeses: number, fecha: string): ResultadoCronograma {
  if (!Number.isSafeInteger(montoCentimos) || montoCentimos < 100 || montoCentimos > LIMITE_CENTIMOS) {
    throw new Error('El monto debe estar entre S/ 1 y S/ 10 000.');
  }
  if (!Number.isInteger(plazoMeses) || plazoMeses < 1 || plazoMeses > 60) {
    throw new Error('El plazo debe ser de 1 a 60 meses.');
  }
  const fechaBase = convertirFecha(fecha);
  const cuotaIdeal = montoCentimos * TASA_PERIODO / (1 - Math.pow(1 + TASA_PERIODO, -plazoMeses));
  const cuotaBase = Math.round(cuotaIdeal);
  if (cuotaBase <= 0) throw new Error('No fue posible calcular una cuota válida.');

  let saldoExacto = montoCentimos;
  let saldo = montoCentimos;
  let sumaIntereses = 0;
  let sumaCuotas = 0;
  const cuotas: FilaCronograma[] = [];
  for (let n = 1; n <= plazoMeses; n++) {
    // Calcular internamente sin redondear el saldo; redondear sólo valores monetarios mostrados.
    // Así también se admite S/ 1 con plazos largos sin cuotas de S/ 0.
    const interesExacto = saldoExacto * TASA_PERIODO;
    const amortizacionExacta = cuotaIdeal - interesExacto;
    saldoExacto = Math.max(0, saldoExacto - amortizacionExacta);
    // Reservar al menos S/ 0.01 para cada una de las cuotas restantes.
    // Evita amortizaciones en cero al simular S/ 1 con 60 cuotas.
    const restanteMinimo = plazoMeses - n;
    const siguienteSaldo = n === plazoMeses ? 0 : Math.min(saldo - 1, Math.max(restanteMinimo, Math.round(saldoExacto)));
    const amortizacion = saldo - siguienteSaldo;
    const interes = Math.round(interesExacto);
    const totalCuota = interes + amortizacion;
    saldo = siguienteSaldo;
    sumaIntereses += interes;
    sumaCuotas += totalCuota;

    const vencimiento = new Date(fechaBase.getTime());
    vencimiento.setUTCDate(vencimiento.getUTCDate() + DIAS_PERIODO * n);
    cuotas.push({
      numeroCuota: n,
      fechaVencimiento: vencimiento.toISOString().slice(0, 10),
      capital: dinero(amortizacion),
      interes: dinero(interes),
      montoCuota: dinero(totalCuota),
      saldoRestante: dinero(saldo),
    });
  }
  const maxDiferencia = Math.max(...cuotas.map(c => Math.abs(Math.round(Number(c.montoCuota) * 100) - cuotaBase)));
  return {
    cuotaFija: dinero(cuotaBase),
    interesTotal: dinero(sumaIntereses),
    montoTotal: dinero(sumaCuotas),
    tasaPeriodoPorcentaje: Number((TASA_PERIODO * 100).toFixed(8)),
    cuotas,
    avisoRedondeo: maxDiferencia > 1
      ? 'Por el redondeo a céntimos, la última cuota tiene un ajuste. Este efecto puede ser considerable en préstamos pequeños y plazos largos.'
      : null,
  };
}
