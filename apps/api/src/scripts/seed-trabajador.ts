
import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.js";

async function main() {
  const correo = process.env.SEED_WORKER_EMAIL;
  const password = process.env.SEED_WORKER_PASSWORD;

  if (!correo || !password || password.length < 12) {
    throw new Error(
      "Configura correo y contraseña de al menos 12 caracteres."
    );
  }

  const agencia = await prisma.agencia.findUnique({
    where: { nombre: "Trujillo" },
  });

  if (!agencia) {
    throw new Error("La agencia Trujillo no existe.");
  }

  const existente = await prisma.trabajador.findUnique({
    where: { correo },
  });

  if (existente) {
    console.log("El trabajador de prueba ya existe.");
    return;
  }

  const passwordHash = await hash(password, 12);

  const trabajador = await prisma.trabajador.create({
    data: {
      nombres: "Asesor",
      apellidos: "Prueba",
      correo,
      passwordHash,
      agenciaId: agencia.id,
    },
  });

  console.log("Trabajador creado correctamente.");
  console.log("ID:", trabajador.id);
  console.log("Agencia:", agencia.nombre);
}

main()
  .catch((error) => {
    console.error("Error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
