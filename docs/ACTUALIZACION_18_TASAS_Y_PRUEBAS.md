# Actualización 18 — Fórmula financiera y casos reales de prueba

**Fecha:** 19/10/2026 · **Sistema:** Gestión de Préstamos Personales (Agile Development, Sprint 1)

## A. Diagnóstico comprobado: por qué aparecen S/ 5.41 y S/ 5.59

Se revisó el **código real** `apps/api/src/modules/prestamos/calculo.ts` y la página `https://finanzasperu.pe/calculadora-prestamo-peru`.

Con `P=S/100`, `n=24` cuotas, `TEA=30%`, sin costos adicionales:

| Operación | Proyecto | Página (modo simple) |
|---|---:|---:|
| Tasa efectiva por período | `(1+0.30)^(30/360)-1` = `2.210445059%` | `0.30/12` = `2.500000%` |
| Cuota francesa teórica | `S/5.41398862` | `S/5.59128204` |
| Total teórico antes de redondear | `S/129.9357` | `S/134.1908` |
| Total mostrado | `S/129.94` | `S/134.19` |
| Intereses aproximados | `S/29.94` | `S/34.19` |

**Diagnóstico:** la página describe el 30% como TEA, pero en su explicación matemática del modo simple divide esa tasa entre 12. Ese cálculo sería coherente con **30% tasa nominal anual, capitalización mensual**, no con **30% TEA**. La TEA equivalente a `2.5%` mensual es `(1+.025)^12-1 = 34.4888824%`.

La propia página incluye en sus preguntas frecuentes la conversión correcta `TEM=(1+TEA)^(1/12)-1`, distinta de la explicación anterior. El sitio también declara que solo calcula TCEA con otros cargos en **modo avanzado**, no con la división simple TEA/12.

**No hay autorización para sustituir la TEA de 30% confirmada por una tasa nominal distinta.** Por tanto, esta actualización no cambia cálculos ni deudas guardadas. El aspecto de la TCEA queda pendiente del profesor: primero debe definir seguros, comisiones permitidas y otros costos obligatorios. El 1% diario por atraso es una regla provisional, NO se aplica ni se considera cobro. Consultar legalidad vigente; SBS especifica cargos prohibidos por atraso distintos al interés moratorio.

## B. Archivos de esta entrega

- `apps/web/src/PrestamosPanel.tsx`: único cambio visible: una nota concisa en la **parte inferior del cronograma detallado** indicando la TEA y tasa efectiva de 30 días, sin sobrecargar la pantalla del asesor. Funciones, botones y estados intactos.
- `apps/api/tests/comparacion-finanzas-peru.test.mjs`: 5 pruebas nuevas contra **el motor original del código**, sin tocar BD.
- `apps/api/src/scripts/comparacion-financiera.ts`: informe local entre TEA efectiva y 30% dividido entre 12; solo lectura, no toca BD.
- `apps/api/src/scripts/conexion-pruebas-sprint1.ts`: conexión exclusiva a Supabase de pruebas identificada por referencia de proyecto; no utiliza la URL de producción.
- `apps/api/src/scripts/crear-casos-gerencia-pruebas.ts`: crea una sola vez, **solo en una BD de pruebas vacía**, tres clientes ficticios y préstamos guardados realmente con el motor financiero original. No marca cuotas PAGADA. Rechaza escribir en producción y rechaza bases con clientes/préstamos existentes.
- `apps/api/src/scripts/auditar-casos-gerencia-pruebas.ts`: consulta SOLO LECTURA las magnitudes para cotejarlas con el endpoint del gerente, sin revelar DNI, RUC ni credenciales.

**No ejecutar los scripts de BD contra la instancia que contiene S/ 29 100 ni contra clientes reales.** Para comparar la fórmula NO hace falta una segunda BD; para insertar casos sí.

## C. Primera fase inmediata: revisión SIN acceso a Supabase

En VS Code / PowerShell, desde la raíz actual `C:\Users\verga\Desktop\sistema-prestamos`:

```powershell
cd apps/api
node --version
node --experimental-strip-types --test .\tests\sprint1-regresion.mjs .\tests\comparacion-finanzas-peru.test.mjs
npx tsx src/scripts/comparacion-financiera.ts
cd ../web
npm run build
npm run dev
```

Si el equipo tiene Node 24, el flag `--experimental-strip-types` también puede mantenerse. La ejecución esperada del test: **19 pruebas correctas, 0 fallidas**. Revisa el cronograma del préstamo S/100 a 24 cuotas: debe seguir mostrando S/129.94 de total. No realizar nuevos préstamos para comprobar la diferencia. El informe imprime la cifra de referencia web S/134.19, pero NO cambia la tasa usada por el sistema.

Antes de compilar el backend completo, una vez generadas las dependencias en Windows:

```powershell
cd apps/api
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run build
```

Estos comandos no ejecutan migraciones ni realizan escrituras en Supabase. Si el esquema ya fue migrado, NO vuelvas a ejecutar migraciones hasta verificar `npx prisma migrate status` en la base correspondiente.

## D. Segunda fase: estados en una Supabase de pruebas SEPARADA

**No ejecutar todavía si solo tienes un proyecto Supabase.** Crear desde el panel de Supabase un segundo proyecto exclusivamente académico, distinto del original. No exportar ni copiar clientes reales, contraseñas o deudas. El proyecto de pruebas debe tener el mismo esquema y migraciones que el sistema y las 5 agencias más usuarios de prueba; no necesita datos reales. Confirmar proyecto real y proyecto nuevo por separado.

