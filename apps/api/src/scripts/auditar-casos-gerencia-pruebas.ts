/** Lee datos persistidos y obtiene las mismas magnitudes base de gerencia, sin alterar la BD. */
import { conectarBasePruebas } from './conexion-pruebas-sprint1.js';
import { evaluarPrestamo, estadoDeCliente, fechaPeru, centimos } from '../modules/prestamos/estados.js';

const {prisma,cerrar}=conectarBasePruebas();
try {
  const hoy=fechaPeru();
  const [numeroClientes, prestamos]= await Promise.all([
    prisma.cliente.count(),
    prisma.prestamo.findMany({select:{ clienteId:true,estado:true,monto:true,interesTotal:true,cuotas:{select:{ estado:true,fechaVencimiento:true,capital:true,interes:true,montoCuota:true }} }}),
  ]);
  const estados={VIGENTE:0,MOROSO:0,EXTRAJUDICIAL:0,LIQUIDADO:0};
  const clientes=new Map<string, Array<keyof typeof estados>>();
  let capitalHistorico=0,capitalPendiente=0,importeCuotasVencidas=0,capitalMoroso=0,capitalExtra=0,interesesPendientes=0,cuotasVencidas=0;
  for (const p of prestamos) {
    const r=evaluarPrestamo(p,hoy);
    estados[r.estadoCalculado]++;
    const estadosCliente=clientes.get(p.clienteId)??[];
    estadosCliente.push(r.estadoCalculado); clientes.set(p.clienteId,estadosCliente);
    capitalHistorico+=centimos(p.monto);
    capitalPendiente+=r.capitalDeCuotasPendientesCentimos;
    importeCuotasVencidas+=r.importeCuotasVencidasCentimos;
    cuotasVencidas+=r.cuotasVencidas;
    interesesPendientes+=p.cuotas.filter(c=>c.estado==='PENDIENTE').reduce((a,c)=>a+centimos(c.interes),0);
    if(r.estadoCalculado==='MOROSO')capitalMoroso+=r.capitalDeCuotasPendientesCentimos;
    if(r.estadoCalculado==='EXTRAJUDICIAL')capitalExtra+=r.capitalDeCuotasPendientesCentimos;
  }
  const clientesEstado={SIN_PRESTAMOS:numeroClientes-clientes.size,SIN_DEUDA:0,VIGENTE:0,MOROSO:0,EXTRAJUDICIAL:0};
  for(const lista of clientes.values())clientesEstado[estadoDeCliente(lista)]++;
  const sol=(c:number)=>(c/100).toFixed(2);
  console.log(JSON.stringify({ origen:'LECTURA_REAL_SUPABASE_PRUEBAS',hoy,clientes:numeroClientes,prestamos:prestamos.length,
    prestamosPorEstado:estados,clientesPorEstado:clientesEstado,
    capitalOtorgadoHistorico:sol(capitalHistorico),capitalPendienteProgramado:sol(capitalPendiente),
    cuotasVencidas,importeCuotasVencidas:sol(importeCuotasVencidas),
    capitalPrestamosMorosos:sol(capitalMoroso),capitalPrestamosExtrajudiciales:sol(capitalExtra),
    interesesPendientesProgramados:sol(interesesPendientes),
    pagosRecibidos:null,nota:'No hay registro auditable de pagos. Compara los resultados con GET /api/gerencia/resumen apuntando a esta BD de pruebas.'
  },null,2));
}catch(e){console.error(e instanceof Error?e.message:'Error de auditoría');process.exitCode=1;}
finally{await cerrar();}
