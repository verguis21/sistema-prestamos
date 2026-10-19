// Actualización 18: verifica el motor auténtico; NO cambia la tasa ni accede a la BD.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TEA, DIAS_PERIODO, BASE_ANUAL, TASA_PERIODO, generarCronograma } from '../src/modules/prestamos/calculo.ts';

const cuotaFrancesa = (capital, tasa, n) => capital * tasa / (1 - Math.pow(1 + tasa, -n));

test('30 % TEA equivale a 2.210445 % por 30/360, no a 2.5 %', () => {
  const correcta = Math.pow(1 + TEA, DIAS_PERIODO / BASE_ANUAL) - 1;
  assert.ok(Math.abs(TASA_PERIODO - correcta) < 1e-12);
  assert.ok(Math.abs(TASA_PERIODO * 100 - 2.21044505936) < 1e-8);
  assert.notEqual(TASA_PERIODO, TEA / 12);
});

test('caso web S/ 100 en 24 cuotas: la diferencia NO es TCEA', () => {
  const motor = generarCronograma(10_000, 24, '2026-10-19');
  assert.equal(motor.cuotaFija, '5.41');
  assert.equal(motor.interesTotal, '29.94');
  assert.equal(motor.montoTotal, '129.94');
  const webNominal = cuotaFrancesa(100, .30 / 12, 24);
  assert.ok(Math.abs(webNominal - 5.591282036) < 1e-7);
  assert.equal((webNominal * 24).toFixed(2), '134.19');
  assert.ok(Math.abs(cuotaFrancesa(100, TASA_PERIODO, 24) - 5.41398862365) < 1e-7);
});

test('30% nominal capitalizable cada mes implica TEA aproximadamente 34.49%', () => {
  const efectiva = Math.pow(1 + .30 / 12, 12) - 1;
  assert.equal((efectiva * 100).toFixed(2), '34.49');
});

test('cronograma real conserva capital, céntimos y saldo final sin migraciones', () => {
  const casos = [[10_000,24], [100_000,12], [1_000_000,60]];
  for (const [capital, plazo] of casos) {
    const r = generarCronograma(capital,plazo,'2026-10-19');
    assert.equal(r.cuotas.length, plazo);
    assert.equal(r.cuotas.at(-1).saldoRestante, '0.00');
    assert.equal(r.cuotas.reduce((t,f)=>t+Math.round(Number(f.capital)*100),0),capital);
    assert.equal(r.cuotas.reduce((t,f)=>t+Math.round(Number(f.montoCuota)*100),0),Math.round(Number(r.montoTotal)*100));
    assert.equal(r.cuotas.reduce((t,f)=>t+Math.round(Number(f.interes)*100),0),Math.round(Number(r.interesTotal)*100));
    assert.ok(r.cuotas.every(f=> Math.round(Number(f.montoCuota)*100) === Math.round(Number(f.capital)*100) + Math.round(Number(f.interes)*100)));
  }
});

test('el interés de la primera cuota se obtiene de la TEA, no de la TCEA', () => {
  const r = generarCronograma(10_000,24,'2026-10-19');
  assert.equal(r.cuotas[0].interes, '2.21');
  assert.equal(r.cuotas[0].capital, '3.20');
});
