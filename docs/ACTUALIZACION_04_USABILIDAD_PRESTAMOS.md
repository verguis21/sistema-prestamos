# Sprint 1 — Mejora de usabilidad del módulo Préstamos

## Problema detectado durante las pruebas

El cronograma se presentaba debajo del formulario y el listado, obligando al trabajador a desplazarse; además el listado GET `/api/prestamos` devolvía solo los últimos 50 registros y no podía buscar ni paginar.

## Solución incorporada

- Cronograma registrado accesible al pulsar **Ver cronograma**, en ventana superpuesta.
- Resumen con datos del cliente, fechas, cuotas, intereses, amortización y saldo.
- Botón de impresión y cierre.
- Listado con búsqueda por cliente o documento, filtro de estado y paginación real de 10 elementos por página en PostgreSQL.
- Consulta limitada a la agencia del trabajador, con autenticación previa.
- No se modifican los cálculos, el límite por cliente ni las tablas del sistema.

## Criterios de aceptación

- Con varios préstamos registrados, la búsqueda retorna solo los coincidentes y el total correcto.
- Con 11 registros, la página 1 retorna 10 y la página 2 retorna 1.
- Con 100 registros, se dispone de 10 páginas sin cargar las 100 filas a la vez.
- Un trabajador no puede consultar los préstamos de otra agencia mediante el endpoint de listado o detalle.
- «Ver cronograma» abre las cuotas ya guardadas sin alterar los datos.
- El límite de capital acumulado de S/ 10 000 sigue vigente.

## Preguntas pendientes para el profesor

1. ¿DNI y RUC 10 pertenecientes a una misma persona deben asociarse al mismo registro e historial de préstamos? Propuesta: sí, previa verificación.
2. ¿Se aceptan personas jurídicas con RUC 20? ¿Qué datos del representante legal deben constar y quién es el deudor del préstamo?
3. ¿Es obligatoria la evaluación Infocorp en el MVP o puede quedar para otra entrega? Si es obligatoria, ¿cómo demostramos esa evaluación con acceso autorizado?
4. ¿La consulta a un proveedor de DNI/RUC y la revisión presencial son suficientes para la primera presentación, o espera validación oficial de RENIEC?
5. Si se deja el registro de pagos para Sprint 2, ¿cómo se tratarán clientes que ya tienen préstamos anteriores, deudas canceladas o cuotas vencidas al empezar el MVP?
6. Para el Sprint 2, ¿permitirá abonos parciales a una cuota? ¿Qué ocurre si una cuota está vencida cuando el cliente desea adelantar cuotas futuras?
7. ¿Qué permisos tendrá cada agencia? ¿Los asesores pueden ver préstamos de otras agencias, aunque no puedan modificarlos?
8. ¿Se consideran 30 días comerciales exactos y 360 por año para todos los cronogramas? Es la configuración ya utilizada para el prototipo.

**En la exposición:** primero demostrar operaciones funcionando; mostrar las decisiones de alcance del MVP y luego citar las reglas que quedaron para el segundo sprint.
