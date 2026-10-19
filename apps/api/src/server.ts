import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import authRouter from "./modules/auth/auth.routes.js";
import clientesRouter from "./modules/clientes/clientes.routes.js";
import empresasRouter from "./modules/clientes/empresas.routes.js";
import prestamosRouter from "./modules/prestamos/prestamos.routes.js";
import gerenciaRouter from "./modules/gerencia/gerencia.routes.js";
import { validateTokenConfig } from "./lib/tokens.js";

validateTokenConfig();

const app = express();
const allowedOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "API del Sistema de Préstamos funcionando" });
});

// Endpoint de diagnóstico local; antes de un despliegue público se puede
// restringir o retirar para no exponer información interna.
app.get("/api/health/db", async (_req, res) => {
  try {
    const totalAgencias = await prisma.agencia.count();
    res.json({ status: "ok", database: "connected", totalAgencias });
  } catch (error) {
    console.error("No se pudo consultar la base de datos:", error);
    res.status(503).json({ status: "error", message: "Base de datos no disponible" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/empresas", empresasRouter);
app.use("/api/prestamos", prestamosRouter);
app.use("/api/gerencia", gerenciaRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error de la API:", error);
  res.status(500).json({ message: "Error interno. Inténtalo más tarde." });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