Una vez que el proyecto independiente y vacío esté disponible:

1. Aplica allí las migraciones del repositorio según las instrucciones del proyecto, comprobando que la variable `DATABASE_URL` apunta **solo** a la BD de pruebas durante la ejecución. No modificar `.env` principal ni ejecutar `migrate reset`, `db push --force-reset` o borrar producción.
2. Prepara cinco agencias y al menos un asesor DE PRUEBAS en esa instancia (puede usar los scripts existentes del proyecto, revisando previamente que apuntan a la instancia de pruebas). Prepara un gerente de pruebas para visualizar resultados.
3. Configura variables de sesión temporal en PowerShell. NO pegues ni envíes claves al chat. Sustituye las referencias por las que ves en Supabase; estas identifican proyectos, no son contraseñas:

```powershell
cd apps/api
$env:DATABASE_URL_PRUEBAS = 'postgresql://...URL_SOLO_DEL_PROYECTO_DE_PRUEBAS...'
$env:SUPABASE_REF_PRUEBAS = 'REFERENCIA_PROYECTO_NUEVO'
$env:SUPABASE_REF_PRODUCCION = 'REFERENCIA_PROYECTO_ACTUAL'
$env:CONFIRMAR_ESCRITURA_BD_PRUEBAS = 'SOLO_BD_AISLADA_VACIA'
npx tsx src/scripts/crear-casos-gerencia-pruebas.ts
npx tsx src/scripts/auditar-casos-gerencia-pruebas.ts
```

El script valida las referencias contra el host/usuario de la URL; no acepta URL igual a producción, tampoco DB con clientes, préstamos o cuotas ya creadas. **No ejecuta migraciones, no borra nada, no activa pagos**. Si el script se niega a ejecutar, NO elimines los controles: revisa que sea verdaderamente una base independiente.

4. Para verlos en **la interfaz real**, ejecuta el backend local con su `DATABASE_URL` temporalmente apuntando a esta nueva base de pruebas, autentícate con asesor y gerente **de pruebas** y verifica `GET /api/gerencia/resumen`. Deben cambiar de forma persistente los indicadores `MOROSO`, `EXTRAJUDICIAL`, cuotas vencidas y capitales. El frontend no muestra mocks ni cantidades fijadas.
5. Regresa la conexión local a producción **solo después** de cerrar servidores de pruebas y retirar variables temporales. No publicar los usuarios o datos académicos en producción.

### Resultados previstos en la base vacía de pruebas

Los casos se crean con fechas relativas a la fecha **actual de Perú** para que su clasificación sea válida aunque se ejecuten otro día:

| Cliente ficticio | Capital | Plazo | Fecha del préstamo | Estado esperado |
|---|---:|---:|---|---|
| CASO VIGENTE | S/100 | 12 | Hoy | VIGENTE |
| CASO MOROSO | S/200 | 12 | Hace 60 días | MOROSO (una cuota o más vencidas) |
| CASO EXTRAJUDICIAL | S/300 | 24 | Hace 450 días | EXTRAJUDICIAL (regla provisional 360 días) |

Al ser una BD de pruebas vacía: **3 préstamos registrados, 3 clientes únicos, S/600 de capital colocado**, además de cuotas vencidas reales según fechas. No hay cuotas PAGADA ni ingresos cobrados, de acuerdo con Sprint 1. En un entorno con otros registros, la herramienta **se niega a sembrar**.

Para probar LIQUIDADO, pagos y recuperación a VIGENTE mediante transacciones persistentes, sigue siendo necesario que el profesor autorice la función de registro de pagos o el mecanismo auditable acordado. No se alteran directamente campos de estado para fingir cobros.

### Qué fotografiar como evidencias

- Terminal con 19 pruebas correctas.
- Informe matemático comparando TEA/TNA para S/100 y 24 cuotas.
- Cronograma real de 24 cuotas: capital, interés, saldo final cero.
- Asesor consultando el préstamo VIGENTE y el MOROSO en la base académica.
- Gerente con resumen actualizado de los tres préstamos registrados de prueba, sin mostrar información personal ni contraseñas.
- Mismo corte horario del backend y misma base de prueba al cotejar gerencia contra auditoría.

## E. Pendiente exacto para el profesor

1. ¿Es **30% TEA efectiva anual** o **30% tasa nominal anual capitalizable mensualmente**? La comparación de la página muestra que la diferencia es importante.
2. ¿Se requiere informar TCEA? Si sí, ¿qué seguros y costos obligatorios aplican y cuáles están permitidos por ley?
3. ¿El 1% diario es interés moratorio? ¿Cuál es su base legal y base monetaria? Evitar comisiones por atraso prohibidas y cobros no autorizados.
4. ¿El umbral extrajudicial sigue siendo de 360 días desde primera cuota impaga?
5. ¿Confirma que registro de pagos completo y adelantos pasan a Sprint 2?

## F. Archivos que NO debes incluir al subir código

El ZIP original del usuario contiene dependencias `node_modules`, `.env`, copias de SQL y metadatos locales `.git`/`supabase/.temp`. **No subir ni reenviar esos contenidos**. Este paquete excluye todo ello y contiene solo siete archivos de código y esta guía.

No subir automáticamente a `master`: compila y prueba en Windows primero. Este cambio no requiere migraciones nuevas ni modifica cronogramas históricos.
