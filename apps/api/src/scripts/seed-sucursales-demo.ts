/**
 * Crea cuentas de DEMOSTRACION para cuatro agencias.
 * - No altera el trabajador ya existente de Trujillo.
 * - No cambia contraseñas ni agencias de trabajadores existentes.
 * - Solo se ejecuta manualmente con ENABLE_DEMO_SEED=true.
 * - Nunca muestra contraseñas en la terminal.
 *
 * Uso: npx tsx src/scripts/seed-sucursales-demo.ts
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.js";

type SucursalDemo = {
  nombre: string;
  correo: string;
  variablePassword: string;
};

const sucursales: SucursalDemo[] = [
  {
    nombre: "Chimbote",
    correo: "asesor.chimbote@example.com",
    variablePassword: "DEMO_CHIMBOTE_PASSWORD",
  },
  {
    nombre: "Chiclayo",
    correo: "asesor.chiclayo@example.com",
    variablePassword: "DEMO_CHICLAYO_PASSWORD",
  },
  {
    nombre: "Piura",
    correo: "asesor.piura@example.com",
    variablePassword: "DEMO_PIURA_PASSWORD",
  },
  {
    nombre: "Tumbes",
    correo: "asesor.tumbes@example.com",
    variablePassword: "DEMO_TUMBES_PASSWORD",
  },
];

async function main() {
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    throw new Error("Para crear cuentas de prueba configura ENABLE_DEMO_SEED=true en .env.");
  }

  // Validamos todas las contraseñas ANTES de crear el primer trabajador.
  for (const sucursal of sucursales) {
    const password = process.env[sucursal.variablePassword];
    if (!password || password.length < 12 || /REEMPLAZA|CAMBIAR|PASSWORD|CONTRASENA/i.test(password)) {
      throw new Error(
        `Configura ${sucursal.variablePassword} con una contraseña distinta de al menos 12 caracteres.`
      );
    }
  }

  const contrasenas = sucursales.map((s) => process.env[s.variablePassword]!);
  if (new Set(contrasenas).size !== contrasenas.length) {
    throw new Error("Utiliza una contraseña diferente para cada sucursal.");
  }

  // Comprobación previa: no sobrescribir trabajadores ni asignaciones existentes.
  for (const sucursal of sucursales) {
    const agencia = await prisma.agencia.findUnique({ where: { nombre: sucursal.nombre } });
    if (!agencia || !agencia.activa) {
      throw new Error(`La agencia ${sucursal.nombre} no existe o está inactiva.`);
    }
    const existente = await prisma.trabajador.findUnique({ where: { correo: sucursal.correo } });
    if (existente && existente.agenciaId !== agencia.id) {
      throw new Error(
        `El correo de ${sucursal.nombre} ya está asociado a otra agencia. Revisa antes de continuar.`
      );
    }
  }

  for (const sucursal of sucursales) {
    const agencia = await prisma.agencia.findUniqueOrThrow({
      where: { nombre: sucursal.nombre },
    });

    const existente = await prisma.trabajador.findUnique({
      where: { correo: sucursal.correo },
    });

    if (existente) {
      console.log(
        `${sucursal.nombre}: el usuario ${sucursal.correo} ya existe. No se modificó su contraseña ni su asignación.`
      );
      continue;
    }

    const passwordHash = await hash(process.env[sucursal.variablePassword]!, 12);
    await prisma.trabajador.create({
      data: {
        nombres: "Asesor",
        apellidos: `Demo ${sucursal.nombre}`,
        correo: sucursal.correo,
        passwordHash,
        agenciaId: agencia.id,
      },
    });
    console.log(`${sucursal.nombre}: trabajador de demostración creado (${sucursal.correo}).`);
  }

  console.log("Finalizado. Trujillo no se modificó. Prueba cada cuenta desde el login.");
}

main()
  .catch((error: unknown) => {
    console.error("No se completó la preparación de sucursales:",
      error instanceof Error ? error.message : "Error desconocido");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
