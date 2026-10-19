import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { evaluarPrestamo, fechaPeru } from "../prestamos/estados.js";

const router = Router();
router.use(requireAuth, requireRole("GERENTE"));

function soles(valor: { toString(): string } | null | undefined): string {
  return Number(valor?.toString() ?? "0").toFixed(2);
}

router.get("/resumen", async (_req, res, next) => {
  try {
    const hoy = fechaPeru();
    // Un solo recorrido de créditos/cuotas evita N consultas por cliente y estados desactualizados.
    const [clientes, creditos] = await Promise.all([
      prisma.cliente.count(),
      prisma.prestamo.findMany({
        select: {
          id: true, clienteId: true, estado: true, monto: true, interesTotal: true,
          cuotas: { select: { fechaVencimiento: true, estado: true, montoCuota: true, capital: true, interes: true } },
        },
      }),
    ]);
    const resumenEstados = { VIGENTE: 0, MOROSO: 0, EXTRAJUDICIAL: 0, LIQUIDADO: 0 };
    const clientesEstados = new Map<string, Set<string>>();
    let capitalOtorgado = 0;
    let capitalOriginalActivo = 0;
    let interesesProgramados = 0;
    let capitalPendiente = 0;
    let interesesPendientes = 0;
    let capitalVencido = 0;
    let importeCuotasVencidas = 0;
    let capitalMoroso = 0;
    let capitalExtrajudicial = 0;
    let cuotasVencidas = 0;
    for (const prestamo of creditos) {
      const r = evaluarPrestamo(prestamo, hoy);
      resumenEstados[r.estadoCalculado]++;
      const conjunto = clientesEstados.get(prestamo.clienteId) ?? new Set<string>();
      conjunto.add(r.estadoCalculado);
      clientesEstados.set(prestamo.clienteId, conjunto);
      capitalOtorgado += Math.round(Number(prestamo.monto) * 100);
      interesesProgramados += Math.round(Number(prestamo.interesTotal) * 100);
      if (prestamo.estado === 'ACTIVO') capitalOriginalActivo += Math.round(Number(prestamo.monto) * 100);
      for (const cuota of prestamo.cuotas) {
        if (cuota.estado === 'PENDIENTE') {
          capitalPendiente += Math.round(Number(cuota.capital) * 100);
          interesesPendientes += Math.round(Number(cuota.interes) * 100);
          if ((cuota.fechaVencimiento instanceof Date ? cuota.fechaVencimiento.toISOString() : String(cuota.fechaVencimiento)).slice(0, 10) < hoy) {
            capitalVencido += Math.round(Number(cuota.capital) * 100);
          }
        }
      }
      importeCuotasVencidas += r.importeCuotasVencidasCentimos;
      cuotasVencidas += r.cuotasVencidas;
      if (r.estadoCalculado === 'MOROSO') capitalMoroso += r.capitalDeCuotasPendientesCentimos;
      if (r.estadoCalculado === 'EXTRAJUDICIAL') capitalExtrajudicial += r.capitalDeCuotasPendientesCentimos;
    }
    const clientesPorEstado = { VIGENTE: 0, MOROSO: 0, EXTRAJUDICIAL: 0, SIN_DEUDA: 0, SIN_PRESTAMOS: clientes - clientesEstados.size };
    for (const estados of clientesEstados.values()) {
      if (estados.has('EXTRAJUDICIAL')) clientesPorEstado.EXTRAJUDICIAL++;
      else if (estados.has('MOROSO')) clientesPorEstado.MOROSO++;
      else if (estados.has('VIGENTE')) clientesPorEstado.VIGENTE++;
      else clientesPorEstado.SIN_DEUDA++;
    }
    const sol = (centimos: number) => (centimos / 100).toFixed(2);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      fechaCorte: new Date().toISOString(), alcance: 'TODAS_LAS_AGENCIAS',
      clientesUnicos: clientes, prestamosRegistrados: creditos.length,
      prestamosActivos: resumenEstados.VIGENTE + resumenEstados.MOROSO + resumenEstados.EXTRAJUDICIAL,
      prestamosCancelados: resumenEstados.LIQUIDADO,
      prestamosPorEstado: resumenEstados, clientesPorEstado,
      cuotasVencidas, importeCuotasVencidas: sol(importeCuotasVencidas),
      capitalPendienteProgramado: sol(capitalPendiente),
      interesesPendientesProgramados: sol(interesesPendientes),
      capitalEnCuotasVencidas: sol(capitalVencido),
      capitalPrestamosMorosos: sol(capitalMoroso),
      capitalPrestamosExtrajudiciales: sol(capitalExtrajudicial),
      capitalOtorgadoHistorico: sol(capitalOtorgado),
      capitalComprometidoSinAmortizar: sol(capitalOriginalActivo),
      interesesProgramadosNoCobrados: sol(interesesProgramados),
      pagosRecibidos: null, beneficioNeto: null,
      reglaExtrajudicial: '360 días desde la primera cuota vencida impaga — criterio académico pendiente de confirmación',
      nota: 'Los importes se calculan con las cuotas no pagadas registradas. No incluyen mora adicional ni equivalen a ingresos cobrados o pérdidas contables.',
    });
  } catch (error) { next(error); }
});

export default router;
