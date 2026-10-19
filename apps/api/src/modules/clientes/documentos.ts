export type TipoDocumentoCliente = "DNI" | "RUC10";

const FACTORES_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function crearRuc10DesdeDni(dni: string): string {
  if (!/^\d{8}$/.test(dni)) throw new Error("DNI inválido");
  const base = `10${dni}`;
  const suma = [...base].reduce((total, digito, i) => total + Number(digito) * FACTORES_RUC[i], 0);
  return `${base}${(11 - (suma % 11)) % 10}`;
}

export function validarNumero(tipo: TipoDocumentoCliente, numero: string): string | null {
  if (tipo === "DNI") {
    return /^\d{8}$/.test(numero) ? null : "El DNI debe tener exactamente 8 dígitos numéricos.";
  }
  if (!/^10\d{9}$/.test(numero)) {
    return "El RUC de persona natural debe tener 11 dígitos y empezar con 10. El RUC 20 aún no está habilitado.";
  }
  const dni = numero.slice(2, 10);
  return crearRuc10DesdeDni(dni) === numero ? null : "El dígito verificador del RUC es incorrecto.";
}

// Para no registrar a la misma persona dos veces usando DNI y luego RUC 10.
export function documentosMismaPersona(tipo: TipoDocumentoCliente, numero: string): string[] {
  return tipo === "DNI" ? [numero, crearRuc10DesdeDni(numero)] : [numero, numero.slice(2, 10)];
}

// Compara el documento PRESENTADO con la identidad global del deudor.
// No utiliza nombres: dos personas distintas pueden compartir nombres y apellidos.
export function documentoCorrespondeACliente(
  registrado: { tipoDocumento: TipoDocumentoCliente; numeroDocumento: string },
  presentado: { tipoDocumento: TipoDocumentoCliente; numeroDocumento: string },
): boolean {
  if (validarNumero(presentado.tipoDocumento, presentado.numeroDocumento)) return false;
  if (validarNumero(registrado.tipoDocumento, registrado.numeroDocumento)) return false;
  return documentosMismaPersona(registrado.tipoDocumento, registrado.numeroDocumento)
    .includes(presentado.numeroDocumento);
}

/** Valida la estructura y el dígito verificador de un RUC de persona jurídica. */
export function validarRuc20(numero: string): boolean {
  if (!/^20\d{9}$/.test(numero)) return false;
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const base = numero.slice(0, 10);
  const suma = [...base].reduce((acc, d, i) => acc + Number(d) * factores[i], 0);
  return `${base}${(11 - suma % 11) % 10}` === numero;
}
