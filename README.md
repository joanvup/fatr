# FATR — Registro de evaluación formativa y seguimiento

Aplicación web del **Learning Center** para diligenciar, consultar y exportar los cuatro formatos institucionales del libro *Formative Assessment tool record 2026*:

| Formato | Nombre | Módulo |
|---|---|---|
| PM-04-F22 | Observaciones por curso | `/observations` |
| PM-04-F23 | Seguimiento por estudiante | `/follow-ups` |
| PM-04-F24 | Relación de atención | `/attention` |
| PM-04-F25 | Registro de asistencia | `/attendance` |

Incluye autenticación multiusuario con roles, alcance por curso, privacidad del diagnóstico clínico, PDFs oficiales, importación/exportación en Excel, firmas digitales y un tablero de indicadores. El libro original `.xlsx` **no se modifica** y queda como referencia.

## Requisitos

- Node.js 20 o superior (probado con Node 24)
- npm
- Windows, macOS o Linux

## Puesta en marcha

```bash
npm install
cp .env.example .env        # En Windows: copy .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abre <http://localhost:3000>.

`npm install` ejecuta `prisma generate` mediante `postinstall`. Si el cliente queda bloqueado en Windows (`EPERM`), detén el servidor de desarrollo y vuelve a ejecutar `npx prisma generate`.

### Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | SQLite: `file:../data/fatr.db` (la ruta es relativa a `prisma/schema.prisma`) |
| `AUTH_SECRET` | Clave de firma de sesión. Genera una con `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` en desarrollo local |
| `AUTH_URL` | URL pública de la aplicación, por ejemplo `http://localhost:3000` |

### Credenciales demo

Todas usan la contraseña temporal **`Admin123!`**:

| Correo | Rol |
|---|---|
| `admin@fatr.local` | Administración |
| `coordinacion@fatr.local` | Coordinación |
| `terapeuta1@fatr.local` | Terapeuta |
| `terapeuta2@fatr.local` | Terapeuta |
| `docente1@fatr.local` | Docente |
| `docente2@fatr.local` | Docente |

Cambia estas contraseñas antes de usar la aplicación con datos reales. Cada usuario puede cambiarla en `/profile`; administración puede restablecerla en `/users`.

## Roles y alcance

- **Administración:** acceso total, usuarios, configuración, importación y exportación.
- **Coordinación:** gestión académica de todos los cursos, F22–F25, importación y exportación. Sin usuarios ni configuración.
- **Terapeuta:** estudiantes, F22, F23, F24, F25 y exportación, limitado a sus cursos asignados. Ve el diagnóstico clínico.
- **Docente:** consulta de estudiantes y F24/F25 de sus cursos; edita F22. No accede a F23, al diagnóstico clínico ni a importación/exportación.

La autorización se aplica en el servidor (páginas, Server Actions y rutas API), no solo ocultando botones. Los DTO eliminan el diagnóstico antes de enviarlo a un docente.

## Módulos

- **Panel (`/`):** estudiantes activos, sesiones de los últimos 30 días, tendencia de 8 semanas, avance de observaciones, seguimientos pendientes/vencidos y alertas.
- **Estudiantes (`/students`):** alta, edición, perfil con observaciones, seguimientos, terapias y asistencia. El diagnóstico clínico es privado.
- **Cursos (`/courses`):** CRUD, roster y asignación de docentes/terapeutas.
- **Observaciones F22 (`/observations`):** ciclos por curso/periodo y grilla con cinco dominios, fechas de citas, diagnóstico de remisión y seguimiento proyectado. Guardado transaccional y bloqueo al finalizar.
- **Seguimientos F23 (`/follow-ups`):** documento individual con diagnóstico, fechas y cuatro bloques de texto, historial y PDF.
- **Relación de atención F24 (`/attention`):** resumen derivado de asignaciones y asistencias; no se digita manualmente.
- **Asistencia F25 (`/attendance`):** hoja diaria con horario, profesional, firmas en canvas y PDF.
- **Catálogos (`/catalogs/*`):** dominios de observación y terapias/áreas de apoyo.
- **Usuarios (`/users`) y configuración (`/settings`):** solo administración.
- **Datos y reportes (`/import-export`):** plantillas y carga masiva de estudiantes, terapias y asistencia; exportaciones en Excel.
- **Mi cuenta (`/profile`):** datos y cambio de contraseña.

## PDFs oficiales

Las rutas requieren sesión y permiso del módulo:

```
GET /api/pdf/f22?cycleId=...
GET /api/pdf/f23?id=...
GET /api/pdf/f24?courseId=...&from=AAAA-MM-DD&to=AAAA-MM-DD
GET /api/pdf/f25?date=AAAA-MM-DD&courseId=...
```

Se abren en el navegador. Añade `&download=1` para forzar la descarga. El encabezado, logo, código, versión, vigencia y filas por página se configuran en `/settings`.

## Excel

Plantillas descargables desde `/import-export`:

- `/api/templates/students`
- `/api/templates/therapies`
- `/api/templates/attendance`

Flujo de carga: **analizar → revisar errores por fila → confirmar**. Nada se guarda hasta confirmar; el lote queda en `ImportBatch` con estado `PREVIEW` y luego `COMMITTED`. Los límites son 10 MB y 1000 filas.

