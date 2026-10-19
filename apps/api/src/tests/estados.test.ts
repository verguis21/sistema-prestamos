import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { estadoDeCliente, estadoDeCuota, evaluarPrestamo, fechaPeru } from '../modules/prestamos/estados.js';

const pendiente = (fecha: string, estado: 'PENDIENTE'|'PAGADA' = 'PENDIENTE') =>
  ({ fechaVencimiento: fecha, estado, montoCuota: '120.00', capital: '95.00' });

test('cuota vencida al día siguiente de la fecha, no el día del vencimiento', () => {
  assert.equal(estadoDeCuota(pendiente('2026-10-18'), '2026-10-18'), 'PENDIENTE');
  assert.equal(estadoDeCuota(pendiente('2026-10-18'), '2026-10-19'), 'VENCIDA');
  assert.equal(estadoDeCuota(pendiente('2026-10-18','PAGADA'), '2027-10-19'), 'PAGADA');
});
test('cambia de moroso a vigente si todas las vencidas se pagan', () => {
  const deuda = { estado: 'ACTIVO' as const, cuotas: [pendiente('2026-09-18'), pendiente('2026-11-18')] };
  assert.equal(evaluarPrestamo(deuda, '2026-10-19').estadoCalculado, 'MOROSO');
  assert.equal(evaluarPrestamo({ ...deuda, cuotas: [pendiente('2026-09-18','PAGADA'), pendiente('2026-11-18')] }, '2026-10-19').estadoCalculado, 'VIGENTE');
});
test('extrajudicial al cumplirse 360 días desde la primera cuota impaga', () => {
  const p = { estado: 'ACTIVO' as const, cuotas: [pendiente('2025-10-19')] };
  assert.equal(evaluarPrestamo(p, '2026-10-13').estadoCalculado, 'MOROSO');
  assert.equal(evaluarPrestamo(p, '2026-10-14').estadoCalculado, 'EXTRAJUDICIAL');
});
test('cliente con varios préstamos muestra el estado de mayor riesgo', () => {
  assert.equal(estadoDeCliente(['LIQUIDADO','VIGENTE','MOROSO']), 'MOROSO');
  assert.equal(estadoDeCliente(['LIQUIDADO','EXTRAJUDICIAL']), 'EXTRAJUDICIAL');
  assert.equal(estadoDeCliente(['LIQUIDADO']), 'SIN_DEUDA');
  assert.equal(estadoDeCliente([]), 'SIN_PRESTAMOS');
});
test('capital y cuota vencida son dos importes diferentes', () => {
  const r = evaluarPrestamo({ estado:'ACTIVO', cuotas:[pendiente('2026-09-19'),pendiente('2026-12-19')] }, '2026-10-19');
  assert.equal(r.importeCuotasVencidasCentimos, 12000);
  assert.equal(r.capitalDeCuotasPendientesCentimos, 19000);
  assert.equal(r.cuotasVencidas, 1);
});
test('fecha peruana independiente del huso horario del servidor', () => {
  assert.equal(fechaPeru(new Date('2026-10-19T02:00:00Z')), '2026-10-18');
});
