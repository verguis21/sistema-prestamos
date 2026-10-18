# Sprint 1 — Incremento 02: Registro de clientes

## Necesidad del negocio
Eliminar la digitación manual de nombres en Excel: el trabajador consulta el DNI/RUC 10 y revisa los datos presentados antes de registrar un préstamo.

## Alcance implementado
1. Endpoint protegido para consultar datos públicos de DNI y RUC 10 con Decolecta.
2. DNI de ocho dígitos, RUC 10 de once y control de dígito verificador.
3. Nombres no editables por el trabajador; el backend consulta nuevamente al guardar.
4. Revisión documental presencial confirmada antes de guardar.
5. Registro en la tabla existente Cliente sin migraciones; consulta de los últimos 50 clientes.
6. Protección simple contra registro duplicado por el mismo DNI o RUC 10.
7. RUC 20 sigue expresamente fuera de alcance.

## Limitaciones
Los nombres devueltos por una fuente pública **no son prueba oficial** de que quien presenta el documento sea su titular. El booleano `identidadVerificada` permanece en false. Se requiere validar el método aceptado por el profesor y, para operación crediticia real, mecanismos autorizados de verificación de identidad.

## Pruebas
- Backend y frontend: typecheck y build.
- Algoritmo de RUC: verificador y rechazo de RUC 20.
- Integración de proveedor: pendiente de credenciales del usuario y prueba autorizada.
- Inserción en Supabase: pendiente de prueba de usuario en su entorno Windows.
