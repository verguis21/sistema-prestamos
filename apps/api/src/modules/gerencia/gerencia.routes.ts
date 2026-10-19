import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";

const router = Router();
router.use(requireAuth, requireRole("GERENTE"));

function soles(valor: { toString(): string } | null | undefined): string {
  return Number(valor?.toString() ?? "0").toFixed(2);
}

router.get("/resumen", async (_req, res, next) => {
  try {
    // Datos globales, SIN filtrar por agencia. No confundir saldos teóricos con caja recibida.
    const [clientes, prestamos, prestamosActivos, prestamosCancelados, capitalTotal, capitalActivo, interesesProgramados] =
      await prisma.$transaction([
        prisma.cliente.count(),
        prisma.prestamo.count(),
        prisma.prestamo.count({ where: { estado: "ACTIVO" } }),
        prisma.prestamo.count({ where: { estado: "CANCELADO" } }),
        prisma.prestamo.aggregate({ _sum: { monto: true } }),
        prisma.prestamo.aggregate({ where: { estado: "ACTIVO" }, _sum: { monto: true } }),
        prisma.prestamo.aggregate({ _sum: { interesTotal: true } }),
      ]);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      fechaCorte: new Date().toISOString(),
      alcance: "TODAS_LAS_AGENCIAS",
      clientesUnicos: clientes,
      prestamosRegistrados: prestamos,
      prestamosActivos,
      prestamosCancelados,
      capitalOtorgadoHistorico: soles(capitalTotal._sum.monto),
      capitalComprometidoSinAmortizar: soles(capitalActivo._sum.monto),
      interesesProgramadosNoCobrados: soles(interesesProgramados._sum.interesTotal),
      // Estos montos no son 0: aun NO se almacenan pagos ni gastos.
      pagosRecibidos: null,
      morosidadConfirmada: null,
      carteraExtrajudicial: null,
      beneficioNeto: null,
      nota: "El capital comprometido suma los capitales originales de creditos activos. No descuenta cuotas pagadas fuera del sistema.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
