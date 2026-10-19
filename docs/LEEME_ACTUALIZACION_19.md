# Actualización 19 — Representante RUC20 y mora informativa (NO publicar todavía)

## Por qué

El RUC básico de Decolecta devuelve razón social, estado y condición de SUNAT, pero **no representantes legales**. Agregamos una consulta opcional por RUC usando **ConsultasPerú (proveedor independiente)**. El acceso necesita un token propio: `CONSULTASPERU_API_TOKEN` SOLO en `apps/api/.env`. No se incluye ni se genera una credencial; hasta contratar o activar el proveedor, la interfaz muestra consulta no disponible y conserva la revisión manual SUNAT/SUNARP.

Esta consulta permite **buscar nombres/DNI/cargos declarados**, pero NO acredita vigencia de poder ni facultades de contratar un préstamo. Confirmar con SUNARP; no reutilizar la Clave SOL del cliente. La operación sigue siendo presencial.

## Instalación Windows (sobre ZIP 6 / versión más reciente)

1. Haz una copia del proyecto y extrae el paquete respetando carpetas.
2. NO reemplaces `.env`, ni `node_modules`, ni migres la BD.
3. `cd C:\Users\verga\Desktop\sistema-prestamos\apps\api`
4. `npx tsc --noEmit`
5. `npx tsx --test src/tests/representantes-mora.test.ts`
6. `npm run build`
7. En otra terminal: `cd C:\Users\verga\Desktop\sistema-prestamos\apps\web`
8. `npm run build` y `npm run dev`
9. Inicia API con `npm run dev` en `apps/api` si no está iniciada.

## Activar búsqueda automática (opcional, solo si cuentas con token)

Consulta documentación oficial del proveedor **https://docs.consultasperu.com/api-consultas/ruc-representantes**. Agrega al backend local (`apps/api/.env`):

`CONSULTASPERU_API_TOKEN=TU_TOKEN_PRIVADO`

No agregues nunca la variable al frontend `VITE_*`, ni la publiques en GitHub. No funciona sin una cuenta/token del proveedor. **No se han hecho solicitudes reales al servicio en esta entrega.** Prueba primero en una base de prueba. La API requiere revalidación en backend del DNI seleccionado para evitar manipulación desde navegador.

## Ruta y funcionamiento

- Con asesor autenticado: `GET /api/empresas/representantes?ruc=20xxxxxxxxx`
- Si hay API configurada: lista candidatos DNI y cargo.
- Se elige representante, se revisa documento/poder y se registra el vínculo empresarial.
- Si no hay API, se revisa manualmente SUNAT/SUNARP y se ingresa el DNI (modo existente).
- No cambia deuda, límite global, cronograma ni permisos.

## Mora (informativa y no aplicada)

`mora-referencial.ts` implementa la fórmula de análisis `suma(capital_de_cuota_vencida_impaga * tasa_diaria * días_en_atraso)`; solo devuelve un valor informativo en pruebas. Ejemplo de prueba `80 * 1% * 5 = S/4.00`.

**Nunca habilitar automáticamente ese 1% como cobro**: puede superar límites legales en Perú. Pendiente confirmar con el profesor si es capital de la cuota vencida, saldo total del crédito u otro capital; tasa, tope y régimen regulatorio deben revisarse. No afecta tablas Prisma, valores de cronograma, indicadores gerenciales o cobros reales.

## Qué sigue

- Verificar con un RUC20 de pruebas que el proveedor realmente responda. **No afirmar que busca representantes automáticamente sin token**.
- Validar manualmente facultades de representante contra certificado SUNARP; SUNAT no basta para la vigencia de poderes.
- Con copia/BD de pruebas aislada, comprobar cuentas del gerente y RUC20 end-to-end.
- No publicar en master hasta compilar, probar y confirmar políticas de datos y cobros.
