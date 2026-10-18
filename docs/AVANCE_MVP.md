# Sistema de Gestión de Préstamos Personales — avance técnico

## Problema del negocio

La empresa registra préstamos en Excel y teme errores en datos de identificación. Tiene cinco agencias: Chimbote, Trujillo, Chiclayo, Piura y Tumbes. Los trabajadores atienden presencialmente.

## Alcance acordado del Sprint 1

- Verificación de clientes (DNI y RUC 10) mediante API a seleccionar, con validación de identidad.
- Registro presencial de préstamos por trabajador.
- Plazo entre 1 y 60 meses; préstamos desde S/1 en el entorno académico.
- Control de S/10 000 de capital comprometido por cliente (hasta implementar pagos).
- Generación de cronogramas de cuotas fijas con amortización francesa, TEA 30 %, base 360, pagos cada 30 días.
- Consulta y entrega del cronograma.

## Fuera de Sprint 1

Pagos, adelanto de cuotas sin amortización extraordinaria de capital según el proceso descrito, morosidad, gestión extrajudicial, pagos combinados y panel gerencial.

## Aspectos por confirmar con el profesor

- API aceptada para cotejar DNI/RUC 10 (servicio de terceros no equivale automáticamente a verificación oficial RENIEC).
- Consulta a Infocorp; alcance de RUC 20.
- Aplicación del estado moroso mientras no exista registro de pagos.
- Confirmación final de convención financiera y reglas de negocio aún no descritas.

## Estado técnico encontrado en el ZIP entregado

- Frontend React/Vite creado, plantilla inicial sin pantallas propias.
- Backend Express/TypeScript ejecutable, con health y health/db.
- Prisma 7.10.1, adapter-pg, esquema con Agencia, Trabajador, Cliente, Prestamo, Cuota.
- Primera migración aplicada y agencia seed 5/5 comprobado en la conversación.
- `seed-trabajador.ts` existe, pero en el ZIP no se puede comprobar que el usuario ya esté creado en Supabase.

## Actualización 01

Se incorpora login, consulta de perfil con autenticación JWT y una interfaz de inicio de sesión. No se alteran las tablas existentes ni se implementan módulos simulados. El panel informa claramente que el registro de préstamos está pendiente.

## Pruebas del parche

- Compilación TypeScript API: correcta en entorno aislado, con bibliotecas presentes en el ZIP (compilador TS 6 disponible localmente para validación cruzada).
- Comprobación de tipos React: correcta.
- Smoke test HTTP local: `/api/health` 200, `/api/auth/me` sin token 401 y petición de login inválida 400.
- **No** se probó login con trabajador real ni acceso al Supabase del usuario: esas verificaciones deben realizarse en Windows con su `.env`.

## Próximo incremento

1. Validar login de prueba y comportamiento de errores.
2. Seleccionar proveedor de identidad y validar respuestas sin inventar verificaciones.
3. Crear operaciones de clientes protegidas.
4. Implementar servicio de préstamos con reglas de negocio y control transaccional por cliente.
5. Generar cronograma francés y pruebas de centavos y fechas.
6. Conectar pantallas y preparar despliegue MVP.
