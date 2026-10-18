import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { readAccessToken } from "../lib/tokens.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Debes iniciar sesión" });
    return;
  }

  try {
    const trabajadorId = await readAccessToken(authorization.slice(7));
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        activo: true,
        agencia: { select: { id: true, nombre: true, ciudad: true, activa: true } },
      },
    });

    if (!trabajador?.activo || !trabajador.agencia.activa) {
      res.status(401).json({ message: "Sesión no autorizada" });
      return;
    }

    res.locals.trabajador = {
      id: trabajador.id,
      nombres: trabajador.nombres,
      apellidos: trabajador.apellidos,
      correo: trabajador.correo,
      agencia: {
        id: trabajador.agencia.id,
        nombre: trabajador.agencia.nombre,
        ciudad: trabajador.agencia.ciudad,
      },
    };
    next();
  } catch (error) {
    if (error instanceof Error && /JWT_SECRET/.test(error.message)) {
      next(error);
      return;
    }
    res.status(401).json({ message: "Sesión inválida o vencida" });
  }
};
