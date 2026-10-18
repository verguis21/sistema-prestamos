# Guía de preparación de despliegue — MVP de Préstamos

## Alcance demostrado para Sprint 1

Registro de trabajadores/autenticación, consulta y registro de clientes con datos de proveedor, registro presencial de préstamos, validación del capital comprometido de S/ 10 000, amortización francesa al 30 % TEA con base anual 360 días y vencimientos cada 30 días, impresión/consulta de cronogramas, búsqueda y paginación.

No incluye: registro de pagos, adelantos, morosidad, gestión extrajudicial, panel gerencial, Infocorp ni RUC 20. Pendientes del profesor: DNI/RUC 10 para la misma persona, RUC 20, validez de mecanismo de identificación, consulta Infocorp, convención financiera definitiva y permisos entre agencias.

## Antes de publicar

1. Verificar que `.gitignore` protege `**/.env`, `**/.env.*` salvo `.env.example`, `**/node_modules`, `**/dist`, y cliente Prisma generado si corresponde. Si un secreto alguna vez fue subido, rotarlo.
2. Excluir del repositorio datos personales reales de pruebas, reportes con DNI completos, respaldos privados, tokens de consulta y capturas con identificaciones.
3. Usar **datos ficticios o autorizados** para demostrar el MVP; la consulta de nombres no constituye prueba oficial RENIEC.
4. Backend: `npx prisma generate`, `npx tsc --noEmit`, `npm run build`, pruebas de documentos y cronogramas. Frontend: `npm run build`. Revisar `npm audit` en ambos proyectos (no ejecutar `npm audit fix --force` sin evaluar).
5. Confirmar `/api/health` responde y login, clientes, vista previa, guardado, búsqueda, cronogramas y control del límite funcionan con usuario de prueba.
6. Quitar o proteger el endpoint `/api/health/db` antes de abrirlo públicamente, pues divulga metadatos internos. Ajustar mensajes y CORS para producción.
7. Revisar los permisos del trabajador y las restricciones por agencia; confirmar con el profesor antes de desplegar con acceso fuera del grupo.
8. No utilizar entorno de producción real con dinero ni DNI de clientes reales sin los requisitos legales, operativos y de seguridad apropiados.

## Despliegue propuesto (a realizar después de las pruebas)

**Backend Render** — Un servicio web con repositorio GitHub y *Root directory* `apps/api`. Variables de entorno privadas:

- `DATABASE_URL`: URI Session pooler de Supabase (secreta; SSL y puerto 5432 según configuración validada).
- `JWT_SECRET`: secreto aleatorio fuerte, diferente del entorno local.
- `WEB_ORIGIN`: URL pública exacta del frontend en Vercel (sin barra final).
- `NODE_ENV=production`.

Comandos típicos a validar en Render:

- Build: `npm ci --include=dev && npx prisma generate && npm run build`
- Start: `npm start`
- Health check: `/api/health`

**Frontend Vercel** — El mismo repositorio, *Root directory* `apps/web`, framework Vite, build `npm run build`, output `dist`.

- Variable `VITE_API_URL`: URL pública del backend Render (por ejemplo `https://mi-api.onrender.com`, solo como patrón).
- CORS: una vez Vercel dé URL final, colocar esa URL en `WEB_ORIGIN` de Render y redeploy del backend.

**Supabase** — Se mantiene la base de datos y migraciones existentes. No ejecutar `migrate reset`, `db push` ni migraciones sin revisar cambios.

Los planes gratuitos de Render/Vercel/Supabase pueden tener suspensión, cuotas y latencias; antes de exposición comprobar que Render está activo y su conexión a Supabase responde. No prometer disponibilidad 24/7 de planes gratuitos.

## Demostración académica

1. Acceder con trabajador de agencia Trujillo.
2. Buscar DNI de prueba, obtener datos, confirmar revisión presencial y registrar el cliente.
3. En Préstamos: buscar el cliente por DNI o nombre y seleccionarlo.
4. Solicitar capital y plazo dentro de límite; revisar cronograma francés.
5. Confirmar préstamo y abrir cronograma; imprimir.
6. Comprobar persistencia tras actualizar la página.
7. Solicitar capital adicional que exceda S/ 10 000 del cliente y mostrar rechazo.
8. Mostrar búsqueda/paginación para no listar todos los préstamos a la vez.
9. Explicar qué se reserva para Sprint 2 y qué se preguntará al profesor.
