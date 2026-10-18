
import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const agencias = [
  { nombre: "Chimbote", ciudad: "Chimbote" },
  { nombre: "Trujillo", ciudad: "Trujillo" },
  { nombre: "Chiclayo", ciudad: "Chiclayo" },
  { nombre: "Piura", ciudad: "Piura" },
  { nombre: "Tumbes", ciudad: "Tumbes" },
];

async function main() {
  console.log("Registrando agencias...");

  for (const agencia of agencias) {
    const resultado = await prisma.agencia.upsert({
      where: { nombre: agencia.nombre },
      update: { ciudad: agencia.ciudad },
      create: agencia,
    });

    console.log(`Agencia registrada: ${resultado.nombre}`);
  }

  const total = await prisma.agencia.count();

  console.log(`Total de agencias: ${total}`);
  console.log("Proceso finalizado.");
}

main()
  .catch((error) => {
    console.error("Error registrando agencias:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
