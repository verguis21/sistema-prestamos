/**
 * Búsqueda informativa de representantes declarados para RUC20.
 * No acredita facultades ni vigencia registral: requerir revisión SUNARP.
 * Solo utiliza tokens privados del backend.
 */
import { ConsultaIdentidadError } from './decolecta.js';
import { validarRuc20 } from './documentos.js';

export type RepresentanteRuc = {
  dni: string | null;
  nombreCompleto: string;
  cargo: string | null;
  fechaDesde: string | null;
};
export type ProveedorRepresentantes = 'ELRUC' | 'CONSULTASPERU';
type Diccionario = Record<string, unknown>;
const objeto = (valor: unknown): valor is Diccionario =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const cadena = (valor: unknown): string => typeof valor === 'string' ? valor.trim() : '';

/** No presupone que todos los proveedores divulgan un DNI. */
export function normalizarRepresentantesRuc(payload: unknown): RepresentanteRuc[] {
  if (!objeto(payload)) return [];
  const data = payload.data;
  const lista = Array.isArray(data) ? data
    : objeto(data) && Array.isArray(data.representantes) ? data.representantes
    : Array.isArray(payload.representantes) ? payload.representantes : [];
  const resultado: RepresentanteRuc[] = [];
  for (const item of lista) {
    if (!objeto(item)) continue;
    const tipo = cadena(item.tipo_documento ?? item.tipo_de_documento).toUpperCase();
    const numero = cadena(item.numero_documento ?? item.numero_de_documento);
    const nombreCompleto = cadena(item.nombres ?? item.nombre);
    if (tipo && tipo !== 'DNI' && tipo !== '1') continue;
    if (!nombreCompleto) continue;
    // ElRUC puede ocultar el DNI (p. ej. "XXXXXXXX"). Mostrar nombre/cargo,
    // pero NUNCA tratar un documento enmascarado como documento validado.
    const dni = /^\d{8}$/.test(numero) ? numero : null;
    const oculto = /^[Xx*•-]{4,}$/.test(numero);
    if (!dni && !oculto) continue;
    if (resultado.some(r => dni ? r.dni === dni : r.dni === null && r.nombreCompleto === nombreCompleto)) continue;
    resultado.push({
      dni,
      nombreCompleto,
      cargo: cadena(item.cargo) || null,
      fechaDesde: cadena(item.fecha_desde ?? item.desde) || null,
    });
  }
  return resultado;
}

export function proveedorRepresentantesConfigurado(): ProveedorRepresentantes | null {
  const preferido = (process.env.REPRESENTANTES_PROVIDER ?? '').trim().toUpperCase();
  if (preferido === 'ELRUC' || preferido === 'CONSULTASPERU') return preferido;
  if (process.env.ELRUC_API_TOKEN?.trim()) return 'ELRUC';
  if (process.env.CONSULTASPERU_API_TOKEN?.trim()) return 'CONSULTASPERU';
  return null;
}

function errorServicio(status: number, proveedor: ProveedorRepresentantes): ConsultaIdentidadError {
  if (status === 401 || status === 403) return new ConsultaIdentidadError(503, `La credencial de ${proveedor} no es válida o no tiene permisos.`);
  if (status === 429) return new ConsultaIdentidadError(503, `Se alcanzó el límite de consultas de ${proveedor}.`);
  return new ConsultaIdentidadError(503, `No se pudo completar la búsqueda de representantes (${proveedor}).`);
}

export async function consultarRepresentantesRuc(ruc: string): Promise<RepresentanteRuc[]> {
  if (!validarRuc20(ruc)) throw new ConsultaIdentidadError(400, 'RUC 20 inválido.');
  const proveedor = proveedorRepresentantesConfigurado();
  if (!proveedor) throw new ConsultaIdentidadError(503,
    'Búsqueda automática no configurada. Revisa SUNAT/SUNARP y continúa con verificación documental.');
  const token = (proveedor === 'ELRUC' ? process.env.ELRUC_API_TOKEN : process.env.CONSULTASPERU_API_TOKEN)?.trim();
  if (!token) throw new ConsultaIdentidadError(503,
    `Falta la credencial privada de ${proveedor}. Configúrala en el backend.`);

  const url = proveedor === 'ELRUC'
    ? `https://elruc.pe/api/v1/ruc/${ruc}?incluir=representantes`
    : 'https://api.consultasperu.com/api/v1/query/ruc-representantes';
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: proveedor === 'ELRUC' ? 'GET' : 'POST',
      headers: proveedor === 'ELRUC'
        ? { Accept: 'application/json', Authorization: `Bearer ${token}` }
        : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(proveedor === 'CONSULTASPERU' ? { body: JSON.stringify({ token, ruc }) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ConsultaIdentidadError(503,
      'No hay conexión con el proveedor de representantes. Revisa SUNAT/SUNARP manualmente.');
  }
  if (respuesta.status === 404) return [];
  if (!respuesta.ok) throw errorServicio(respuesta.status, proveedor);
  let datos: unknown;
  try { datos = await respuesta.json(); }
  catch { throw new ConsultaIdentidadError(502, 'El proveedor devolvió una respuesta inválida.'); }
  // Evita aceptar accidentalmente representantes de una empresa diferente.
  if (proveedor === 'ELRUC' && objeto(datos) && datos.ruc !== ruc) {
    throw new ConsultaIdentidadError(502, 'La respuesta del proveedor corresponde a otro RUC.');
  }
  return normalizarRepresentantesRuc(datos);
}
