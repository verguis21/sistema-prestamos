/**
 * Inserta 3 préstamos REALES en PostgreSQL, nunca mock de pantalla.
 * USO EXCLUSIVO: BD Supabase de pruebas separada, VACÍA de clientes/préstamos.
 * No marca pagos ni altera deuda existente. No usar en Render/producción.
 */
import { conectarBasePruebas } from './conexion-pruebas-sprint1.js';
import { generarCronograma, dinero, convertirFecha } from '../modules/prestamos/calculo.js';
import { fechaPeru } from '../modules/prestamos/estados.js';

if (process.env.CONFIRMAR_ESCRITURA_BD_PRUEBAS !== 'SOLO_BD_AISLADA_VACIA') {
  throw new Error('BLOQUEADO. Define CONFIRMAR_ESCRITURA_BD_PRUEBAS=SOLO_BD_AISLADA_VACIA solo tras verificar tu segunda base.');
}
if (process.env.NODE_ENV === 'production') throw new Error('Nunca ejecutar seed académico con NODE_ENV=production.');
const { prisma, cerrar } = conectarBasePruebas();
function desplazar(fecha: string, dias: number) {
  const d = convertirFecha(fecha);
  d.setUTCDate(d.getUTCDate()+dias);
  return d.toISOString().slice(0,10);
}
try {
  const [numeroClientes, numeroPrestamos, numeroCuotas, agencias, asesor] = await Promise.all([
    prisma.cliente.count(), prisma.prestamo.count(), prisma.cuota.count(),
    prisma.agencia.findMany({where:{activa:true}, select:{id:true,nombre:true}}),
    prisma.trabajador.findFirst({where:{rol:'ASESOR',activo:true},select:{id:true,agenciaId:true}}),
  ]);
  // No contaminar siquiera una BD de pruebas con datos previamente existentes.
  if (numeroClientes || numeroPrestamos || numeroCuotas) throw new Error('Base NO VACÍA: hay clientes o préstamos; no se creó nada.');
  if (agencias.length < 5 || !asesor) throw new Error('Crea primero las 5 agencias y al menos un asesor DE PRUEBAS en la BD aislada.');
  const hoy=fechaPeru();
  const casos = [
    { identificador:'99110001', apellido:'VIGENTE', principal:100, plazo:12, fecha:desplazar(hoy,0), esperado:'VIGENTE' },
    { identificador:'99110002', apellido:'MOROSO', principal:200, plazo:12, fecha:desplazar(hoy,-60), esperado:'MOROSO' },
    { identificador:'99110003', apellido:'EXTRAJUDICIAL', principal:300, plazo:24, fecha:desplazar(hoy,-450), esperado:'EXTRAJUDICIAL' },
  ] as const;
  await prisma.$transaction(async tx=> {
    for (const caso of casos) {
      const cliente = await tx.cliente.create({data: {
        tipoDocumento:'DNI', numeroDocumento:caso.identificador,
        nombres:'REGISTRO ACADÉMICO', apellidos:`CASO ${caso.apellido}`,
        identidadVerificada:false, proveedorIdentidad:'DATOS_ACADEMICOS_NO_VERIFICADOS',
      }});
      const cronograma = generarCronograma(caso.principal*100,caso.plazo,caso.fecha);
      await tx.prestamo.create({data:{
        clienteId:cliente.id, agenciaId:asesor.agenciaId,trabajadorId:asesor.id,
        monto:dinero(caso.principal*100), plazoMeses:caso.plazo,
        fechaPrestamo:convertirFecha(caso.fecha),
        tipoDocumentoOperacion:'DNI',numeroDocumentoOperacion:caso.identificador,
        tea:'0.30',baseDias:360,diasPeriodo:30,
        cuotaFija:cronograma.cuotaFija,interesTotal:cronograma.interesTotal,montoTotal:cronograma.montoTotal,
        cuotas:{create:cronograma.cuotas.map(f=>({
          numeroCuota:f.numeroCuota,fechaVencimiento:convertirFecha(f.fechaVencimiento),
          capital:f.capital,interes:f.interes,montoCuota:f.montoCuota,saldoRestante:f.saldoRestante,
        }))},
      }});
    }
  },{timeout:30000});
  console.log(JSON.stringify({resultado:'DATOS DE PRUEBA PERSISTIDOS SOLO EN BASE AISLADA', fechaPeru:hoy,
    casos:casos.map(c=>({tipo:c.esperado,fechaPrestamo:c.fecha,capital:c.principal})),
    pagosRegistrados:0,
    siguientePaso:'Ejecuta auditoría y entra con GERENTE de pruebas para comparar indicadores. No equivale a cobros reales.',
  },null,2));
} catch(e) {
  console.error(e instanceof Error ? e.message : 'Fallo inesperado en casos de prueba');
  process.exitCode=1;
} finally { await cerrar(); }
