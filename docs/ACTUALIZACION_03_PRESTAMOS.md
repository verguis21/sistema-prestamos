# Sprint 1 — Módulo Préstamos

**Historias cubiertas:** registrar préstamos; validar capital máximo por cliente; generar cronograma francés; consultar e imprimir cronograma.

**Criterios de aceptación:**

- Un trabajador autenticado selecciona un cliente registrado, ingresa capital, fecha y plazo.
- El sistema simula sin guardar, muestra cuota, intereses, total y vencimientos cada 30 días.
- El sistema no permite superar S/ 10 000 de capital original activo acumulado, ni plazos fuera de 1 a 60 meses.
- El trabajador confirma y se guardan el préstamo, su agencia y todas las cuotas.
- El listado muestra solo préstamos de su agencia; los detalles se consultan tras autenticación.
- La cuota incorpora TEA 30%, amortización francesa, base 360 y redondeo con saldo final 0.
- No existen pagos en Sprint 1; ninguna cuota pasa a PAGADA de forma automática.

**Evidencias para docente:** pantalla de sesión, búsqueda/registro de cliente, formulario de préstamo, vista previa, prueba de monto excedido, cronograma guardado, tablas de Supabase y comando de pruebas automatizadas.

**Pendiente de aclaración:** evaluación de Infocorp, condiciones para RUC 20, pagos parciales y operaciones de mora. Se tratarán según resolución del profesor.
