/**
 * Exclusivamente para base AISLADA: nunca usa prisma.ts (que lee DATABASE_URL).
 * No contiene secretos ni modifica el entorno global.
 */
import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function refEnUrl(url: URL, ref: string): boolean {
  const usuario = decodeURIComponent(url.username);
  return usuario === `postgres.${ref}` || url.hostname.split('.').includes(ref);
}

export function conectarBasePruebas() {
  const cadena = process.env.DATABASE_URL_PRUEBAS;
  const refPruebas = process.env.SUPABASE_REF_PRUEBAS;
  const refProduccion = process.env.SUPABASE_REF_PRODUCCION;
  if (!cadena || !refPruebas || !refProduccion) {
    throw new Error('Se necesitan DATABASE_URL_PRUEBAS, SUPABASE_REF_PRUEBAS y SUPABASE_REF_PRODUCCION. No uses la BD actual.');
  }
  if (!/^[a-z0-9]{12,32}$/.test(refPruebas) || !/^[a-z0-9]{12,32}$/.test(refProduccion) || refPruebas === refProduccion) {
    throw new Error('Debes indicar las referencias distintas de los proyectos Supabase de pruebas y producción.');
  }
  if (cadena === process.env.DATABASE_URL) throw new Error('El URL de pruebas coincide exactamente con el URL de producción.');
  let url: URL;
  try { url = new URL(cadena); } catch { throw new Error('DATABASE_URL_PRUEBAS inválida.'); }
  if (!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('Solo PostgreSQL está permitido.');
  if (!(url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.pooler.supabase.com'))) {
    throw new Error('Solo se aceptan URLs de proyectos Supabase identificables.');
  }
  if (!refEnUrl(url, refPruebas) || refEnUrl(url, refProduccion)) {
    throw new Error('El URL proporcionado no identifica al proyecto de pruebas o parece usar el de producción. No se conectó.');
  }
  const pool = new Pool({ connectionString: cadena, max: 2, connectionTimeoutMillis: 10000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { prisma, cerrar: async () => { await prisma.$disconnect(); await pool.end(); } };
}
