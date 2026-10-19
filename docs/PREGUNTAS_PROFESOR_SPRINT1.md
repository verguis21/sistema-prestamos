# Preguntas para el profesor — Sistema de Gestión de Préstamos Personales

## Preguntas prioritarias (Sprint 1)

1. ¿La tasa ordinaria es 30 % TEA, o requiere mostrar también TCEA?
2. ¿El crédito incluye seguros, gastos administrativos u otras comisiones obligatorias?
3. ¿El 1 % diario por atraso es interés moratorio, penalidad o comisión?
4. ¿El 1 % diario se aplica a cuota completa, capital vencido u otra base? ¿Hay límite aplicable?
5. ¿La mora comienza desde el día siguiente al vencimiento y cuenta días calendario?
6. ¿La clasificación extrajudicial inicia a los 360 días desde la cuota impaga más antigua? ¿Qué ocurre al regularizar atrasos?
7. ¿Se aceptan evidencias de estados obtenidas con lógica real del backend y consultas de solo lectura a una BD de pruebas sin registrar cobros desde la interfaz?
8. ¿El módulo de registro operativo de cuotas completas/adelantos queda para el Sprint 2?
9. ¿En Sprint 1 basta verificar manualmente la empresa en SUNAT y revisar la documentación de representación, reservando integración automática para Sprint 2?
10. ¿Cuál es la entidad deudora en RUC 20: empresa, representante o ambos, y cómo aplica el límite de S/ 10 000?
11. ¿El panel del gerente del Sprint 1 será global o necesita filtros por las cinco agencias?
12. ¿Qué evidencias y funciones específicas exige para aprobar el Sprint 1?

## Preguntas de alcance y criterio de negocio (Sprint 2 o posteriores)

13. ¿Qué documentos o consultas prueban facultades vigentes del representante y quién autoriza su validación?
14. ¿Los pagos deben admitir atención en cualquier agencia? ¿El comprobante será un recibo interno o documento sujeto a requisitos formales?
15. ¿Los adelantos pagan cuotas completas consecutivas sin cambiar cronograma, fechas ni cuota fija?
16. ¿Se admite devolver el estado del cliente a VIGENTE cuando se regularicen todas las cuotas vencidas y queden cuotas futuras?
17. ¿Qué reportes de dinero efectivamente recibido, mora recuperada, rentabilidad y pérdidas quiere el gerente después del módulo de pagos?
18. ¿Cómo se manejarán cambios de asesor o sucursal y permisos de supervisión?
19. ¿Deben contemplarse solicitudes simultáneas que compitan por el mismo límite global, y qué evidencia de concurrencia exige?
20. ¿Se requiere contrastar con un ejemplo de S/ 1 000 a 12 cuotas para validar el cronograma francés a TEA 30 %?

## Importante

- No aplicar el 1 % diario hasta precisar concepto, base, inicio, límites y validez legal.
- La TCEA ordinaria no incorpora automáticamente cargos contingentes por incumplimiento.
- SUNAT permite consultar datos tributarios, pero ello no constituye por sí solo una verificación suficiente de facultades de representación; acordar cómo revisarlas manualmente.
- No confundir tests unitarios de transición con un pago realmente registrado en una base de datos.
