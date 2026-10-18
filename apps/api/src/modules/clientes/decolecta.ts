import type { TipoDocumentoCliente } from "./documentos.js";

export class ConsultaIdentidadError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type DatosConsulta = {
  tipoDocumento: TipoDocumentoCliente;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  proveedor: string;
  estadoRuc?: string;
  verificacionOficial: false;
  requiereRevisionPresencial: true;
};

type Registro = Record<string, unknown>;
const API_BASE = "https://api.decolecta.com";

function isObject(data: unknown): data is Registro {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

function campo(obj: Registro, ...claves: string[]): string {
  for (const clave of claves) {
    const valor = obj[clave];
    if (typeof valor === "string" && valor.trim()) return valor.trim();
  }
  return "";
}

async function consultar(path: "/v1/reniec/dni" | "/v1/sunat/ruc", numero: string): Promise<Registro> {
  const token = process.env.DECOLECTA_API_TOKEN?.trim();
  if (!token) {
    throw new ConsultaIdentidadError(503, "Falta configurar DECOLECTA_API_TOKEN en el servidor.");
  }
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("numero", numero);
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8500),
    });
  } catch {
    throw new ConsultaIdentidadError(503, "No se pudo contactar al proveedor de consulta de documentos.");
  }
  if (respuesta.status === 404) throw new ConsultaIdentidadError(404, "Documento no encontrado en el proveedor de datos.");
  if (respuesta.status === 401 || respuesta.status === 403) throw new ConsultaIdentidadError(503, "El token del proveedor no es válido o no tiene acceso a esta consulta.");
  if (respuesta.status === 429) throw new ConsultaIdentidadError(503, "El proveedor alcanzó su límite de consultas. Inténtalo más tarde.");
  if (!respuesta.ok) throw new ConsultaIdentidadError(503, "El proveedor no pudo procesar la consulta en este momento.");
  let payload: unknown;
  try { payload = await respuesta.json(); }
  catch { throw new ConsultaIdentidadError(503, "Respuesta no válida del proveedor."); }
  if (!isObject(payload)) throw new ConsultaIdentidadError(503, "Formato de respuesta inesperado del proveedor.");
  // Algunos proveedores encapsulan las propiedades dentro de data.
  return isObject(payload.data) ? payload.data : payload;
}

async function obtenerNombres(dni: string): Promise<{ nombres: string; apellidos: string }> {
  const data = await consultar("/v1/reniec/dni", dni);
  const devuelto = campo(data, "document_number", "numeroDocumento", "numero_documento", "dni");
  if (devuelto && devuelto !== dni) {
    throw new ConsultaIdentidadError(502, "El proveedor devolvió un DNI diferente del consultado. No se puede registrar.");
  }
  const nombres = campo(data, "first_name", "nombres");
  const paterno = campo(data, "first_last_name", "apellidoPaterno", "apellido_paterno");
  const materno = campo(data, "second_last_name", "apellidoMaterno", "apellido_materno");
  if (!nombres || !paterno) {
    throw new ConsultaIdentidadError(502, "El proveedor no devolvió nombres y apellidos separados con suficiente claridad.");
  }
  return { nombres, apellidos: [paterno, materno].filter(Boolean).join(" ") };
}

export async function obtenerDatosCliente(tipo: TipoDocumentoCliente, numero: string): Promise<DatosConsulta> {
  let estadoRuc: string | undefined;
  let dni = numero;
  if (tipo === "RUC10") {
    const ruc = await consultar("/v1/sunat/ruc", numero);
    const numeroDevuelto = campo(ruc, "numero_documento", "numeroDocumento", "ruc");
    if (numeroDevuelto && numeroDevuelto !== numero) {
      throw new ConsultaIdentidadError(502, "El proveedor devolvió un RUC diferente del consultado.");
    }
    estadoRuc = campo(ruc, "estado") || undefined;
    // SUNAT devuelve una razón social que puede venir en orden no separable.
    // En RUC 10 nacional el DNI está en las posiciones 3 a 10.
    // Consultamos ese DNI para guardar nombres/apellidos sin adivinar el orden.
    dni = numero.slice(2, 10);
  }
  const { nombres, apellidos } = await obtenerNombres(dni);
  return {
    tipoDocumento: tipo,
    numeroDocumento: numero,
    nombres,
    apellidos,
    proveedor: "DECOLECTA_DATOS_PUBLICOS",
    ...(estadoRuc ? { estadoRuc } : {}),
    verificacionOficial: false,
    requiereRevisionPresencial: true,
  };
}
