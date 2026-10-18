import { Router } from "express";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { createAccessToken } from "../../lib/tokens.js";
import { requireAuth } from "../../middleware/require-auth.js";

const router = Router();
const loginSchema = z.object({
  correo: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

// Limitación mínima para el MVP local. Para producción distribuida usar
// un limitador compartido (p. ej., Redis) o protección del proveedor.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function canAttempt(ip: string): boolean {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || now >= current.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}

router.post("/login", async (req, res, next) => {
  const ip = req.ip ?? "unknown";
  if (!canAttempt(ip)) {
    res.status(429).json({ message: "Demasiados intentos. Vuelve a intentarlo más tarde." });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ingresa un correo y una contraseña válidos." });
    return;
  }

  try {
    const correo = parsed.data.correo.toLowerCase();
    const trabajador = await prisma.trabajador.findUnique({
      where: { correo },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        passwordHash: true,
        activo: true,
        agencia: {
          select: { id: true, nombre: true, ciudad: true, activa: true },
        },
      },
    });

    const correcta = trabajador
      ? await compare(parsed.data.password, trabajador.passwordHash)
      : false;

    if (!trabajador || !correcta || !trabajador.activo || !trabajador.agencia.activa) {
      res.status(401).json({ message: "Credenciales incorrectas o acceso no autorizado." });
      return;
    }

    attempts.delete(ip);
    const token = await createAccessToken(trabajador.id);
    res.json({
      token,
      tokenType: "Bearer",
      expiresInSeconds: 7200,
      trabajador: {
        id: trabajador.id,
        nombres: trabajador.nombres,
        apellidos: trabajador.apellidos,
        correo: trabajador.correo,
        agencia: trabajador.agencia,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (_req, res) => {
  res.json({ trabajador: res.locals.trabajador });
});

export default router;
