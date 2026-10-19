import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { crearRuc10DesdeDni, validarRuc20, documentoCorrespondeACliente } from '../modules/clientes/documentos.js';
function ruc20(base: string) {
  const factores = [5,4,3,2,7,6,5,4,3,2];
  const suma = [...base].reduce((acc,c,i)=>acc+Number(c)*factores[i],0);
  return base + ((11 - suma % 11) % 10);
}
test('RUC20 exige once dígitos, prefijo 20 y dígito correcto', () => {
  const valido = ruc20('2012345678');
  assert.equal(validarRuc20(valido), true);
  assert.equal(validarRuc20(valido.slice(0,10)+'x'), false);
  assert.equal(validarRuc20('20'), false);
  assert.equal(validarRuc20('10'+valido.slice(2)), false);
});
test('identidad de persona DNI/RUC10 no debe tratarse como RUC20', () => {
  const dni = '72871684';
  assert.equal(documentoCorrespondeACliente({ tipoDocumento: 'DNI', numeroDocumento: dni },
    { tipoDocumento: 'RUC10', numeroDocumento: crearRuc10DesdeDni(dni) }), true);
  assert.equal(documentoCorrespondeACliente({ tipoDocumento: 'DNI', numeroDocumento: dni },
    { tipoDocumento: 'DNI', numeroDocumento: '12345678' }), false);
});
