import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireRole } from '../../middleware/require-role.js';
import { crearRuc10DesdeDni, validarNumero, validarRuc20 } from './documentos.js';
import { obtenerDatosCliente, obtenerDatosEmpresa, ConsultaIdentidadError } from './decolecta.js';
import { estadoDeCliente, evaluarPrestamo, fechaPeru } from '../prestamos/estados.js';
import { consultarRepresentantesRuc, proveedorRepresentantesConfigurado } from './representantes.js';

const router = Router();
router.use(requireAuth, requireRole('ASESOR'));
const rucSchema = z.object({ ruc: z.string().regex(/^20\d{9}$/) });
const crearSchema = rucSchema.extend({
  representanteDni: z.string().regex(/^\d{8}$/),
  revisionPresencialConfirmada: z.literal(true),
  representacionDocumentada: z.literal(true),
  consultaAutomatica: z.boolean().optional().default(false),
});

function fallo(res: import('express').Response, next: import('express').NextFunction, e: unknown) {
  if (e instanceof ConsultaIdentidadError) { res.status(e.status).json({ message: e.message }); return; }
  next(e);
}

router.get('/existente', async (req, res, next) => {
  const input = rucSchema.safeParse(req.query);
  if (!input.success || !validarRuc20(input.data.ruc)) { res.status(400).json({ message: 'RUC 20 inválido.' }); return; }
  try {
    const empresa = await prisma.empresa.findUnique({ where: { ruc: input.data.ruc }, include: {
      representante: { select: { id: true, nombres: true, apellidos: true, numeroDocumento: true, tipoDocumento: true, proveedorIdentidad: true,
        prestamos: { select: { estado: true, cuotas: { select: { estado: true, fechaVencimiento: true, montoCuota: true, capital: true } } } },
      } },
    } });
    const { representante, ...empresaDatos } = empresa ?? { representante: null };
    const { prestamos = [], ...cliente } = representante ?? {};
    res.setHeader('Cache-Control', 'no-store');
    res.json({ empresa: empresa ? empresaDatos : null, representante: representante ? {
      ...cliente, estadoCliente: estadoDeCliente(prestamos.map(p => evaluarPrestamo(p, fechaPeru()).estadoCalculado)),
    } : null });
  } catch (e) { next(e); }
});

router.get('/consulta', async (req, res, next) => {
  const input = rucSchema.safeParse(req.query);
  if (!input.success || !validarRuc20(input.data.ruc)) { res.status(400).json({ message: 'RUC 20 no válido.' }); return; }
  try { const datos = await obtenerDatosEmpresa(input.data.ruc); res.setHeader('Cache-Control', 'no-store'); res.json({ datos }); }
  catch (e) { fallo(res, next, e); }
});

// Consulta asistida: devuelve representantes informados por un servicio externo,
// pero no certifica poderes vigentes. Siempre requiere comprobación documental.
router.get('/representantes', async (req, res, next) => {
  const input = rucSchema.safeParse(req.query);
  if (!input.success || !validarRuc20(input.data.ruc)) {
    res.status(400).json({ message: 'RUC 20 inválido.' }); return;
  }
  try {
    const representantes = await consultarRepresentantesRuc(input.data.ruc);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ representantes, fuente: proveedorRepresentantesConfigurado(),
      advertencia: 'La consulta identifica representantes informados; no acredita vigencia de poderes.' });
  } catch (e) { fallo(res, next, e); }
});

// Una empresa NO es una segunda ficha de Cliente. Se vincula al representante por DNI.
router.post('/', async (req, res, next) => {
  const input = crearSchema.safeParse(req.body);
  if (!input.success) { res.status(400).json({ message: 'Indica RUC 20, DNI del representante y confirma ambos documentos en agencia.' }); return; }
  const { ruc, representanteDni, consultaAutomatica } = input.data;
  if (!validarRuc20(ruc)) { res.status(400).json({ message: 'RUC 20 con dígito verificador inválido.' }); return; }
  if (validarNumero('DNI', representanteDni)) { res.status(400).json({ message: 'DNI del representante inválido.' }); return; }
  try {
    const guardada = await prisma.empresa.findUnique({ where: { ruc } });
    if (guardada) { res.status(409).json({ message: 'La empresa ya existe. Busca su RUC para continuar. No se cambia el representante desde este formulario.' }); return; }
    // Si fue seleccionado en búsqueda automática, corroborar nuevamente el DNI
    // en backend: el cliente no puede suplantar el resultado manipulando el navegador.
    if (consultaAutomatica) {
      const representantes = await consultarRepresentantesRuc(ruc);
      if (!representantes.some(r => r.dni === representanteDni)) {
        res.status(409).json({ message: 'El DNI seleccionado no figura en la consulta actual de representantes. Revisa la información.' });
        return;
      }
    }
    // Los datos de la razón social se consultan de nuevo en backend, no se aceptan del formulario.
    const datosEmpresa = await obtenerDatosEmpresa(ruc);
    // Nombre del representante = datos reales consultados por DNI, nunca transcripción libre.
    const equivalentes = [representanteDni, crearRuc10DesdeDni(representanteDni)];
    let cliente = await prisma.cliente.findFirst({ where: { numeroDocumento: { in: equivalentes } } });
    const datosPersona = cliente ? null : await obtenerDatosCliente('DNI', representanteDni);
    const trabajador = res.locals.trabajador as { id: string; agencia: { id: string } };
    const resultado = await prisma.$transaction(async tx => {
      if (!cliente && datosPersona) {
        // Otra llamada simultánea de registro puede crear la misma persona.
        cliente = await tx.cliente.findFirst({ where: { numeroDocumento: { in: equivalentes } } });
        if (!cliente) cliente = await tx.cliente.create({ data: {
          tipoDocumento: 'DNI', numeroDocumento: representanteDni,
          nombres: datosPersona.nombres, apellidos: datosPersona.apellidos,
          proveedorIdentidad: datosPersona.proveedor, identidadVerificada: false,
          agenciasAtencion: { create: { agenciaId: trabajador.agencia.id, trabajadorId: trabajador.id } },
        } });
      }
      if (!cliente) throw new Error('No se pudo identificar al representante.');
      await tx.clienteAgencia.upsert({
        where: { clienteId_agenciaId: { clienteId: cliente.id, agenciaId: trabajador.agencia.id } },
        create: { clienteId: cliente.id, agenciaId: trabajador.agencia.id, trabajadorId: trabajador.id },
        update: {},
      });
      const empresa = await tx.empresa.create({ data: {
        ruc, razonSocial: datosEmpresa.razonSocial, estadoSunat: datosEmpresa.estadoRuc,
        representanteId: cliente.id, representacionRevisadaEn: new Date(),
      } });
      return { empresa, representante: { id: cliente.id, nombres: cliente.nombres, apellidos: cliente.apellidos, tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento } };
    });
    res.status(201).json({ ...resultado, message: 'Empresa registrada y vinculada al representante. La acreditación oficial de facultades de representación queda pendiente.' });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      res.status(409).json({ message: 'El RUC ya se encuentra registrado.' }); return;
    }
    fallo(res, next, e);
  }
});
export default router;
