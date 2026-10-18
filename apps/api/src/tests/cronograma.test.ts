import assert from 'node:assert/strict';
import test from 'node:test';
import { centimosDeMonto, generarCronograma, TASA_PERIODO, convertirFecha } from '../modules/prestamos/calculo.js';

test('TEA 30 % equivalente a 30/360 y cuota de 12 meses', () => {
  assert.ok(Math.abs(TASA_PERIODO - (Math.pow(1.3, 1 / 12) - 1)) < 1e-12);
  const c = generarCronograma(100_000, 12, '2026-10-16');
  assert.equal(c.cuotaFija, '95.79');
  assert.equal(c.cuotas.length, 12);
  assert.equal(c.cuotas[0].fechaVencimiento, '2026-11-15');
  assert.equal(c.cuotas[1].fechaVencimiento, '2026-12-15');
  assert.equal(c.cuotas[11].saldoRestante, '0.00');
  assert.equal(c.cuotas.reduce((sum, f) => sum + Math.round(Number(f.capital) * 100), 0), 100_000);
  assert.equal(c.cuotas.reduce((sum, f) => sum + Math.round(Number(f.montoCuota) * 100), 0), Math.round(Number(c.montoTotal) * 100));
});

test('Vencimientos exactamente cada 30 días, incluso tras febrero', () => {
  const c = generarCronograma(500_00, 5, '2028-01-31');
  for (let i=0;i<c.cuotas.length;i++) {
    const d = convertirFecha(c.cuotas[i].fechaVencimiento);
    assert.equal((d.getTime()-convertirFecha('2028-01-31').getTime())/86400000, (i+1)*30);
  }
});

test('No permite datos fuera de reglas y maneja préstamo mínimo', () => {
  assert.equal(centimosDeMonto('1'), 100);
  assert.throws(() => centimosDeMonto('10000.01'));
  assert.throws(() => centimosDeMonto('1.001'));
  assert.throws(() => generarCronograma(100, 0, '2026-10-16'));
  assert.throws(() => generarCronograma(100, 61, '2026-10-16'));
  assert.throws(() => convertirFecha('2026-02-30'));
  assert.equal(generarCronograma(100, 12, '2026-10-16').cuotas.at(-1)?.saldoRestante, '0.00');
  const minimo = generarCronograma(100, 60, '2026-10-16');
  assert.equal(minimo.cuotas.length, 60);
  assert.equal(minimo.cuotas.at(-1)?.saldoRestante, '0.00');
  assert.ok(minimo.cuotas.every(f => Number(f.capital) >= 0.01));
  const largo = generarCronograma(100_000, 24, '2026-10-16');
  assert.equal(largo.cuotaFija, '54.14');
});
