import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizarRepresentantesRuc } from '../modules/clientes/representantes.js';
import { moraAcademicaInformativa } from '../modules/prestamos/mora-referencial.js';

test('extrae representantes sin inventar datos ni permitir documento ajeno al DNI', () => {
  const registros = normalizarRepresentantesRuc({ success:true, data: [
    { tipo_documento: 'DNI', numero_documento: '12345678', nombres: 'PERSONA DE PRUEBA', cargo: 'GERENTE', fecha_desde: '2026-01-01' },
    { tipo_documento: 'RUC', numero_documento: '20123456789', nombres: 'OTRO' },
    { tipo_documento: 'DNI', numero_documento: '12345678', nombres: 'DUPLICADO' },
    { tipo_documento: 'DNI', numero_documento: '12', nombres: 'ERROR' },
  ] });
  assert.deepEqual(registros, [{ dni: '12345678', nombreCompleto: 'PERSONA DE PRUEBA', cargo: 'GERENTE', fechaDesde: '2026-01-01' }]);
});
test('no supone representantes si la API devuelve formato distinto', () => {
  assert.deepEqual(normalizarRepresentantesRuc({ data: { razon_social: 'EJEMPLO' }}), []);
});
test('mora referencial: 1 % diario solo capital vencido, no cuota completa ni capital restante', () => {
  const cuotas = [
    { estado:'PENDIENTE' as const, fechaVencimiento:'2026-10-14', capital:'80.00', montoCuota:'100.00' },
    { estado:'PENDIENTE' as const, fechaVencimiento:'2026-11-14', capital:'85.00', montoCuota:'100.00' },
  ];
  const salida = moraAcademicaInformativa(cuotas, '2026-10-19', 0.01);
  assert.equal(salida.capitalVencidoCentimos, 8000);
  assert.equal(salida.moraReferencialCentimos, 400); // S/ 80 * 1% * 5 días
  assert.equal(salida.modalidad, 'PRUEBA_NO_COBRABLE');
});
test('si el vencimiento es hoy no se genera mora', () => {
  const salida = moraAcademicaInformativa([{ estado:'PENDIENTE', fechaVencimiento:'2026-10-19', capital:'100', montoCuota:'110' }], '2026-10-19', 0.01);
  assert.equal(salida.capitalVencidoCentimos, 0);
  assert.equal(salida.moraReferencialCentimos, 0);
});
test('una cuota pagada no genera mora', () => {
  const salida = moraAcademicaInformativa([{ estado:'PAGADA', fechaVencimiento:'2026-10-01', capital:'100', montoCuota:'110' }], '2026-10-19', 0.01);
  assert.equal(salida.moraReferencialCentimos, 0);
});
