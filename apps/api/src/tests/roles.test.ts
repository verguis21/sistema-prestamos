import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import { requireRole } from "../middleware/require-role.js";

function ejecutar(rolActual: string | undefined, requerido: "ASESOR" | "GERENTE") {
  let status = 200;
  let nextCalled = false;
  let msg = "";
  const res = {
    locals: rolActual ? { trabajador: { rol: rolActual } } : {},
    status(code: number) { status = code; return this; },
    json(body: { message: string }) { msg = body.message; return this; },
  };
  requireRole(requerido)({} as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);
  return { status, nextCalled, msg };
}

test("asesor no puede consultar gerencia", () => {
  assert.equal(ejecutar("ASESOR", "GERENTE").status, 403);
});
test("gerente si puede consultar gerencia", () => {
  assert.equal(ejecutar("GERENTE", "GERENTE").nextCalled, true);
});
test("gerente no puede usar endpoints de asesor", () => {
  assert.equal(ejecutar("GERENTE", "ASESOR").status, 403);
});
test("una peticion sin identidad es rechazada", () => {
  assert.equal(ejecutar(undefined, "GERENTE").status, 401);
});
