/**
 * Auditoría de estados del MVP, en una BD DE PRUEBAS independiente.
 * No crea, actualiza ni borra registros. No imprime DNI, RUC, nombres ni emails.
 * Uso PowerShell: $env:CONFIRMAR_BD_PRUEBAS='SI'; npx tsx src/scripts/auditoria-sprint1-solo-lectura.ts
 */
import 'dotenv/config';

if (process.env.CONFIRMAR_BD_PRUEBAS !== 'SI') {
  console.error('Bloqueado. Verifica que DATABASE_URL apunte exclusivamente a una BD de pruebas y establece CONFIRMAR_BD_PRUEBAS=SI.');
  process.exitCode = 1;
} else {
  const { prisma } = await import('../lib/prisma.js');
  const { evaluarPrestamo, estadoDeCliente, fechaPeru, centimos } = await import('../modules/prestamos/estados.js');
  try {
    const hoy = fechaPeru();
    const [clientes, empresas, prestamos] = await Promise.all([
      prisma.cliente.count(),
      prisma.empresa.count(),
      prisma.prestamo.findMany({
        select: {
          clienteId: true, estado: true, monto: true,
          cuotas: { select: { estado: true, fechaVencimiento: true, capital: true, montoCuota: true } },
        },
      }),
    ]);
    const prestamoEstados = { VIGENTE: 0, MOROSO: 0, EXTRAJUDICIAL: 0, LIQUIDADO: 0 };
    const clienteEstados = { SIN_PRESTAMOS: 0, SIN_DEUDA: 0, VIGENTE: 0, MOROSO: 0, EXTRAJUDICIAL: 0 };
    const clienteMap = new Map<string, Array<'VIGENTE'|'MOROSO'|'EXTRAJUDICIAL'|'LIQUIDADO'>>();
    let cuotasVencidas = 0, cuotasPagadas = 0, totalCuotas = 0;
    let capitalHistoricoCent = 0, capitalPendienteCent = 0, vencidoCent = 0;
    let incoherencias = 0;
    for (const p of prestamos) {
      const r = evaluarPrestamo(p, hoy);
      prestamoEstados[r.estadoCalculado]++;
      const estados = clienteMap.get(p.clienteId) ?? [];
      estados.push(r.estadoCalculado);
      clienteMap.set(p.clienteId, estados);
      capitalHistoricoCent += centimos(p.monto);
      capitalPendienteCent += r.capitalDeCuotasPendientesCentimos;
      cuotasVencidas += r.cuotasVencidas;
      vencidoCent += r.importeCuotasVencidasCentimos;
      totalCuotas += p.cuotas.length;
      cuotasPagadas += p.cuotas.filter(c=>c.estado==='PAGADA').length;
      if (p.estado==='CANCELADO' && p.cuotas.some(c=>c.estado!=='PAGADA')) incoherencias++;
      if (p.cuotas.length===0) incoherencias++;
    }
    clienteEstados.SIN_PRESTAMOS = Math.max(0,clientes-clienteMap.size);
    for (const statuses of clienteMap.values()) {
      const estado = estadoDeCliente(statuses);
      switch (estado) {
        case 'SIN_PRESTAMOS': clienteEstados.SIN_PRESTAMOS++; break;
        case 'SIN_DEUDA': clienteEstados.SIN_DEUDA++; break;
        case 'VIGENTE': clienteEstados.VIGENTE++; break;
        case 'MOROSO': clienteEstados.MOROSO++; break;
        case 'EXTRAJUDICIAL': clienteEstados.EXTRAJUDICIAL++; break;
        default: throw new Error('Estado de cliente inesperado');
      }
    }
    const soles = (valor: number) => `S/ ${(valor/100).toFixed(2)}`;
    console.log(JSON.stringify({
      fechaNegocioPeru: hoy,
      tipoReporte: 'SOLO_LECTURA_BD_DE_PRUEBAS',
      clientes, empresasRuc20: empresas, prestamos: prestamos.length, cuotas: totalCuotas,
      prestamoEstados, clienteEstados,
      cuotasVencidas, cuotasMarcadasPagadas: cuotasPagadas,
      capitalHistoricoColocado: soles(capitalHistoricoCent),
      capitalDeCuotasNoPagadas: soles(capitalPendienteCent),
      importeCuotasVencidas: soles(vencidoCent),
      posiblesIncoherencias: incoherencias,
      nota: 'Una cuota marcada PAGADA no demuestra un ingreso de caja: todavía no existe registro auditable de pagos. No es una prueba end-to-end del frontend ni del API.',
    },null,2));
  } catch (error) {
    console.error('No se pudo completar la auditoría de pruebas:', error instanceof Error ? error.message : 'error desconocido');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
