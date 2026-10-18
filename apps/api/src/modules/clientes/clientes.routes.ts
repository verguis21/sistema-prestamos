import { Router } from "express";
import { Prisma } from "../../../generated/prisma/client.js";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { ConsultaIdentidadError, obtenerDatosCliente } from "./decolecta.js";
import { documentosMismaPersona, validarNumero } from "./documentos.js";

const router = Router();
router.use(requireAuth);

const documentoSchema = z.object({
  tipoDocumento: z.enum(["DNI", "RUC10"]),
  numeroDocumento: z.string().trim().max(11),
});

// Para no agotar la cuota gratuita de la API con reintentos continuos.
const limite = new Map<string, { total: number; reinicio: number }>();
function permitirConsulta(trabajadorId: string): boolean {
  const ahora = Date.now();
  const previo = limite.get(trabajadorId);
  if (!previo || ahora > previo.reinicio) {
    limite.set(trabajadorId, { total: 1, reinicio: ahora + 60 * 60_000 });
    return true;
  }
  if (previo.total >= 30) return false;
  previo.total++;
  return true;
}

function extraerDocumento(datos: unknown) {
  const parsed = documentoSchema.safeParse(datos);
  if (!parsed.success) return { error: "Indica DNI de 8 dígitos o RUC 10 de 11 dígitos." } as const;
  const invalidacion = validarNumero(parsed.data.tipoDocumento, parsed.data.numeroDocumento);
  if (invalidacion) return { error: invalidacion } as const;
  return { documento: parsed.data } as const;
}

function errorConsulta(res: import("express").Response, error: unknown) {
  if (error instanceof ConsultaIdentidadError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  throw error;
}

// Primero consultar el registro central sin consumir llamadas de Decolecta.
// Buscar por documento completo nunca crea un cliente ni lo vincula a otra sucursal.
router.get("/existente", async (req, res, next) => {
  const entrada = extraerDocumento(req.query);
  if ("error" in entrada) { res.status(400).json({ message: entrada.error }); return; }
  try {
    const { tipoDocumento, numeroDocumento } = entrada.documento;
    const cliente = await prisma.cliente.findFirst({
      where: { numeroDocumento: { in: documentosMismaPersona(tipoDocumento, numeroDocumento) } },
      select: {
        id: true, tipoDocumento: true, numeroDocumento: true,
        nombres: true, apellidos: true, proveedorIdentidad: true,
        identidadVerificada: true, creadoEn: true,
      },
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ existe: Boolean(cliente), cliente });
  } catch (error) { next(error); }
});

router.get("/consulta", async (req, res, next) => {
  const entrada = extraerDocumento(req.query);
  if ("error" in entrada) { res.status(400).json({ message: entrada.error }); return; }
  const { tipoDocumento, numeroDocumento } = entrada.documento;
  if (!permitirConsulta(res.locals.trabajador.id)) {
    res.status(429).json({ message: "Demasiadas consultas en la última hora. Inténtalo después." });
    return;
  }
  try {
    const datos = await obtenerDatosCliente(tipoDocumento, numeroDocumento);
    res.setHeader("Cache-Control", "no-store");
    res.json({ datos });
  } catch (error) {
    try { errorConsulta(res, error); } catch (desconocido) { next(desconocido); }
  }
});

// Sólo se listan clientes vinculados o con préstamos en la agencia del asesor.
// Las operaciones en otra agencia no duplican la identidad global.
function visiblesEnAgencia(agenciaId: string): Prisma.ClienteWhereInput {
  return { OR: [
    { agenciasAtencion: { some: { agenciaId } } },
    { prestamos: { some: { agenciaId } } },
  ] };
}

// Búsqueda en la base de datos para seleccionar un cliente antes de otorgar préstamos.
// No llama a la API de identidad: evita gastar consultas del proveedor.
// El cliente se identifica por su id, aunque se encuentre por DNI o su RUC 10.
const buscarSchema = z.object({ q: z.string().trim().min(2).max(80) });

router.get("/buscar", async (req, res, next) => {
  const parsed = buscarSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Escribe al menos dos caracteres (máximo 80) para buscar un cliente." });
    return;
  }
  const q = parsed.data.q;
  const palabras = q.split(/\s+/).filter(Boolean).slice(0, 6);

  const porPalabras: Prisma.ClienteWhereInput = {
    AND: palabras.map(palabra => ({
      OR: [
        { nombres: { contains: palabra, mode: "insensitive" } },
        { apellidos: { contains: palabra, mode: "insensitive" } },
        { numeroDocumento: { contains: palabra } },
      ],
    })),
  };

  // Permite buscar por RUC 10 a una persona guardada con DNI y viceversa.
  // Solo se asocian documentos con estructura y dígito verificador válidos.
  const tipo = /^\d{8}$/.test(q) ? "DNI" : /^10\d{9}$/.test(q) ? "RUC10" : null;
  const equivalentes = tipo && !validarNumero(tipo, q) ? documentosMismaPersona(tipo, q) : [];
  const agenciaId: string = res.locals.trabajador.agencia.id;
  // Documento completo: consulta global para evitar duplicados y evaluar créditos.
  // Nombre o parte del documento: sólo clientes relacionados con esta agencia.
  const where: Prisma.ClienteWhereInput = equivalentes.length
    ? { numeroDocumento: { in: equivalentes } }
    : { AND: [visiblesEnAgencia(agenciaId), porPalabras] };

  try {
    const clientes = await prisma.cliente.findMany({
      where,
      take: 10,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
      select: {
        id: true, tipoDocumento: true, numeroDocumento: true,
        nombres: true, apellidos: true, proveedorIdentidad: true,
      },
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ clientes });
  } catch (error) { next(error); }
});

