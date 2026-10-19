// Pruebas deterministas del motor real del proyecto; no usan BD, mocks de API ni cambian registros.
// Node 24+ permite importar .ts por borrado de tipos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoDeCuota, evaluarPrestamo, estadoDeCliente, fechaPeru, diasTranscurridos,
} from '../src/modules/prestamos/estados.ts';
import {
  generarCronograma, centimosDeMonto, TASA_PERIODO, convertirFecha,
} from '../src/modules/prestamos/calculo.ts';

const cuota = (vencimiento, estado = 'PENDIENTE', capital = '90.00', interes = '10.00') => ({
  fechaVencimiento: vencimiento,
  estado,
  montoCuota: (Number(capital) + Number(interes)).toFixed(2),
  capital,
});
const credito = (...cuotas) => ({ estado: 'ACTIVO', cuotas });

test('la cuota no vence durante su propio día de vencimiento', () => {
  assert.equal(estadoDeCuota(cuota('2026-10-19'), '2026-10-19'), 'PENDIENTE');
  assert.equal(estadoDeCuota(cuota('2026-10-19'), '2026-10-20'), 'VENCIDA');
});

test('una cuota guardada como pagada nunca figura vencida por la fecha', () => {
  assert.equal(estadoDeCuota(cuota('2025-01-01','PAGADA'), '2026-10-19'), 'PAGADA');
});

test('un crédito nuevo sin cuotas vencidas figura vigente', () => {
  const r = evaluarPrestamo(credito(cuota('2026-10-19'), cuota('2026-11-18')), '2026-10-19');
  assert.equal(r.estadoCalculado, 'VIGENTE');
  assert.equal(r.cuotasVencidas, 0);
});

test('una cuota vencida impaga vuelve moroso el crédito y al cliente', () => {
  const r = evaluarPrestamo(credito(cuota('2026-10-18'), cuota('2026-11-17')), '2026-10-19');
  assert.equal(r.estadoCalculado, 'MOROSO');
  assert.equal(estadoDeCliente(['VIGENTE',r.estadoCalculado]), 'MOROSO');
  assert.equal(r.cuotasVencidas, 1);
  assert.equal(r.importeCuotasVencidasCentimos, 10_000);
  assert.equal(r.capitalDeCuotasPendientesCentimos, 18_000);
});

test('estado extrajudicial exactamente al umbral PROVISIONAL de 360 días', () => {
  const desde = '2025-10-24';
  assert.equal(diasTranscurridos(desde, '2026-10-18'), 359);
  assert.equal(diasTranscurridos(desde, '2026-10-19'), 360);
  assert.equal(evaluarPrestamo(credito(cuota(desde)), '2026-10-18').estadoCalculado, 'MOROSO');
  assert.equal(evaluarPrestamo(credito(cuota(desde)), '2026-10-19').estadoCalculado, 'EXTRAJUDICIAL');
});

test('se evalúa desde la cuota vencida IMPAGA más antigua, no desde una pagada', () => {
  const r = evaluarPrestamo(credito(cuota('2025-01-01','PAGADA'), cuota('2026-10-01')), '2026-10-19');
  assert.equal(r.estadoCalculado, 'MOROSO');
  assert.equal(r.primeraCuotaImpaga, '2026-10-01');
  assert.equal(r.diasMora, 18);
});

test('varios préstamos del mismo cliente: prevalece el riesgo más alto', () => {
  assert.equal(estadoDeCliente(['VIGENTE','MOROSO','LIQUIDADO']), 'MOROSO');
  assert.equal(estadoDeCliente(['VIGENTE','EXTRAJUDICIAL','MOROSO']), 'EXTRAJUDICIAL');
  assert.equal(estadoDeCliente(['LIQUIDADO']), 'SIN_DEUDA');
  assert.equal(estadoDeCliente([]), 'SIN_PRESTAMOS');
});

test('la regularización cambia la clasificación solo cuando el dato de cuota dice PAGADA', () => {
  const impaga = credito(cuota('2026-10-01'), cuota('2026-11-01'));
  const marcadaPagada = credito(cuota('2026-10-01','PAGADA'), cuota('2026-11-01'));
  assert.equal(evaluarPrestamo(impaga,'2026-10-19').estadoCalculado,'MOROSO');
  assert.equal(evaluarPrestamo(marcadaPagada,'2026-10-19').estadoCalculado,'VIGENTE');
  // Esta prueba comprueba una función; NO constituye un pago registrado ni un módulo de caja.
});

test('al estar todas las cuotas pagadas, se clasifica LIQUIDADO', () => {
  const r = evaluarPrestamo(credito(cuota('2026-09-01','PAGADA'),cuota('2026-10-01','PAGADA')),'2026-10-19');
  assert.equal(r.estadoCalculado,'LIQUIDADO');
  assert.equal(r.capitalDeCuotasPendientesCentimos,0);
});

test('fecha de negocio en Perú incluso cerca de medianoche UTC', () => {
  assert.equal(fechaPeru(new Date('2026-10-19T03:00:00.000Z')),'2026-10-18');
  assert.equal(fechaPeru(new Date('2026-10-19T05:01:00.000Z')),'2026-10-19');
});

test('TEA 30% 30/360 mantiene tasa y capital exacto en 12 cuotas', () => {
  assert.ok(Math.abs(TASA_PERIODO - (Math.pow(1.3,1/12)-1)) < 1e-12);
  const r=generarCronograma(100_000,12,'2026-10-19');
  assert.equal(r.cuotaFija,'95.79');
  assert.equal(r.cuotas.length,12);
  assert.equal(r.cuotas.at(-1).saldoRestante,'0.00');
  assert.equal(r.cuotas.reduce((s,c)=>s+Math.round(Number(c.capital)*100),0),100_000);
});

test('cada vencimiento ocurre exactamente cada 30 días, incluido año bisiesto',()=>{
  const origen='2028-01-31';
  const r=generarCronograma(120_000,12,origen);
  for(const [i,f] of r.cuotas.entries()){
    const dias=(convertirFecha(f.fechaVencimiento)-convertirFecha(origen))/86400000;
    assert.equal(dias,30*(i+1));
  }
});

test('mínimo S/1 y máximo S/10 000 admitidos; rechaza exceder el límite unitario',()=>{
  assert.equal(centimosDeMonto('1'),100);
  assert.equal(centimosDeMonto('10000'),1_000_000);
  assert.throws(()=>centimosDeMonto('10000.01'));
  assert.throws(()=>centimosDeMonto('0.99'));
});

test('60 cuotas pequeñas no generan amortizaciones negativas ni saldo residual',()=>{
  const r=generarCronograma(100,60,'2026-10-19');
  assert.equal(r.cuotas.length,60);
  assert.equal(r.cuotas.at(-1).saldoRestante,'0.00');
  assert.ok(r.cuotas.every(c=>Number(c.capital)>=0.01));
});
