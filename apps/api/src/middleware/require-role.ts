import type { RequestHandler } from "express";
import type { RolTrabajador } from "../../generated/prisma/client.js";

// Debe ejecutarse despues de requireAuth. No confiar en el rol enviado por React.
export function requireRole(rol: RolTrabajador): RequestHandler {
  return (_req, res, next) => {
    if (!res.locals.trabajador) {
      res.status(401).json({ message: "Debes iniciar sesion." });
      return;
    }
    if (res.locals.trabajador.rol !== rol) {
      res.status(403).json({ message: "No tienes permiso para consultar este modulo." });
      return;
    }
    next();
  };
}