router.get("/", async (_req, res, next) => {
  try {
    const agenciaId: string = res.locals.trabajador.agencia.id;
    const clientes = await prisma.cliente.findMany({
      where: visiblesEnAgencia(agenciaId),
      orderBy: { creadoEn: "desc" },
      take: 50,
      select: {
        id: true, tipoDocumento: true, numeroDocumento: true,
        nombres: true, apellidos: true, proveedorIdentidad: true,
        identidadVerificada: true, creadoEn: true,
      },
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ clientes });
  } catch (error) { next(error); }
});

const guardarSchema = documentoSchema.extend({
  revisionPresencialConfirmada: z.literal(true),
});

router.post("/", async (req, res, next) => {
  const parsed = guardarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Indica un documento válido y confirma la revisión presencial del documento." });
    return;
  }
  const { tipoDocumento, numeroDocumento } = parsed.data;
  const invalidacion = validarNumero(tipoDocumento, numeroDocumento);
  if (invalidacion) { res.status(400).json({ message: invalidacion }); return; }
  try {
    const similares = documentosMismaPersona(tipoDocumento, numeroDocumento);
    const trabajador = res.locals.trabajador as { id: string; agencia: { id: string; nombre: string } };
    const duplicado = await prisma.cliente.findFirst({
      where: { numeroDocumento: { in: similares } },
      select: {
        id: true, tipoDocumento: true, numeroDocumento: true,
        nombres: true, apellidos: true, proveedorIdentidad: true,
        identidadVerificada: true, creadoEn: true,
      },
    });
    if (duplicado) {
      // El cliente se identifica una sola vez. Una simple consulta no es
      // atención ni operación; NO lo añadimos a otra agencia aquí.
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({
        cliente: duplicado,
        existente: true,
        message: "Cliente ya existente. Puedes continuar con un préstamo sin volver a registrarlo.",
      });
      return;
    }
    if (!permitirConsulta(res.locals.trabajador.id)) {
      res.status(429).json({ message: "Límite temporal de consultas alcanzado." });
      return;
    }
    // Reconsultar servidor a servidor: no confiamos en nombres editados desde React.
    const datos = await obtenerDatosCliente(tipoDocumento, numeroDocumento);
    const cliente = await prisma.cliente.create({
      data: {
        tipoDocumento,
        numeroDocumento,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        proveedorIdentidad: datos.proveedor,
        // Consultar nombres públicos NO equivale a verificar identidad con RENIEC.
        identidadVerificada: false,
        agenciasAtencion: {
          create: { agenciaId: trabajador.agencia.id, trabajadorId: trabajador.id },
        },
      },
      select: {
        id: true, tipoDocumento: true, numeroDocumento: true,
        nombres: true, apellidos: true, proveedorIdentidad: true,
        identidadVerificada: true, creadoEn: true,
      },
    });
    res.status(201).json({ cliente, message: "Cliente registrado en esta agencia con datos consultados. No equivale a verificación oficial de identidad." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "El documento ya está registrado." });
      return;
    }
    try { errorConsulta(res, error); } catch (desconocido) { next(desconocido); }
  }
});

export default router;
