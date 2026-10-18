# Cliente único + atención en varias agencias (MVP)

## Regla aprobada por el equipo

- `Cliente` es **global**: una sola identidad por persona natural, sin crear copias en otras agencias.
- `Agencia` identifica las cinco sucursales. Cada trabajador tiene asignada una.
- `ClienteAgencia` registra la relación entre cliente y agencia **cuando existe una atención confirmada**: alta original del cliente, asociación presencial de un cliente existente, o registro de un préstamo allí.
- La pantalla Clientes muestra **solo los vinculados con la sucursal actual** y, por compatibilidad con datos previos, los que ya tienen préstamos originados en dicha sucursal.
- Buscar por **DNI exacto (8 dígitos)** o **RUC10 exacto (11 dígitos válidos)** permite encontrar una persona en la empresa, aunque venga de otra agencia. Buscar por **nombre o documento parcial** se limita a la agencia propia.
- Consultar un documento **no crea automáticamente** la relación con una agencia. Solo el registro/confirmación presencial del trabajador o la aprobación de un préstamo la crea.
- Préstamos continúan ligados a su sucursal de origen. El límite de S/ 10 000 se calcula a nivel del cliente **en toda la empresa**, no por agencia.
- El registro de pagos en cualquier agencia sigue **fuera del MVP** (Sprint 2). No se cambia ninguna fórmula financiera.

## Casos de prueba

1. Asesor Trujillo da de alta al cliente de prueba A: aparece en Trujillo, **no** en Chimbote.
2. Asesor Chimbote busca por DNI exacto del cliente A: lo encuentra para tramitar un préstamo; no crea otra persona ni cambia su ID.
3. Antes de registrar préstamo, el asesor Chimbote puede consultar su documento y confirmar presencialmente la vinculación. Desde entonces A aparece en Chimbote y Trujillo.
4. Alternativamente, al registrar un préstamo de A en Chimbote, queda vinculado allí automáticamente. El préstamo queda en la agencia Chimbote y los anteriores siguen en Trujillo.
5. A está comprometido por S/ 9 000 entre agencias: intentar S/ 2 000 en otra sucursal se rechaza por sobrepasar S/ 10 000.
6. Cambiar sesión no filtra ni duplica la entidad Cliente; solo cambia la lista local de atención.
7. Si se consulta/valida un documento pero no se registra ni concede un préstamo, la persona **no** aparece en esa nueva agencia.

## Clientes anteriores a la nueva migración

Los datos antiguos **no se borran**. Aquellos con préstamos en una agencia ya aparecen allí. Para clientes anteriores **sin préstamos**, no hay datos fiables en las tablas viejas para determinar dónde fueron dados de alta. No los asignamos arbitrariamente a Trujillo ni a otras oficinas.

Se pueden vincular por **nueva atención presencial** desde el formulario de Clientes. Si necesitas conservar su agencia inicial documentada en pruebas, ejecuta el script opcional `src/scripts/vincular-cliente-anterior.ts` con el ID y correo de asesor correspondientes, después de comprobar en qué oficina fueron realmente registrados.

## Pendientes del profesor

- Confirmar que los S/ 10 000 se aplican globalmente a todas las agencias.
- Confirmar la política DNI/RUC10 del mismo cliente y si se admitirá RUC20.
- Determinar exactamente qué datos de clientes/préstamos de otra agencia puede ver cada trabajador.
- Establecer el mecanismo aprobado de verificación oficial de identidad y el tratamiento de Infocorp.
