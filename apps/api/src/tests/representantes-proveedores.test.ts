import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  normalizarRepresentantesRuc,
  proveedorRepresentantesConfigurado,
  consultarRepresentantesRuc,
} from '../modules/clientes/representantes.js';

test('interpreta representantes de ElRUC con campos reales y DNI conocido', () => {
  assert.deepEqual(normalizarRepresentantesRuc({ ruc: '20100113610', representantes: [
    { tipo_documento:'DNI',numero_documento:'12345678',nombre:'NOMBRE PRUEBA',cargo:'GERENTE',desde:'2026-09-01' },
  ] }), [{ dni:'12345678',nombreCompleto:'NOMBRE PRUEBA',cargo:'GERENTE',fechaDesde:'2026-09-01' }]);
});
test('permite mostrar nombre si proveedor oculta DNI, sin inventarlo', () => {
  assert.deepEqual(normalizarRepresentantesRuc({ representantes: [
    { tipo_documento:'DNI',numero_documento:'XXXXXXXX',nombre:'NOMBRE RESERVADO',cargo:'APODERADO',desde:'2026-01-01' },
  ] }), [{ dni:null,nombreCompleto:'NOMBRE RESERVADO',cargo:'APODERADO',fechaDesde:'2026-01-01' }]);
});
test('rechaza representantes con documento inválido o tipo incompatible', () => {
  assert.deepEqual(normalizarRepresentantesRuc({representantes:[
    {tipo_documento:'RUC',numero_documento:'20100113610',nombre:'PERSONA A'},
    {tipo_documento:'DNI',numero_documento:'123',nombre:'PERSONA B'},
  ]}), []);
});
test('selecciona proveedor gratuito con token, sin alterar configuración de ConsultasPerú', () => {
  const oldProvider = process.env.REPRESENTANTES_PROVIDER;
  const oldElruc = process.env.ELRUC_API_TOKEN;
  const oldConsultas = process.env.CONSULTASPERU_API_TOKEN;
  try {
    delete process.env.REPRESENTANTES_PROVIDER;
    process.env.ELRUC_API_TOKEN = 'token-falso-de-prueba';
    process.env.CONSULTASPERU_API_TOKEN = 'token-consultas-prueba';
    assert.equal(proveedorRepresentantesConfigurado(), 'ELRUC');
    process.env.REPRESENTANTES_PROVIDER = 'CONSULTASPERU';
    assert.equal(proveedorRepresentantesConfigurado(), 'CONSULTASPERU');
  } finally {
    if (oldProvider === undefined) delete process.env.REPRESENTANTES_PROVIDER; else process.env.REPRESENTANTES_PROVIDER = oldProvider;
    if (oldElruc === undefined) delete process.env.ELRUC_API_TOKEN; else process.env.ELRUC_API_TOKEN = oldElruc;
    if (oldConsultas === undefined) delete process.env.CONSULTASPERU_API_TOKEN; else process.env.CONSULTASPERU_API_TOKEN = oldConsultas;
  }
});
test('usa GET y Authorization Bearer en ElRUC sin filtrar el token a la interfaz', async () => {
  const oldProvider = process.env.REPRESENTANTES_PROVIDER;
  const oldElruc = process.env.ELRUC_API_TOKEN;
  const oldFetch = globalThis.fetch;
  try {
    process.env.REPRESENTANTES_PROVIDER = 'ELRUC';
    process.env.ELRUC_API_TOKEN = 'token-falso-de-prueba';
    let solicito = false;
    globalThis.fetch = (async (entrada, init) => {
      solicito = true;
      assert.equal(String(entrada), 'https://elruc.pe/api/v1/ruc/20100113610?incluir=representantes');
      assert.equal(init?.method, 'GET');
      assert.equal((init?.headers as Record<string,string>).Authorization, 'Bearer token-falso-de-prueba');
      return { ok:true, status:200, json:async()=>({ruc:'20100113610',representantes:[]}) } as Response;
    }) as typeof fetch;
    assert.deepEqual(await consultarRepresentantesRuc('20100113610'), []);
    assert.equal(solicito, true);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldProvider === undefined) delete process.env.REPRESENTANTES_PROVIDER; else process.env.REPRESENTANTES_PROVIDER = oldProvider;
    if (oldElruc === undefined) delete process.env.ELRUC_API_TOKEN; else process.env.ELRUC_API_TOKEN = oldElruc;
  }
});
