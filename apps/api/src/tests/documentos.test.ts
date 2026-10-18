import test from "node:test";
import assert from "node:assert/strict";
import { crearRuc10DesdeDni, validarNumero, documentosMismaPersona, documentoCorrespondeACliente } from "../modules/clientes/documentos.js";

test("DNI: ocho dígitos numéricos", () => {
  assert.equal(validarNumero("DNI", "00012345"), null);
  assert.ok(validarNumero("DNI", "1234567"));
  assert.ok(validarNumero("DNI", "123456789"));
  assert.ok(validarNumero("DNI", "1234567A"));
});

test("RUC 10: once dígitos con dígito verificador SUNAT", () => {
  assert.equal(crearRuc10DesdeDni("46027897"), "10460278975");
  assert.equal(validarNumero("RUC10", "10460278975"), null);
  assert.ok(validarNumero("RUC10", "10460278976"));
  assert.ok(validarNumero("RUC10", "20601030013"));
  assert.ok(validarNumero("RUC10", "104602789750"));
});

test("DNI y RUC 10 vinculan a una misma persona", () => {
  assert.deepEqual(documentosMismaPersona("DNI", "46027897"), ["46027897", "10460278975"]);
  assert.deepEqual(documentosMismaPersona("RUC10", "10460278975"), ["10460278975", "46027897"]);
});

test("Puede tramitar préstamo con DNI o RUC 10 y mantener un único cliente", () => {
  const cliente = { tipoDocumento: 'DNI' as const, numeroDocumento: '46027897' };
  assert.equal(documentoCorrespondeACliente(cliente, { tipoDocumento: 'DNI', numeroDocumento: '46027897' }), true);
  assert.equal(documentoCorrespondeACliente(cliente, { tipoDocumento: 'RUC10', numeroDocumento: '10460278975' }), true);
  assert.equal(documentoCorrespondeACliente(cliente, { tipoDocumento: 'DNI', numeroDocumento: '00000001' }), false);
  assert.equal(documentoCorrespondeACliente(cliente, { tipoDocumento: 'RUC10', numeroDocumento: '10460278976' }), false);
});

test("Si la ficha se creó con RUC 10, también acepta el DNI de su titular", () => {
  const cliente = { tipoDocumento: 'RUC10' as const, numeroDocumento: '10460278975' };
  assert.equal(documentoCorrespondeACliente(cliente, { tipoDocumento: 'DNI', numeroDocumento: '46027897' }), true);
});
