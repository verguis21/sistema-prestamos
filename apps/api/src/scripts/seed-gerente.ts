import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.js";

async function main() {
  const correo = process.env.GERENTE_EMAIL?.trim().toLowerCase();
  const clave = process.env.GERENTE_PASSWORD;
  if (!correo || !/^\S+@\S+\.\S+$/.test(correo) || !clave || clave.length < 12) {
    throw new Error("Configura GERENTE_EMAIL y GERENTE_PASSWORD (12 caracteres minimo) en .env.");
  }
  const existente = await prisma.trabajador.findUnique({ where: { correo } });
  if (existente) {
    if (existente.rol !== "GERENTE") {
      throw new Error("El correo ya corresponde a un asesor. No se elevara su permiso automaticamente.");
    }
    console.log("Cuenta de gerente ya existente. No se modifico su contrasena.");
    return;
  }
  const agenciaReferencia = await prisma.agencia.findUnique({ where: { nombre: "Trujillo" } });
  if (!agenciaReferencia) throw new Error("Ejecuta primero seed-agencias para registrar Trujillo.");
  await prisma.trabajador.create({
    data: {
      nombres: "Gerente",
      apellidos: "General",
      correo,
      passwordHash: await hash(clave, 12),
      rol: "GERENTE",
      agenciaId: agenciaReferencia.id,
    },
  });
  console.log("Cuenta de GERENTE creada; inicia sesion con el correo configurado.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Error al crear gerente.");
    process.exitCode = 1;
  })
  .finally(async () => { await prisma.$disconnect(); });