Exportaciones:

- `/api/export/students`
- `/api/export/attendance?from=...&to=...&courseId=...`
- `/api/export/attention?from=...&to=...&courseId=...`
- `/api/export/observations?cycleId=...`
- `/api/export/followups`

Las consultas respetan el alcance por curso y la privacidad del diagnóstico.

No se leen directamente libros originales ya diligenciados: el layout del `.xlsx` usa celdas combinadas. Para datos históricos se recomienda convertirlos a las plantillas de la aplicación.

## Pruebas

```bash
npm run lint
npm run typecheck
npm test                  # Vitest: unitarias + integración con SQLite temporal
npx playwright install chromium
npm run test:e2e          # Playwright contra http://localhost:3000
```

Las pruebas de integración crean `data/test-integration.db` y lo recrean en cada ejecución. Las E2E reutilizan el servidor de desarrollo si está activo y requieren la base demo sembrada (`npx prisma db seed`).

Si ejecutaste `npm run build` con el servidor de desarrollo abierto, detén el servidor, borra `.next` y vuelve a iniciar `npm run dev`; Turbopack puede quedar con caché inconsistente y devolver errores 500 hasta limpiarla.

## Respaldos y restauración

```bash
npm run backup
```

El script hace un checkpoint de SQLite y copia la base a `backups/fatr-AAAAMMDD-HHmm.db`. Las firmas digitales están dentro de la base, por lo que el respaldo es completo.

Para restaurar:

1. Detén la aplicación.
2. Copia el archivo elegido sobre `data/fatr.db`.
3. Elimina `data/fatr.db-wal` y `data/fatr.db-shm` si existen.
4. Inicia la aplicación y verifica el acceso.

## Migración a MySQL

La aplicación evita enums, JSON, SQL específico de proveedor y fechas `DateTime` para los formularios. Las fechas de formato son cadenas ISO `AAAA-MM-DD`, las horas son `HH:mm` y los IDs son `cuid()`, lo que permite migrar sin reescribir la lógica.

1. **Respalda** SQLite con `npm run backup` y detén la aplicación.
2. Provisiona MySQL 8 con `utf8mb4_unicode_ci`.
3. Duplica el esquema en una rama o copy (`prisma/schema.mysql.prisma`) y cambia:
   - `provider = "mysql"`
   - `url = env("MYSQL_DATABASE_URL")`
   - Añade `@db.LongText` a campos de prosa: `Student.diagnosis`, `Observation.diagnosisNote`, `FollowUp.diagnosisSnapshot`, `descriptionInitial`, `strategies`, `achievements`, `followUpNotes`, `Attendance.notes`, `Setting.value`, `ImportBatch.rowsJson`.
   - Añade `@db.LongBlob` a `Signature.data`.
4. Genera el esquema en la base vacía:
   ```bash
   npx prisma migrate dev --schema prisma/schema.mysql.prisma --name init_mysql
   ```
   O bien genera un SQL revisable con `prisma migrate diff`.
5. Copia los datos preservando IDs y en orden de dependencias:
   `User`, `Course`, `UserCourse`, `Student`, `Domain`, `ObservationCycle`, `Observation`, `ObservationScore`, `FollowUp`, `Therapy`, `StudentTherapy`, `Attendance`, `Signature`, `ImportBatch`, `Setting`.
   Puedes usar dos clientes Prisma generados (uno SQLite y otro MySQL con `output` distinto) y `createMany` por lotes dentro de transacciones. Conserva los IDs para no romper relaciones.
6. Verifica conteos por tabla y ejecuta `npm test`, `npm run typecheck` y `npm run test:e2e` apuntando a MySQL.
7. Cambia `DATABASE_URL` a la cadena MySQL, conserva el respaldo SQLite y documenta el corte.

> Se fija **Prisma 6.19.3**. Prisma 7+ exige *driver adapters* (`@prisma/adapter-better-sqlite3`, adaptador MySQL) y no es necesario para esta versión.

## Estructura

```
prisma/                 esquema, migraciones y seed
public/brand/           logo institucional
src/app/                páginas (App Router) y rutas API
src/components/         UI, formularios y grillas
src/lib/                auth/dal, permisos, métricas, Excel, PDF
src/server/actions/     Server Actions
scripts/                respaldo
tests/unit|integration  Vitest
tests/e2e               Playwright
data/                   SQLite local (no versionado)
backups/                respaldos locales (no versionado)
```

## Seguridad

- Contraseñas con bcrypt (coste 12), sesión JWT en cookie HttpOnly/SameSite=Lax y expiración de 8 horas.
- Validación Zod en cliente y servidor; autorización por rol y curso en cada página, acción y API.
- Firmas PNG de máximo 200 KB servidas con autorización y `Cache-Control: no-store`.
- Importaciones limitadas a 10 MB, extensión `.xlsx`, parseo en memoria y errores controlados.
- No se registra el diagnóstico clínico en logs ni se envía a roles sin permiso.

## Fuera de alcance v1

Multi-institución, SSO, correo automático, auditoría detallada, PWA/offline y lectura directa de libros Excel originales ya diligenciados. El modelo y la arquitectura dejan espacio para incorporarlos.
