import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

// Uso excepcional de mantenimiento para clientes creados antes de registrar agencias.
// Se debe comprobar el origen real del cliente antes de vincularlo; NO infiere sucursal.
async function main() {
  const clienteId = process.env.CLIENTE_ANTERIOR_ID?.trim();
  const correo = process.env.ASESOR_ORIGEN_CORREO?.trim();
  if (!clienteId || !correo) throw new Error('Indica CLIENTE_ANTERIOR_ID y ASESOR_ORIGEN_CORREO.');

  const [cliente, trabajador] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }),
    prisma.trabajador.findUnique({
      where: { correo },
      select: { id: true, activo: true, agencia: { select: { id: true, nombre: true, activa: true } } },
    }),
  ]);
  if (!cliente) throw new Error('No existe ese cliente.');
  if (!trabajador?.activo || !trabajador.agencia.activa) throw new Error('Trabajador de origen inexistente o inactivo.');

  const vinculo = await prisma.clienteAgencia.upsert({
    where: { clienteId_agenciaId: { clienteId, agenciaId: trabajador.agencia.id } },
    create: { clienteId, agenciaId: trabajador.agencia.id, trabajadorId: trabajador.id },
    update: {},
  });
  console.log('Cliente anterior asociado a la agencia verificada:', trabajador.agencia.nombre);
  console.log('Asociación creada o previamente existente:', vinculo.agenciaId);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
