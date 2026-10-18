import { Router } from 'express';
import { documentoCorrespondeACliente } from '../clientes/documentos.js';
import { z } from 'zod';
import type { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { centimosDeMonto, convertirFecha, dinero, generarCronograma, LIMITE_CENTIMOS } from './calculo.js';

const router = Router();
router.use(requireAuth);

const solicitud = z.object({
  clienteId: z.string().uuid(),
  monto: z.string().trim(),
  plazoMeses: z.number().int().min(1).max(60),
  fechaPrestamo: z.string(),
  tipoDocumentoOperacion: z.enum(['DNI', 'RUC10']),
  numeroDocumentoOperacion: z.string().trim().min(8).max(11),
}).strict();

class ReglaNegocioError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

function interpretar(body: unknown) {
  const parsed = solicitud.safeParse(body);
  if (!parsed.success) throw new ReglaNegocioError(400, 'Indica un cliente, monto, fecha y plazo válidos (1 a 60 meses).');
  try {
    const montoCentimos = centimosDeMonto(parsed.data.monto);
    const fecha = convertirFecha(parsed.data.fechaPrestamo);
    return { ...parsed.data, montoCentimos, fecha };
  } catch (error) {
    throw new ReglaNegocioError(400, error instanceof Error ? error.message : 'Datos inválidos.');
  }
}

async function capitalComprometido(clienteId: string, cliente: Pick<typeof prisma, 'prestamo' | 'cliente'>) {
  const resultado = await cliente.prestamo.aggregate({
    where: { clienteId, estado: 'ACTIVO' }, _sum: { monto: true },
  });
  // Sprint 1: sin pagos, se compromete íntegramente el monto de cada préstamo activo.
  return Math.round(Number(resultado._sum.monto ?? 0) * 100);
}

async function comprobarCliente(clienteId: string, cliente: Pick<typeof prisma, 'prestamo' | 'cliente'>) {
  const existente = await cliente.cliente.findUnique({
    where: { id: clienteId }, select: { id: true, nombres: true, apellidos: true, tipoDocumento: true,
      numeroDocumento: true, proveedorIdentidad: true },
  });
  if (!existente || !existente.proveedorIdentidad) {
    throw new ReglaNegocioError(400, 'Selecciona un cliente registrado con datos consultados al proveedor.');
  }
  return existente;
}

function validarDocumentoDelPrestamo(
  cliente: { tipoDocumento: 'DNI' | 'RUC10'; numeroDocumento: string },
  datos: { tipoDocumentoOperacion: 'DNI' | 'RUC10'; numeroDocumentoOperacion: string },
) {
  if (!documentoCorrespondeACliente(cliente, {
    tipoDocumento: datos.tipoDocumentoOperacion,
    numeroDocumento: datos.numeroDocumentoOperacion,
  })) {
    throw new ReglaNegocioError(400, 'El documento presentado no pertenece a este cliente. Comprueba su DNI o RUC 10.');
  }
}

function responderError(res: import('express').Response, next: import('express').NextFunction, error: unknown) {
  if (error instanceof ReglaNegocioError) { res.status(error.status).json({ message: error.message }); return; }
  next(error);
}

router.post('/simular', async (req, res, next) => {
  try {
    const datos = interpretar(req.body);
    const cliente = await comprobarCliente(datos.clienteId, prisma);
    validarDocumentoDelPrestamo(cliente, datos);
    const comprometido = await capitalComprometido(datos.clienteId, prisma);
    const disponible = Math.max(0, LIMITE_CENTIMOS - comprometido);
    if (datos.montoCentimos > disponible) {
      throw new ReglaNegocioError(409, `El cliente tiene S/ ${dinero(comprometido)} comprometidos. Disponible: S/ ${dinero(disponible)}.`);
    }
    const cronograma = generarCronograma(datos.montoCentimos, datos.plazoMeses, datos.fechaPrestamo);
    res.json({ cliente, documentoOperacion: { tipoDocumento: datos.tipoDocumentoOperacion, numeroDocumento: datos.numeroDocumentoOperacion }, comprometido: dinero(comprometido), disponible: dinero(disponible), cronograma });
  } catch (e) { responderError(res, next, e); }
});

router.post('/', async (req, res, next) => {
  try {
    const datos = interpretar(req.body);
    const cronograma = generarCronograma(datos.montoCentimos, datos.plazoMeses, datos.fechaPrestamo);
    const trabajador = res.locals.trabajador as { id: string; agencia: { id: string } };
    // Comprobación y creación dentro de la misma operación transaccional.
    const registrado = await prisma.$transaction(async tx => {
      const cliente = await tx.cliente.findUnique({
        where: { id: datos.clienteId },
        select: { id: true, proveedorIdentidad: true, tipoDocumento: true, numeroDocumento: true },
      });
      if (!cliente?.proveedorIdentidad) throw new ReglaNegocioError(400, 'Cliente no registrado o sin datos del proveedor.');
      // Se valida otra vez al GUARDAR. Nunca confiar solo en la vista previa del navegador.
      validarDocumentoDelPrestamo(cliente, datos);
      const { _sum } = await tx.prestamo.aggregate({
        where: { clienteId: datos.clienteId, estado: 'ACTIVO' }, _sum: { monto: true },
      });
      const comprometido = Math.round(Number(_sum.monto ?? 0) * 100);
      if (comprometido + datos.montoCentimos > LIMITE_CENTIMOS) {
        throw new ReglaNegocioError(409, `El nuevo préstamo superaría el límite. Disponible: S/ ${dinero(Math.max(0, LIMITE_CENTIMOS - comprometido))}.`);
      }
      const nuevoPrestamo = await tx.prestamo.create({
        data: {
          clienteId: datos.clienteId,
          agenciaId: trabajador.agencia.id,
          trabajadorId: trabajador.id,
          monto: dinero(datos.montoCentimos),
          plazoMeses: datos.plazoMeses,
          fechaPrestamo: datos.fecha,
          tipoDocumentoOperacion: datos.tipoDocumentoOperacion,
          numeroDocumentoOperacion: datos.numeroDocumentoOperacion,
          tea: '0.30', baseDias: 360, diasPeriodo: 30,
          cuotaFija: cronograma.cuotaFija,
          interesTotal: cronograma.interesTotal,
          montoTotal: cronograma.montoTotal,
          cuotas: {
            create: cronograma.cuotas.map(c => ({
              numeroCuota: c.numeroCuota,
              fechaVencimiento: convertirFecha(c.fechaVencimiento),
              capital: c.capital, interes: c.interes,
              montoCuota: c.montoCuota, saldoRestante: c.saldoRestante,
            })),
          },
        },
        select: { id: true },
      });
      // La operación presencial asocia al cliente a esta agencia, sin duplicarlo.
      await tx.clienteAgencia.upsert({
        where: { clienteId_agenciaId: { clienteId: datos.clienteId, agenciaId: trabajador.agencia.id } },
        create: { clienteId: datos.clienteId, agenciaId: trabajador.agencia.id, trabajadorId: trabajador.id },
        update: {},
      });
      return nuevoPrestamo;
    });
    res.status(201).json({ id: registrado.id, message: 'Préstamo y cronograma registrados correctamente.' });
  } catch (e) { responderError(res, next, e); }
});

const filtrosListado = z.object({
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
  buscar: z.string().trim().max(100).default(''),
  estado: z.enum(['TODOS', 'ACTIVO', 'CANCELADO']).default('TODOS'),
});

router.get('/', async (req, res, next) => {
  const parsed = filtrosListado.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Filtros de préstamos no válidos.' });
    return;
  }
  try {
    const { pagina, buscar, estado } = parsed.data;
    const trabajador = res.locals.trabajador as { agencia: { id: string } };
    const donde: Prisma.PrestamoWhereInput = { agenciaId: trabajador.agencia.id };
    if (estado !== 'TODOS') donde.estado = estado;

    // Cada palabra puede coincidir en nombres, apellidos o documento.
    // No permite ver préstamos de otras agencias: siempre se exige agenciaId.
    const palabras = buscar.split(/\s+/).filter(Boolean).slice(0, 8);
    if (palabras.length) {
      donde.AND = palabras.map(palabra => ({
        OR: [
          { cliente: { is: { nombres: { contains: palabra, mode: 'insensitive' } } } },
          { cliente: { is: { apellidos: { contains: palabra, mode: 'insensitive' } } } },
          { cliente: { is: { numeroDocumento: { contains: palabra } } } },
          { numeroDocumentoOperacion: { contains: palabra } },
        ],
      }));
    }

    const porPagina = 10;
    const [total, prestamos] = await prisma.$transaction([
      prisma.prestamo.count({ where: donde }),
      prisma.prestamo.findMany({
        where: donde,
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: {
          id: true, fechaPrestamo: true, monto: true, plazoMeses: true,
          cuotaFija: true, montoTotal: true, estado: true,
          tipoDocumentoOperacion: true, numeroDocumentoOperacion: true,
          cliente: { select: { nombres: true, apellidos: true, numeroDocumento: true, tipoDocumento: true } },
          agencia: { select: { nombre: true } },
        },
      }),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ prestamos, total, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !z.string().uuid().safeParse(id).success) {
    res.status(400).json({ message: 'Identificador de préstamo inválido.' }); return;
  }
  try {
    const trabajador = res.locals.trabajador as { agencia: { id: string } };
    const prestamo = await prisma.prestamo.findFirst({
      where: { id, agenciaId: trabajador.agencia.id },
      include: {
        cliente: { select: { nombres: true, apellidos: true, numeroDocumento: true, tipoDocumento: true } },
        agencia: { select: { nombre: true } },
        cuotas: { orderBy: { numeroCuota: 'asc' } },
      },
    });
    if (!prestamo) { res.status(404).json({ message: 'Préstamo no encontrado.' }); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ prestamo });
  } catch (e) { next(e); }
});

export default router;
