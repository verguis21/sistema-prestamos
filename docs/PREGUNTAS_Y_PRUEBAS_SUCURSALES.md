# MVP — Sucursales: preguntas y validación

## Decisiones actuales del MVP

- Existen 5 agencias: Chimbote, Trujillo, Chiclayo, Piura, Tumbes.
- Cada trabajador está asociado a una agencia en la tabla `Trabajador` (`agenciaId`).
- Al iniciar sesión, el backend devuelve su agencia y la verifica en rutas protegidas.
- El backend asigna el `agenciaId` de cada nuevo préstamo a partir de la sesión del trabajador, no del formulario.
- El listado y la consulta de un préstamo están restringidos a los préstamos de la agencia del trabajador (versión de las rutas revisada de Actualización 04).
- Los clientes están centralizados (compartidos entre agencias); los préstamos se guardan vinculados a la agencia de origen.
- La operación de **pagar cuotas en cualquier agencia** pertenece al Sprint 2: no debe demostrarse como si ya existiera.

## Por confirmar con el profesor

1. ¿Cada asesor solo consulta préstamos de su propia agencia, o debe poder consultar todo el historial de un cliente de cualquier agencia? (Separar consulta de pagos y edición.)
2. ¿Los clientes se registran una sola vez para toda la empresa? (Recomendación: sí.)
3. ¿Un trabajador puede atender temporalmente en otra agencia? En caso afirmativo, ¿quién autoriza el cambio? No permitirlo libremente en login.
4. ¿Quién crea/desactiva trabajadores y los reasigna? ¿Requiere rol administrador en Sprint 1 o puede quedar a gestión interna hasta la entrega final?
5. ¿El gerente puede consultar totales por agencia y a nivel de empresa solo en Sprint 2? (En la transcripción se difiere gerencia.)
6. ¿Si un cliente ya tiene un préstamo en Piura, puede pedir otro en Trujillo sin evaluación nueva? (El límite acumulado S/ 10,000 sí es global.)
7. ¿Cómo se debe relacionar DNI y RUC 10 para una misma persona? ¿Se admitirá RUC 20 de empresas?
8. ¿La evaluación Infocorp y la consulta de identidad con API externa son suficientes para la demostración del MVP?
9. ¿Quién gestiona la migración de préstamos que aún figuran en Excel? Sin incorporar deudas anteriores, el sistema no puede comprobar todo el capital comprometido histórico.

## Pasos de prueba

1. Preparar el archivo `.env` con las contraseñas de demostración (ver LEEME).
2. Ejecutar el script y confirmar las cuatro cuentas creadas, Trujillo sin cambios.
3. Entrar como Piura: Inicio debe mostrar Piura.
4. Registrar un préstamo de prueba desde Piura solo cuando el cliente esté registrado; verificar `agenciaId` / nombre Piura en base de datos.
5. Cerrar sesión y entrar como Trujillo: el préstamo registrado en Piura **no debería salir** en listado de Trujillo, según comportamiento vigente; el cliente sí podrá encontrarse por búsqueda.
6. Verificar que el límite acumulado sea por persona en las cinco agencias y no por sucursal.
7. Iniciar sesión en Chiclayo/Chimbote/Tumbes y comprobar que cada cuenta muestra su agencia correcta.
8. Comprobar que al cerrar sesión ya no se puede consultar un cronograma de otra agencia por URL directa.

## Seguridad

- Las cuentas creadas son de prueba y usan el dominio reservado example.com.
- Nunca subas `.env` al repositorio ni compartas las contraseñas.
- No ejecutar este script automáticamente en Render, Vercel ni en el `postinstall`.
- Antes de usar un entorno financiero real: reemplazar estas cuentas por usuarios autorizados con administración de identidades, revisar permisos y retirar accesos demo.
