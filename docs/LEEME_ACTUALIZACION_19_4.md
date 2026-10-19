# Actualización 19.4 — búsqueda RUC 20 con alternativa gratuita

## Alcance
Esta actualización SOLO modifica `representantes.ts`, `empresas.routes.ts`, `EmpresaPanel.tsx` y añade pruebas; no cambia el motor financiero, otros módulos, CSS, Prisma o datos existentes.

Se mantiene el proveedor ConsultasPerú anterior y se añade ElRUC.pe como alternativa. ElRUC documenta 150 consultas al mes sin tarjeta (confirmar condiciones al crear la cuenta): https://elruc.pe/api

**Importante:** encontrar el nombre/cargo de un representante en fuentes basadas en SUNAT NO acredita poderes vigentes ni facultades para tomar préstamos. Revisar certificado o partida en SUNARP. NO registrar operaciones ficticias sobre Supabase productiva.

## Instalación en Windows (CMD de VS Code)
1. Guarda copias de los tres archivos que serán reemplazados. Extrae el ZIP en la raíz `C:\Users\verga\Desktop\sistema-prestamos` respetando `apps/`.
2. Abre `apps/api/.env` de forma local, sin compartirlo ni subirlo a Git. Agrega únicamente:

```
REPRESENTANTES_PROVIDER=ELRUC
ELRUC_API_TOKEN=TU_TOKEN_PRIVADO
```

Conserva las demás variables como estaban. Si aún no tienes token puedes instalar y compilar, pero el botón mostrará que la búsqueda automática no está configurada.

3. API:

```
cd C:\Users\verga\Desktop\sistema-prestamos\apps\api
npx tsc --noEmit
npx tsx --test src/tests/representantes-mora.test.ts src/tests/representantes-proveedores.test.ts
npm run build
npm run dev
```

4. En otra terminal, web:

```
cd C:\Users\verga\Desktop\sistema-prestamos\apps\web
npm run build
npm run dev
```

5. Inicia sesión con ASESOR > Clientes > RUC 20. Ingresa RUC válido > Consultar empresa > Buscar representante legal por RUC. Verifica nombre/cargo; si el proveedor oculta DNI, solicita documentos originales y verifica en SUNARP. **Para esta prueba, NO pulses Vincular ni registres préstamos:** consultar no escribe nada en la base.

## Cómo obtener token de ElRUC
Entra a https://elruc.pe/api , haz clic en Crear cuenta gratis, genera un token y cópialo directamente a `apps/api/.env`, sin pegarlo en este chat ni en el frontend. Reinicia el backend después de guardar `.env`. No pongas tokens en variables `VITE_*`.

## Qué probar
- Sin token: 503 con mensaje claro; revisión manual disponible.
- Token válido: devuelve fuente `ELRUC`, nombre y cargo de representantes si el proveedor tiene esos datos.
- Si el DNI viene oculto (en ejemplos de la documentación aparece `XXXXXXXX`), mostrar nombre/cargo con aviso de comprobación documental, sin rellenar ni inventar DNI.
- RUC sin representantes: lista vacía, nunca crea nombres falsos.
- Validar la representación jurídica mediante SUNARP: https://vigenciaexpress.sunarp.gob.pe/ . Consultar y obtener la vigencia de poder real puede requerir trámite/pago.

**No ejecuta** migraciones, `db push`, seeds, registro de pagos ni solicitudes de préstamo. No modifica Render o Vercel.

## Limitaciones y decisiones pendientes
- No se ha probado el proveedor con un token auténtico en este entorno; solo con respuestas controladas. La documentación pública del proveedor puede diferir del contenido que devuelva a una cuenta concreta.
- La vinculación manual usa la confirmación del asesor. Se debe confirmar poder documental real antes de aprobar crédito empresarial.
- La regla del deudor empresarial vs representante y el límite global permanece provisional hasta la confirmación del profesor.
