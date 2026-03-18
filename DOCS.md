# Rheb App — Documentación Técnica

> Web app mobile-first para el gimnasio **Rheb** (Argentina). Migra la gestión desde Excel hacia una PWA instalable en celulares sin pasar por App Stores. Enfocada en fuerza, acondicionamiento y rehabilitación (ej. LCA).

---

## Tabla de Contenidos

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Base de Datos — Schema Completo](#3-base-de-datos--schema-completo)
4. [Roles y Rutas](#4-roles-y-rutas)
5. [Flujos por Rol](#5-flujos-por-rol)
6. [Autenticación](#6-autenticación)
7. [Sistema de Turnos](#7-sistema-de-turnos)
8. [Componentes](#8-componentes)
9. [Server Actions](#9-server-actions)
10. [Queries](#10-queries)
11. [Configuración del Entorno](#11-configuración-del-entorno)
12. [Scripts](#12-scripts)
13. [PWA](#13-pwa)
14. [Roadmap](#14-roadmap)
15. [Decisiones de Diseño UX](#decisiones-de-diseño-ux)

---

## 1. Stack Tecnológico

| Capa          | Tecnología                        | Notas                                                          |
|---------------|-----------------------------------|----------------------------------------------------------------|
| Framework     | Next.js 15 — App Router           | SSR, Server Actions, `params`/`searchParams` son `Promise<>`  |
| Lenguaje      | TypeScript                        | Tipado end-to-end con Drizzle                                  |
| Estilos       | TailwindCSS v4 + shadcn/ui v4     | shadcn v4 usa `@base-ui/react`, NO `@radix-ui`                |
| Base de datos | Neon (PostgreSQL serverless)      | Pooled connection via `@neondatabase/serverless`               |
| ORM           | Drizzle ORM + drizzle-kit         | `alias()` de `drizzle-orm/pg-core` para self-joins            |
| Autenticación | Auth.js v5 (next-auth@beta)       | Credentials + bcryptjs. **Sin magic link** (emails no llegaban)|
| Gráficos      | Recharts v3                       | Tipos Formatter: omitir anotación explícita `v: number`       |
| PWA           | Service Worker manual             | `public/sw.js` + `public/manifest.json`                       |

**Gotchas críticos:**
- `searchParams` y `params` en páginas de Next.js 15 son `Promise<{...}>` → siempre `await`.
- `SheetTrigger` de shadcn v4 **no** soporta `asChild`. Usar dialogs controlados con `useState`.
- Drizzle: columnas en `.select({})` deben ser columnas o SQL expressions; nunca valores literales.
- Para joins de la misma tabla: `const coachUsers = alias(users, "coach_users")`.
- `onConflictDoNothing()` necesario en junction tables para evitar PK duplicada.
- **Columnas `timestamp` de Drizzle devuelven `Date` nativo, no `string`.** Usar `format(new Date(col), ...)` — **nunca** `parseISO(col.toString())` (Date.toString() no es ISO válido → RangeError "Invalid time value"). Afecta cualquier columna tipo `timestamp` como `paidAt`, `createdAt`, etc.

---

## 2. Estructura del Proyecto

```
rheb-app/
├── public/
│   ├── rheb.png
│   ├── manifest.json
│   └── sw.js
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx           ← Login email+contraseña
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx               ← TopBar + BottomNav
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx             ← Stats globales + revenue + coaches
│   │   │   │   ├── alumnos/
│   │   │   │   │   ├── page.tsx         ← Lista compacta (link a ficha)
│   │   │   │   │   └── [id]/page.tsx    ← Ficha completa del alumno (admin)
│   │   │   │   ├── coaches/page.tsx     ← CRUD coaches
│   │   │   │   └── calendario/page.tsx  ← Calendario todas las sesiones
│   │   │   │
│   │   │   ├── coach/
│   │   │   │   ├── page.tsx             ← (redirect → /coach/calendario)
│   │   │   │   ├── calendario/page.tsx  ← Solicitudes de cambio + Vista semana + gestión horario
│   │   │   │   ├── alumnos/
│   │   │   │   │   ├── page.tsx         ← Lista alumnos
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx     ← Ficha + progreso del alumno
│   │   │   │   │       └── sesion/page.tsx ← Registro sesión en sala
│   │   │   │   ├── rutinas/
│   │   │   │   │   ├── page.tsx         ← Lista rutinas (con duplicar)
│   │   │   │   │   └── [id]/page.tsx    ← Editor de rutina
│   │   │   │   ├── ejercicios/page.tsx  ← Biblioteca de ejercicios
│   │   │   │   └── perfil/page.tsx      ← Perfil del coach (editar + push toggle)
│   │   │   │
│   │   │   └── student/
│   │   │       ├── page.tsx             ← Home: wellness + plan + turnos
│   │   │       ├── calendario/page.tsx  ← Turnos semana + cambiar horario + cancelar
│   │   │       ├── elegir-horario/page.tsx ← Selección de días fijos
│   │   │       ├── rutina/page.tsx      ← Rutina asignada
│   │   │       ├── sesion/page.tsx      ← Registro sesión (alumno)
│   │   │       ├── progreso/page.tsx    ← Gráficos PRs y volumen
│   │   │       └── perfil/page.tsx      ← Perfil del alumno
│   │   │
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── api/push/subscribe/route.ts  ← Web Push: suscribir/desuscribir
│   │   ├── layout.tsx
│   │   ├── page.tsx                     ← Redirect por rol
│   │   └── globals.css                  ← Tema #00664e
│   │
│   ├── components/
│   │   ├── ui/                          ← shadcn (Button, Badge, Card, Dialog, Input, Label, Select, Sheet, Tabs, Textarea, Avatar)
│   │   ├── layout/
│   │   │   ├── TopBar.tsx
│   │   │   ├── BottomNav.tsx            ← 4 tabs por rol
│   │   │   └── PwaRegister.tsx
│   │   ├── admin/
│   │   │   ├── CreateStudentDialog.tsx  ← Alta alumno + plan opcional
│   │   │   ├── CreatePlanDialog.tsx
│   │   │   ├── CreateCoachDialog.tsx
│   │   │   ├── ImportStudentsDialog.tsx ← Importación masiva CSV/JSON
│   │   │   ├── AssignPlanDialog.tsx     ← Renovar plan + pago en un paso
│   │   │   ├── AddPaymentDialog.tsx     ← Registrar pago + historial
│   │   │   ├── EditStudentDialog.tsx    ← Editar datos personales del alumno
│   │   │   ├── RescheduleBookingDialog.tsx ← Reprogramar turno (date picker)
│   │   │   ├── ChangeCoachDialog.tsx    ← Cambiar coach asignado
│   │   │   ├── ResetPasswordDialog.tsx  ← Reset contraseña manual
│   │   │   └── DeleteStudentButton.tsx  ← Eliminar con confirmación
│   │   ├── coach/
│   │   │   ├── ScheduleManager.tsx      ← Grid horario (read-only) con alumnos por slot
│   │   │   ├── AssignStudentScheduleDialog.tsx ← Day-toggle + time-select, límite planDays
│   │   │   ├── CreateBookingDialog.tsx  ← Crear turno (simple o recurrente)
│   │   │   ├── RescheduleBookingDialog.tsx ← Slots disponibles → WhatsApp
│   │   │   ├── RescheduleRequestsPanel.tsx ← Panel solicitudes de cambio de horario
│   │   │   ├── EditCoachProfileDialog.tsx  ← Editar perfil del coach
│   │   │   ├── CoachPushToggle.tsx      ← Toggle push "Cancelaciones de turnos"
│   │   │   ├── DuplicateRoutineButton.tsx  ← Duplicar rutina con ícono Copy
│   │   │   ├── MetricsPanel.tsx         ← ROM/Dolor/Tests con Dialog centrado
│   │   │   ├── WellnessHistory.tsx      ← Grid 14 días bienestar
│   │   │   ├── RoutineEditor.tsx        ← Constructor de rutinas
│   │   │   ├── AttendanceButton.tsx
│   │   │   └── PaymentBadge.tsx
│   │   ├── student/
│   │   │   ├── SchedulePicker.tsx       ← Day-toggle + time-select, límite planDays
│   │   │   ├── CancelBookingDialog.tsx  ← Cancelar turno + WhatsApp al coach
│   │   │   ├── RescheduleRequestButton.tsx ← Solicitar/gestionar cambio de horario
│   │   │   └── WellnessCheckIn.tsx
│   │   ├── CalendarWeek.tsx             ← Calendario semanal (3 roles)
│   │   ├── SessionLogger.tsx            ← Registro de sets en sala
│   │   └── ProgressCharts.tsx           ← Gráficos Recharts
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                 ← Conexión Drizzle + Neon
│   │   │   └── schema.ts                ← 17 tablas + type OfferedSlot
│   │   ├── metrics-config.ts            ← 20 tipos de métricas (ROM/Dolor/Tests)
│   │   ├── push.ts                      ← sendPushToUser (web-push + limpieza automática)
│   │   ├── queries/
│   │   │   ├── admin.ts
│   │   │   ├── coach.ts
│   │   │   ├── student.ts
│   │   │   ├── calendar.ts
│   │   │   ├── schedule.ts
│   │   │   ├── sessions.ts
│   │   │   ├── wellness.ts
│   │   │   ├── metrics.ts
│   │   │   ├── payments.ts
│   │   │   └── rescheduleRequest.ts     ← Solicitudes de cambio de horario
│   │   ├── actions/
│   │   │   ├── admin.ts
│   │   │   ├── schedule.ts
│   │   │   ├── booking.ts
│   │   │   ├── routines.ts
│   │   │   ├── sessions.ts
│   │   │   ├── wellness.ts
│   │   │   ├── metrics.ts
│   │   │   ├── payments.ts
│   │   │   ├── coach.ts                 ← updateCoachProfile
│   │   │   └── rescheduleRequest.ts     ← CRUD solicitudes de cambio
│   │   ├── auth.ts
│   │   └── utils.ts
│   │
│   ├── types/next-auth.d.ts
│   └── middleware.ts
│
├── drizzle.config.ts
├── next.config.ts
└── DOCS.md
```

---

## 3. Base de Datos — Schema Completo

Todas las tablas en `src/lib/db/schema.ts` — Drizzle ORM sobre PostgreSQL (Neon).

### Autenticación (Auth.js)

| Tabla                 | Descripción                                    |
|-----------------------|------------------------------------------------|
| `users`               | Base de usuarios con campo `role`              |
| `accounts`            | Proveedores (credentials)                      |
| `sessions`            | Sesiones activas                               |
| `verification_tokens` | Tokens temporales                              |

### Perfiles

| Tabla      | Campos clave                                                                                           |
|------------|--------------------------------------------------------------------------------------------------------|
| `coaches`  | `userId`, `specialty`, `bio`, `whatsappNumber`                                                         |
| `students` | `userId`, `coachId`, `sport`, `objectives`, `injuryHistory`, `startDate`, `whatsappNumber`             |

### Planes y Pagos

| Tabla           | Descripción                                                     |
|-----------------|-----------------------------------------------------------------|
| `plans`         | Nombre, `daysPerWeek`, `price`, `active`                        |
| `student_plans` | Asignación plan→alumno: `startDate`, `endDate`, `status`        |
| `payments`      | `amount`, `paidAt`, `method`, `periodCovered`, `notes`, `registeredBy` |

### Sistema de Turnos

| Tabla              | Descripción                                                                                    |
|--------------------|------------------------------------------------------------------------------------------------|
| `schedule_slots`   | Turno recurrente: `coachId`, `dayOfWeek` (0=Lun…6=Dom), `startTime`, `maxCapacity`, `active`  |
| `slot_assignments` | Junction table N:N `(slotId, studentId)` — PK compuesta. Reemplazó `assignedStudentId` 1:1    |
| `bookings`         | Instancia concreta: `studentId`, `slotId`, `date` (YYYY-MM-DD), `status`                      |
| `attendance`       | `bookingId`, `present` (bool), `registeredBy`                                                  |

**Convención días:** schema usa **Mon=0 … Sun=6**. JavaScript `Date.getDay()` usa Sun=0…Sat=6.
Conversión: `targetJsDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1`

**Migración importante:** `schedule_slots.assignedStudentId` (1:1) fue eliminado y reemplazado
por la tabla junction `slot_assignments` para soportar múltiples alumnos por slot (`maxCapacity`).
Se aplicó con `npx drizzle-kit push --force` (columna tenía datos).

### Entrenamiento

| Tabla                 | Descripción                                                                     |
|-----------------------|---------------------------------------------------------------------------------|
| `exercises`           | Biblioteca: `name`, `category`, `description`, `videoUrl`, `isGlobal`, `coachId` |
| `routines`            | Programa: `coachId`, `name`, `description`                                      |
| `routine_assignments` | Rutina → alumno, `active`                                                       |
| `routine_blocks`      | Bloques ordenados dentro de una rutina                                          |
| `routine_exercises`   | Ejercicio en bloque: `sets`, `reps`, `technicalNotes`, `order`                  |
| `training_sessions`   | Sesión ejecutada: `studentId`, `coachId`, `date`, `routineId`, `completedAt`    |
| `session_logs`        | Series por ejercicio: `setsData` JSONB → `[{set, weight, reps, rpe}]`          |

### Seguimiento

| Tabla               | Descripción                                                                      |
|---------------------|----------------------------------------------------------------------------------|
| `wellness_logs`     | Check-in pre-sesión: `sleep`, `fatigue`, `pain`, `mood` (escalas 1-5/0-10)      |
| `metrics`           | PRs, ROM, tests de campo: `type`, `value`, `unit`, `recordedAt`, `notes`        |
| `notes`             | Bitácora cualitativa con tags, visible para coach y alumno                       |
| `push_subscriptions`| Endpoint/keys Web Push por usuario, con preferencias (`notifyBookingReminder`, etc.) |

### Solicitudes de cambio de horario

| Tabla                  | Descripción                                                                                 |
|------------------------|---------------------------------------------------------------------------------------------|
| `reschedule_requests`  | Solicitud de cambio de turno iniciada por el alumno. Ver detalles abajo.                   |

**Campos de `reschedule_requests`:**

| Campo          | Tipo                                              | Descripción                                              |
|----------------|---------------------------------------------------|----------------------------------------------------------|
| `id`           | text PK                                           | UUID                                                     |
| `bookingId`    | text → `bookings.id` (cascade)                    | Turno original que se quiere cambiar                     |
| `studentId`    | text → `students.id` (cascade)                    | Alumno que hace la solicitud                             |
| `coachId`      | text → `coaches.id` (cascade)                     | Coach que debe responder                                 |
| `studentNote`  | text nullable                                     | Mensaje opcional del alumno ("prefiero el viernes…")    |
| `status`       | enum `reschedule_request_status`                  | `pending` → `approved` / `rejected` / `offered`         |
| `coachNote`    | text nullable                                     | Respuesta/motivo del coach                               |
| `offeredSlots` | jsonb nullable → `OfferedSlot[]`                  | Slots ofrecidos por el coach para que el alumno elija   |
| `createdAt`    | timestamp                                         | Creación                                                 |
| `updatedAt`    | timestamp                                         | Última modificación                                      |

**Enum `reschedule_request_status`:** `pending` · `approved` · `rejected` · `offered`

**Tipo `OfferedSlot`** (exportado desde `schema.ts`):
```ts
type OfferedSlot = { slotId: string; date: string; startTime: string; dayLabel: string }
```

---

## 4. Roles y Rutas

| Rol       | Login redirect       | Rutas principales                                                                |
|-----------|----------------------|---------------------------------------------------------------------------------|
| `admin`   | `/admin`             | `/admin`, `/admin/alumnos`, `/admin/alumnos/[id]`, `/admin/coaches`, `/admin/calendario` |
| `coach`   | `/coach/calendario`  | `/coach/calendario`, `/coach/alumnos`, `/coach/alumnos/[id]`, `/coach/rutinas`, `/coach/ejercicios`, `/coach/perfil` |
| `student` | `/student`           | `/student`, `/student/calendario`, `/student/elegir-horario`, `/student/rutina`, `/student/progreso`, `/student/perfil` |

**BottomNav por rol:**
- Admin: Dashboard · Calendario · Alumnos · Coaches
- Coach: Calendario · Alumnos · Rutinas · Perfil
- Student: Inicio · Turnos · Rutina · Perfil

---

## 5. Flujos por Rol

### Flujo del Coach — Día típico

```
1. Abre app → /coach/calendario (tab Semana)
   - Si hay solicitudes de cambio pendientes: sección "Solicitudes de cambio" con badge
     - Por cada solicitud: nombre del alumno, turno original, nota del alumno
     - Acciones: [Reprogramar] → elige nuevo slot | [Ofrecer opciones] → multi-select | [Rechazar] → nota
   - Vista semanal de todos sus turnos (CalendarWeek debajo del panel)
   - Navega semanas con flechas ← →
   ↓
2. En cada turno del día:
   - Ve nombre del alumno + badge de plan (días restantes)
   - Marca asistencia (Presente/Ausente)
   - Si necesita reagendar: ícono → elige nuevo slot disponible →
     recibe link WhatsApp pre-cargado para avisar al alumno
   ↓
3. Tab "Horario" en /coach/calendario:
   - Configura bloques horarios por día (ej: Lunes 7am–5pm = 10 turnos)
   - ScheduleManager: grid read-only de slots con alumnos asignados + capacidad X/Y
   - Para asignar alumno a días: AssignStudentScheduleDialog (day-toggle + time-select)
   ↓
4. Sesión en sala (/coach/alumnos/[id]/sesion):
   - Ve la rutina del alumno
   - Carga series: peso + reps + RPE
   - Cronómetro en tiempo real
   - Cada set se guarda inmediatamente
```

### Flujo del Alumno — Primer ingreso (con plan)

```
1. Recibe credenciales → Login → /student
   ↓
2. Home muestra CTA "Configurá tu horario" (si plan activo + coach asignado + sin slots)
   ↓
3. /student/elegir-horario:
   - Day-toggle: 7 botones (L M X J V S D), deshabilitados si no hay slots ese día
   - Solo puede seleccionar hasta planDays días (límite enforced client-side)
   - Para cada día activo: <select> con horarios disponibles del coach
   - Confirma → se generan 8 semanas de bookings automáticamente
   ↓
4. Redirige a /student/calendario con todos los turnos creados
```

### Flujo del Alumno — Cambio de horario permanente

```
1. /student/calendario → link "Cambiar" en badge del plan
   ↓
2. /student/elegir-horario con días pre-seleccionados (actuales)
   ↓
3. Puede deseleccionar días y elegir nuevos (mismo límite planDays)
   ↓
4. Confirmar → resetea todas las asignaciones y genera nuevos bookings
```

### Flujo del Alumno — Solicitud de cambio de turno individual

```
1. /student/calendario → turno futuro confirmado → botón "Cambiar horario" (azul)
   ↓
2. Dialog: muestra fecha/hora del turno + campo texto opcional ("¿Qué horario preferís?")
   ↓
3. Confirmar → crea reschedule_request (status: pending) + push al coach
   ↓
4. El badge del turno cambia a ámbar "Cambio pendiente"
   - Puede cancelar la solicitud clickando en el badge
   ↓
5a. Coach aprueba con nuevo slot:
    - booking original → cancelled, nuevo booking → confirmed
    - Solicitud → approved, badge desaparece
    - Push al alumno: "Turno reprogramado — nueva fecha"
5b. Coach ofrece alternativas:
    - Solicitud → offered, offeredSlots = [{slotId, date, startTime, dayLabel}]
    - Badge del turno cambia a verde parpadeante "Ver opciones"
    - Push al alumno: "Horarios alternativos disponibles"
    ↓
    6. Alumno clicka "Ver opciones" → dialog con lista de slots del coach
       → elige uno → booking original cancelled, nuevo confirmed, solicitud → approved
5c. Coach rechaza (con o sin motivo):
    - Solicitud → rejected, badge del turno cambia a rojo "Rechazada"
    - Push al alumno con el motivo (si hay)
    - Alumno puede volver a solicitar desde ese mismo badge
```

### Flujo del Admin — Ficha de alumno

```
1. /admin/alumnos → lista compacta (dot semáforo + nombre + coach + plan)
   ↓
2. /admin/alumnos/[id]:
   - Header: avatar, nombre, email, deporte, badge plan, badge retención
   - Botón "Editar" (EditStudentDialog): nombre, email, sport, whatsapp, objetivos, antecedentes
   - Sección Plan: nombre, fecha vencimiento → AssignPlanDialog (renovar + pago opcional)
   - AddPaymentDialog: registrar pago standalone con historial
   - Turnos próximos (30 días): fecha, hora, estado + ícono reprogramar (RescheduleBookingDialog)
   - Progreso: stats, gráfico sesiones, tabla PRs
   - Bienestar: grid wellness últimos 14 días
   - Pagos recientes: últimos 6
   - Métricas clínicas: MetricsPanel editable
   - Administración: cambiar coach, reset contraseña, eliminar alumno
   - Link "Iniciar sesión de hoy" → /coach/alumnos/[id]/sesion
```

### Flujo de Reprogramación (Admin)

```
1. Ficha alumno → fila de turno → ícono CalendarClock
   ↓
2. RescheduleBookingDialog: muestra fecha actual + date picker
   ↓
3. Elige nueva fecha → rescheduleBooking(bookingId, newDate) actualiza el registro
   ↓
4. Se revalidan /coach/calendario, /coach/alumnos/[id], /admin/alumnos/[id]
```

---

## 6. Autenticación

**Proveedor:** Credentials (email + contraseña bcrypt). Magic Link descartado (emails no llegaban en producción).

```
Usuario ingresa email + contraseña
        ↓
Auth.js Credentials → bcrypt.compare()
        ↓
JWT session: { id, email, name, role }
        ↓
Middleware lee session.user.role
        ↓
Redirect → /coach/calendario | /student | /admin
```

**Archivos clave:**
- `src/lib/auth.ts` — config Auth.js v5 + CredentialsProvider
- `src/app/api/auth/[...nextauth]/route.ts` — handler
- `src/middleware.ts` — protección rutas + redirect por rol
- `src/types/next-auth.d.ts` — augmentación Session con `role`

**Variables de entorno:**
```
AUTH_SECRET=          # openssl rand -base64 32
DATABASE_URL=         # PostgreSQL URL de Neon (pooled)
```

---

## 7. Sistema de Turnos

### Modelo conceptual

```
schedule_slots          →  turno recurrente (plantilla del coach)
        ↕ N:N
slot_assignments        →  qué alumnos están asignados a cada slot
        ↓
bookings                →  instancias concretas (fecha específica)
        ↓
attendance              →  registro de asistencia por booking
```

### Convención `dayOfWeek`

El schema usa **Lunes = 0 … Domingo = 6**.
JavaScript `Date.getDay()` usa Domingo = 0 … Sábado = 6.
Conversión en server actions:
```ts
const targetJsDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1
```

### Modelo N:N — `slot_assignments`

Reemplazó el campo `assignedStudentId` (1:1) en `schedule_slots`. Permite hasta `maxCapacity` alumnos por slot.

```ts
// PK compuesta — previene duplicados sin try/catch
slotAssignments: pgTable("slot_assignments", { slotId, studentId }, (t) => [
  primaryKey({ columns: [t.slotId, t.studentId] })
])

// Insert seguro:
await db.insert(slotAssignments).values({ slotId, studentId }).onConflictDoNothing()
```

### UX de asignación de horario (Day-toggle)

Tanto `AssignStudentScheduleDialog` (coach/admin) como `SchedulePicker` (alumno) usan el mismo patrón:

1. **7 botones de día** (L M X J V S D) — disabled si no hay slots o si se alcanzó el límite `planDays`
2. Para cada día activo: **`<select>`** con los horarios disponibles de ese día
3. Se requiere exactamente `planDays` días seleccionados para poder confirmar
4. Al guardar: `setStudentSlots(studentId, slotIds[])` — borra todas las asignaciones previas, crea las nuevas, genera 8 semanas de bookings

### Generación de bookings recurrentes

`generateWeeklyBookings(slotId, studentId, dayOfWeek)` (privada en `schedule.ts`):
- Calcula la próxima ocurrencia del `dayOfWeek` desde hoy
- Genera 8 fechas semanales
- Salta las que ya tienen booking confirmado (`onConflictDoNothing` implícito con el filtro de existentes)

### Slots disponibles para reagendar (coach)

`getAvailableSlotsForReschedule(coachId, days=21)`:
1. Fetch de todos los slots activos del coach
2. Count de bookings confirmados por `(slotId, date)` en el rango
3. Filtra los que no llegaron a `maxCapacity`
4. Devuelve `{ slotId, date, startTime, dayLabel }[]`

---

## 8. Componentes

### Layout

| Componente    | Descripción                                            |
|---------------|--------------------------------------------------------|
| `TopBar`      | Header sticky: logo + avatar/menú usuario              |
| `BottomNav`   | Nav inferior 4 tabs, active detection por prefijo      |
| `PwaRegister` | Registra SW en cliente                                 |

### Calendario

| Componente        | Descripción                                                                      |
|-------------------|----------------------------------------------------------------------------------|
| `CalendarWeek`    | Vista semanal compartida (coach/student/admin). Props: `weekStart`, `events`, `role`, `basePath`, `availableSlots?`, `rescheduleRequests?` |
| — `EventRow`      | Fila de turno. Coach: botón reagendar. Student: `RescheduleRequestButton` + `CancelBookingDialog`. |

**Prop `rescheduleRequests`** (solo `role="student"`): `Record<bookingId, StudentRescheduleRequestInfo>` — mapa de estado de solicitudes para cada booking visible en la semana actual.

### Admin

| Componente                   | Descripción                                                                                   |
|------------------------------|-----------------------------------------------------------------------------------------------|
| `CreateStudentDialog`        | Alta alumno: datos personales + asignación de coach + plan opcional (endDate auto +1 mes)     |
| `CreatePlanDialog`           | Crear nuevo plan (nombre, días por semana, precio)                                            |
| `ImportStudentsDialog`       | Importación masiva desde CSV o JSON                                                           |
| `AssignPlanDialog`           | Renovar plan + pago opcional en un paso. Toggle "Incluir pago". endDate auto (+1 mes)        |
| `AddPaymentDialog`           | Registrar pago standalone + historial con eliminar. Trigger: botón verde                      |
| `EditStudentDialog`          | Editar nombre, email, sport, whatsapp, objetivos, antecedentes del alumno                     |
| `RescheduleBookingDialog`    | Date picker para mover un booking a nueva fecha. Botón con ícono CalendarClock                |
| `ChangeCoachDialog`          | Cambiar coach asignado al alumno                                                              |
| `ResetPasswordDialog`        | Reset de contraseña manual                                                                    |
| `DeleteStudentButton`        | Eliminar alumno con confirmación                                                              |

### Coach

| Componente                       | Descripción                                                                              |
|----------------------------------|------------------------------------------------------------------------------------------|
| `ScheduleManager`                | Grid read-only de slots por día con badges de alumnos asignados y capacidad `X/Y` (rojo si lleno) |
| `AssignStudentScheduleDialog`    | Day-toggle (7 botones) + time-select por día activo. Límite `planDays`. Llama `setStudentSlots` |
| `CreateBookingDialog`            | Crear turno simple o recurrente (2/4/8/12 semanas)                                      |
| `RescheduleBookingDialog`        | Lista slots disponibles → confirma → link WhatsApp al alumno                            |
| `RescheduleRequestsPanel`        | Panel en `/coach/calendario` (tab Semana). Lista solicitudes pendientes/offered. Acciones inline: Reprogramar (slot picker), Ofrecer opciones (multi-select), Rechazar (nota opcional). |
| `EditCoachProfileDialog`         | Dialog para editar nombre, especialidad, WhatsApp y bio del coach                       |
| `CoachPushToggle`                | Toggle client-side para activar/desactivar push de "Cancelaciones de turnos"            |
| `DuplicateRoutineButton`         | Botón Copy inline en lista de rutinas. Llama `duplicateRoutine` → redirige a la copia  |
| `MetricsPanel`                   | Tabs ROM/Dolor/Tests, simetría %, badge dolor, trend ↑↓→, historial. Dialog centrado  |
| `WellnessHistory`                | Grid 14 días de check-in de bienestar                                                    |
| `RoutineEditor`                  | Constructor de rutinas: bloques + ejercicios + sets/reps/notas                          |
| `AttendanceButton`               | Presente / Ausente con feedback visual                                                   |
| `PaymentBadge`                   | Semáforo verde/amarillo/rojo según vencimiento del plan                                  |

### Student

| Componente                 | Descripción                                                                              |
|----------------------------|------------------------------------------------------------------------------------------|
| `SchedulePicker`           | Day-toggle (7 botones) + time-select por día. Límite exacto `planDays`. Llama `confirmStudentSchedule` |
| `CancelBookingDialog`      | Confirma cancelación + genera link WhatsApp al coach                                    |
| `RescheduleRequestButton`  | Gestiona todo el ciclo de solicitud de cambio de turno. Estado condicionado a `currentRequest`. |
| `WellnessCheckIn`          | Check-in pre-sesión: sueño, fatiga, dolor, humor                                        |

**`RescheduleRequestButton` — lógica de estado:**

| `request`           | UI mostrada                                   | Acción al click                                        |
|---------------------|-----------------------------------------------|--------------------------------------------------------|
| `undefined`         | Badge azul "Cambiar horario"                  | Dialog con nota opcional → `requestReschedule()`      |
| `status: rejected`  | Badge rojo "Rechazada"                        | Dialog con motivo del coach + opción de re-solicitar  |
| `status: pending`   | Badge ámbar "Cambio pendiente"                | Dialog con opción de cancelar → `cancelRescheduleRequest()` |
| `status: offered`   | Badge verde parpadeante "Ver opciones"        | Dialog con lista de `offeredSlots` → `acceptOfferedSlot()` |

### Sesión en sala

| Componente       | Descripción                                                                       |
|------------------|-----------------------------------------------------------------------------------|
| `SessionLogger`  | Registro de sets por ejercicio. Inputs grandes, auto-guarda, cronómetro, última performance como referencia |

### Progreso

| Componente       | Descripción                                   |
|------------------|-----------------------------------------------|
| `ProgressCharts` | `SessionsBarChart` + `ExerciseLineChart` + `PRTable` usando Recharts |

---

## 9. Server Actions

### `src/lib/actions/schedule.ts`

| Acción                     | Descripción                                                                                  |
|----------------------------|----------------------------------------------------------------------------------------------|
| `createSlot`               | Crea un slot individual para el coach autenticado                                            |
| `deleteSlot`               | Desactiva un slot (soft delete, `active = false`)                                            |
| `createSlotBlock`          | Crea slots de 1h en un rango horario (ej: 7am→5pm = 10 slots), evita duplicados            |
| `saveCoachSchedule`        | Guarda el horario semanal completo del coach: activa/desactiva/crea slots por día y rango    |
| `createBooking`            | Crea booking individual. Admin: bypassa verificación de ownership del slot                   |
| `createBookingsBulk`       | Crea N bookings semanales desde fecha de inicio. Admin: idem                                |
| `assignStudentToSlot`      | Inserta en `slot_assignments` + genera 8 semanas de bookings                                |
| `unassignStudentFromSlot`  | Elimina de `slot_assignments` (no cancela bookings existentes)                              |
| `setStudentSlots`          | Coach/Admin: reemplaza TODAS las asignaciones del alumno + genera bookings para cada slot nuevo |
| `confirmStudentSchedule`   | Alumno: valida que los slots sean del su coach → setea asignaciones → genera 8 semanas       |
| `rescheduleBooking`        | Admin/Coach: actualiza `date` en el booking. Coach verifica ownership vía join a `schedule_slots` |

### `src/lib/actions/booking.ts`

| Acción             | Descripción                                                         |
|--------------------|---------------------------------------------------------------------|
| `cancelBooking`    | Cambia `status = "cancelled"`. Revalida calendarios de 3 roles     |
| `rescheduleBooking`| (coach desde calendario) Cancela booking viejo + crea nuevo        |

### `src/lib/actions/admin.ts`

| Acción                  | Descripción                                                                               |
|-------------------------|-------------------------------------------------------------------------------------------|
| `createStudent`         | Alta alumno. Opcional: asignar plan en el mismo paso                                      |
| `createStudentAsCoach`  | Alta alumno desde rol coach (se asigna automáticamente como coach)                       |
| `createCoach`           | Alta coach con usuario + perfil                                                            |
| `createPlan`            | Crear plan nuevo                                                                           |
| `importStudents`        | Importación masiva, skipea emails duplicados                                              |
| `updateStudent`         | Admin: actualiza nombre, email, sport, whatsapp, objetivos, antecedentes del alumno       |
| `changeStudentCoach`    | Cambiar coach asignado                                                                    |
| `assignPlan`            | Renovar plan + pago opcional en el mismo paso (`paymentAmount`, `paymentMethod`, `paymentPeriod`) |
| `resetUserPassword`     | Reset manual de contraseña con bcrypt                                                     |
| `deleteStudent`         | Elimina el `user` → cascade elimina todo lo asociado                                      |

### `src/lib/actions/rescheduleRequest.ts`

| Acción                     | Rol      | Descripción                                                                                       |
|----------------------------|----------|---------------------------------------------------------------------------------------------------|
| `requestReschedule`        | student  | Crea `reschedule_request` (status `pending`). Verifica que el booking pertenezca al alumno y no haya solicitud activa. Push al coach. |
| `cancelRescheduleRequest`  | student  | Elimina una solicitud propia en estado `pending`, `offered` o `rejected`.                        |
| `approveRescheduleRequest` | coach    | Cancela el booking original, crea uno nuevo con `newSlotId`/`newDate`, marca solicitud `approved`. Push al alumno. |
| `rejectRescheduleRequest`  | coach    | Marca solicitud `rejected` con nota opcional. Push al alumno.                                    |
| `offerAlternativeSlots`    | coach    | Guarda array de `OfferedSlot[]` en `offeredSlots`, marca solicitud `offered`. Push al alumno.    |
| `acceptOfferedSlot`        | student  | Cancela booking original, crea nuevo con slot elegido, marca solicitud `approved`.               |

### `src/lib/actions/coach.ts`

| Acción               | Descripción                                                               |
|----------------------|---------------------------------------------------------------------------|
| `updateCoachProfile` | Actualiza `users.name` + `coaches.specialty`, `whatsappNumber`, `bio`    |

### `src/lib/actions/routines.ts`
CRUD de rutinas, bloques y ejercicios. Asignación de rutinas a alumnos. Incluye `duplicateRoutine`.

### `src/lib/actions/sessions.ts`
Crear sesión, guardar set individual (upsert por `sessionId + exerciseId`), finalizar sesión.

### `src/lib/actions/wellness.ts`
Guardar check-in de bienestar (upsert por `studentId + date`).

### `src/lib/actions/metrics.ts`

| Acción        | Descripción                                                                      |
|---------------|----------------------------------------------------------------------------------|
| `addMetric`   | Coach o admin. Auto-rellena `unit` desde `metrics-config`. Revalida vistas       |
| `deleteMetric`| Coach o admin. Revalida las mismas rutas                                         |

### `src/lib/actions/payments.ts`

| Acción          | Descripción                                                           |
|-----------------|-----------------------------------------------------------------------|
| `addPayment`    | Coach o admin. Registra pago con monto, método, período, notas       |
| `deletePayment` | Solo admin                                                            |

---

## 10. Queries

### `src/lib/queries/coach.ts`

| Query                             | Descripción                                                                    |
|-----------------------------------|--------------------------------------------------------------------------------|
| `getCoachByUserId`                | Fetch coach por userId                                                         |
| `getCoachStudents`                | Lista alumnos del coach con `planEnd`, `sport`                                |
| `getCoachSlots`                   | Slots activos del coach                                                        |
| `getStudentById`                  | Fetch alumno completo: `userId`, `coachId`, `coachName` (alias join), `planDays` |
| `getStudentBookings`              | Próximos 30 días de un alumno, filtra por coach                               |
| `getStudentBookingsAll`           | Próximos 30 días sin filtro de coach (para admin)                             |
| `getCoachScheduleWithAssignments` | Todos los slots activos con array `assignedStudents[]` (dos queries, evita N+1) |
| `getStudentsLastSession`          | `Record<studentId, lastDate>` de última sesión completada por alumno          |
| `getCoachRoutines`                | Lista rutinas del coach con count de alumnos asignados activos                |
| `getRoutineWithBlocks`            | Rutina completa: bloques + ejercicios + asignaciones                          |
| `getCoachExercises`               | Ejercicios para búsqueda en rutinas (globales + del coach)                    |
| `getCoachExercisesFull`           | Ejercicios completos para biblioteca                                          |

### `src/lib/queries/student.ts`

| Query                        | Descripción                                                         |
|------------------------------|---------------------------------------------------------------------|
| `getStudentByUserId`         | Fetch ficha del alumno por userId                                   |
| `getStudentUpcomingBookings` | Bookings próximos 14 días                                           |
| `getStudentActivePlan`       | Plan activo: nombre, `daysPerWeek`, `endDate`                       |
| `getStudentActiveRoutine`    | Rutina con bloques y ejercicios completos                           |
| `getAvailableSlotsForStudent`| Slots del coach con capacidad disponible (count < maxCapacity)      |
| `getStudentAssignedSlots`    | Slots asignados al alumno vía `slot_assignments` junction table     |

### `src/lib/queries/calendar.ts`

| Query                        | Descripción                                                              |
|------------------------------|--------------------------------------------------------------------------|
| `getAdminCalendarWeek`       | Todos los bookings de la semana, con nombre alumno y coach               |
| `getCoachCalendarWeek`       | Bookings del coach: alumno, `studentWhatsApp`, plan expiry               |
| `getStudentCalendarWeek`     | Bookings del alumno: `coachName`, `coachWhatsApp`                        |

### `src/lib/queries/schedule.ts`

| Query                           | Descripción                                                           |
|---------------------------------|-----------------------------------------------------------------------|
| `getAvailableSlotsForReschedule`| Slots del coach con capacidad disponible en los próximos N días       |

### `src/lib/queries/metrics.ts`

| Query                      | Descripción                                                                          |
|----------------------------|--------------------------------------------------------------------------------------|
| `getStudentMetrics`        | Todas las métricas del alumno, ordenadas por fecha desc                             |
| `getStudentMetricHistory`  | Historial de un tipo específico (últimas N), invertido para gráficos                |

### `src/lib/queries/payments.ts`

| Query                      | Descripción                                                                          |
|----------------------------|--------------------------------------------------------------------------------------|
| `getStudentPayments`       | Últimos N pagos de un alumno, con `registeredByName` (join a `users`)               |
| `getPaymentsByStudentIds`  | Batch sin N+1. Devuelve `Record<studentId, StudentPayment[]>`                        |

### `src/lib/queries/rescheduleRequest.ts`

| Query                                  | Descripción                                                                                                    |
|----------------------------------------|----------------------------------------------------------------------------------------------------------------|
| `getPendingRequestsForCoach`           | Solicitudes en estado `pending` u `offered` para un coach. Incluye fecha/hora del booking y nombre del alumno. |
| `getStudentActiveRescheduleRequests`   | Solicitudes del alumno en estado `pending`, `offered` o `rejected`. Devuelve `Record<bookingId, StudentRescheduleRequestInfo>`. |

**Tipos exportados:**
```ts
type RescheduleRequestForCoach = {
  id, bookingId, bookingDate, bookingTime, studentId, studentName, studentNote,
  status: "pending" | "offered", createdAt
}
type StudentRescheduleRequestInfo = {
  id, status: "pending" | "approved" | "rejected" | "offered",
  coachNote: string | null, offeredSlots: OfferedSlot[] | null
}
```

### `src/lib/queries/admin.ts`

| Query                      | Descripción                                                                 |
|----------------------------|-----------------------------------------------------------------------------|
| `getAllStudentsWithCoach`   | Lista todos los alumnos con nombre de coach y estado de plan                |
| `getCoachesForSelect`      | Lista coaches para dropdowns                                                |
| `getActivePlans`           | Lista planes activos para dropdowns                                         |
| `getAdminStats`            | Totales: alumnos, planes activos, ingresos del mes                          |
| `getOverdueStudents`       | Alumnos con plan vencido o sin plan                                         |
| `getStudentsNotAttendedRecently` | Alumnos sin asistir en más de 7 días                               |
| `getRevenueByMonth`        | Ingresos agrupados por mes (últimos N meses). Formato `{ month: "YYYY-MM", revenue }[]` |
| `getCoachesStats`          | Por coach: cantidad de alumnos + ingresos del mes actual                    |

---

## 11. Configuración del Entorno

### Variables de entorno (`.env.local`)

```env
AUTH_SECRET=          # openssl rand -base64 32
DATABASE_URL=         # Connection string Neon (pooled)
```

### Crear/actualizar las tablas

```bash
npm run db:push
# Si hay columnas con datos que se van a eliminar:
npx drizzle-kit push --force
```

### Levantar el proyecto

```bash
npm run dev
```

---

## 12. Scripts

| Script               | Comando               | Descripción                                          |
|----------------------|-----------------------|------------------------------------------------------|
| Desarrollo           | `npm run dev`         | Servidor local en `localhost:3000`                   |
| Build                | `npm run build`       | Compilar para producción                             |
| Start                | `npm run start`       | Levantar build de producción                         |
| Lint                 | `npm run lint`        | ESLint                                               |
| Push schema          | `npm run db:push`     | Aplica el schema a Neon directamente                 |
| Generar migrations   | `npm run db:generate` | Genera archivos SQL de migración                     |
| Aplicar migrations   | `npm run db:migrate`  | Aplica los SQL generados                             |
| Studio visual        | `npm run db:studio`   | GUI para explorar/editar la DB                       |

---

## 13. PWA

La app es instalable como Progressive Web App en Android e iOS.

**Archivos:**
- `public/manifest.json` — nombre, íconos, colores, orientación
- `public/sw.js` — Service Worker con estrategia Cache-First para uso offline
- `src/components/layout/PwaRegister.tsx` — registra el SW al montar

**Estrategia offline:** Las páginas principales se cachean al instalar. Requests GET se actualizan en background. Las API calls siempre requieren conexión.

---

## 14. Roadmap

### Fase 1 — MVP Core ✅

- [x] Proyecto Next.js + TypeScript + Drizzle + Auth.js
- [x] Schema de base de datos completo (~16 tablas)
- [x] Autenticación email + contraseña (bcrypt)
- [x] Middleware de protección por rol
- [x] Dashboard del coach
- [x] Semáforo de pagos
- [x] Botón de asistencia con Server Action
- [x] PWA: manifest + service worker
- [x] Panel admin: CRUD alumnos, coaches, planes, reset contraseña
- [x] Vista del alumno: agenda + cancelar turno

### Fase 2 — Entrenamiento y Progreso ✅

- [x] Biblioteca de ejercicios (`/coach/ejercicios`)
- [x] Constructor de rutinas (bloques + ejercicios + series/reps)
- [x] Asignación de rutinas a alumnos
- [x] Interfaz de sesión en sala (coach y alumno): inputs grandes, cronómetro, auto-save, última performance como referencia
- [x] Dashboard de progreso del alumno: stats, gráfico sesiones por semana, tabla de PRs
- [x] Progreso del alumno en vista del coach
- [x] Check-in de bienestar pre-sesión (Wellness)

### Fase 2.5 — Sistema de Calendario y Horarios ✅

- [x] Calendario semanal compartido (admin/coach/student) — `CalendarWeek`
- [x] Navegación por semanas (router.push `?w=`)
- [x] Coach: reagendar turno desde calendario + link WhatsApp al alumno
- [x] Alumno: cancelar turno + link WhatsApp al coach
- [x] Coach: configurar bloques horarios por día (`ScheduleManager` read-only + `saveCoachSchedule`)
- [x] Migración 1:1 → N:N: `slot_assignments` junction table (soporta `maxCapacity` alumnos por slot)
- [x] `AssignStudentScheduleDialog`: day-toggle + time-select, límite `planDays`
- [x] `SchedulePicker` (alumno): misma UX day-toggle + time-select, límite exacto `planDays`
- [x] `setStudentSlots`: reemplaza asignaciones completas del alumno, genera 8 semanas
- [x] Creación de bookings recurrentes (`createBookingsBulk`: 2/4/8/12/16 semanas)
- [x] Auto-generación de 8 semanas de bookings al confirmar horario
- [x] CTA "Configurá tu horario" en home del alumno (primer ingreso)
- [x] Link "Cambiar horario" en calendario del alumno

### Fase 3 — Métricas Clínicas ✅

- [x] Tabla `metrics` en schema (type, value, unit, recordedAt, notes, registeredBy)
- [x] `src/lib/metrics-config.ts` — 20 tipos en 3 categorías: ROM, Dolor, Tests de campo
- [x] `MetricsPanel` — tabs ROM/Dolor/Tests, simetría %, badge dolor, trends (↑↓→), historial
- [x] Dialog "Nueva medición" convertido a `<Dialog>` centrado (antes: bottom sheet que cortaba botones)
- [x] Vista del coach (`/coach/alumnos/[id]`) — sección editable
- [x] Vista del alumno (`/student/progreso`) — modo lectura (`readonly`)

### Fase 3.5 — Pagos y Retención ✅

- [x] Tabla `payments` en schema
- [x] `getStudentPayments` y `getPaymentsByStudentIds` (batch sin N+1)
- [x] `AddPaymentDialog` — registro standalone con historial
- [x] `AssignPlanDialog` renovado — pago opcional en el mismo paso
- [x] `CreateStudentDialog` mejorado — plan en el mismo formulario
- [x] Alerta de retención: badge naranja +7 días sin sesión (lista y ficha del coach)

### Fase 3.8 — Admin Parity ✅

- [x] `/admin/alumnos` lista compacta: cada row es un `<Link>` con dot semáforo
- [x] `/admin/alumnos/[id]`: ficha completa con todas las acciones de gestión
  - [x] `EditStudentDialog`: editar datos personales + objetivos + antecedentes
  - [x] `AssignPlanDialog` + `AddPaymentDialog` en ficha admin
  - [x] `AssignStudentScheduleDialog` + `CreateBookingDialog` en ficha admin
  - [x] `RescheduleBookingDialog` por fila de turno (date picker)
  - [x] `ChangeCoachDialog`, `ResetPasswordDialog`, `DeleteStudentButton`
  - [x] `MetricsPanel` editable en ficha admin
  - [x] `WellnessHistory` en ficha admin
- [x] `createBooking` / `createBookingsBulk`: admin bypassa verificación de coach ownership
- [x] `rescheduleBooking` (en schedule.ts): admin bypassa verificación de coach ownership
- [x] `updateStudent` server action: admin actualiza datos personales del alumno
- [x] `getStudentBookingsAll`: variante sin filtro de coachId (para admin)

### Fase 4 — Push, Admin avanzado, Coach perfil, Rutinas ✅

- [x] **`src/lib/push.ts`** — `sendPushToUser(userId, title, body, url)`: envía push vía web-push, limpia suscripciones expiradas automáticamente. Silencioso si no hay VAPID keys.
- [x] **Triggers automáticos de push:**
  - `cancelBooking` → push al coach ("Turno cancelado — alumno · fecha · hora")
  - `rescheduleBooking` → push al alumno ("Turno reprogramado — nueva fecha y hora")
  - `assignPlan` → push al alumno ("Plan renovado — vence el fecha")
- [x] **`PushNotificationToggle`** (alumno, `/student/perfil`) — toggles "Recordatorio de turno" y "Plan por vencer"
- [x] **`CoachPushToggle`** (coach, `/coach/perfil`) — toggle "Cancelaciones de turnos"
- [x] **API `/api/push/subscribe`** — POST (suscribir + preferencias), PATCH (solo preferencias), DELETE (desuscribir)
- [x] **Editar perfil del coach** — `EditCoachProfileDialog` con nombre, especialidad, WhatsApp, bio. Server action `updateCoachProfile` en `src/lib/actions/coach.ts`
- [x] **Coach perfil mejorado** — botón Editar, CoachPushToggle, bio visible, botón Cerrar sesión
- [x] **Panel admin avanzado:**
  - Gráfico de barras "Ingresos por mes" (últimos 6 meses, barras CSS proporcionales al máximo)
  - Sección "Coaches" con cantidad de alumnos e ingresos del mes por coach
  - Filas de deudas e inactivos son `<Link>` clickables → `/admin/alumnos/[id]`
  - Queries nuevas: `getRevenueByMonth(n)`, `getCoachesStats()`
- [x] **Duplicar rutina** — `duplicateRoutine(routineId)`: copia rutina + todos sus bloques + ejercicios, nombre "(copia)". `DuplicateRoutineButton` en cada fila, redirige a la copia al terminar.

**Para activar push notifications** — agregar al `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # generá con: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
```

### Fase 4.5 — Solicitudes de cambio de horario ✅

Nueva funcionalidad: el alumno puede solicitar un cambio de turno individual (sin reconstruir todo su horario), y el coach responde desde su calendario.

- [x] **Schema:** tabla `reschedule_requests` + enum `reschedule_request_status` (`pending/approved/rejected/offered`). Tipo `OfferedSlot` exportado desde `schema.ts`.
- [x] **`src/lib/actions/rescheduleRequest.ts`** — 6 acciones: `requestReschedule`, `cancelRescheduleRequest`, `approveRescheduleRequest`, `rejectRescheduleRequest`, `offerAlternativeSlots`, `acceptOfferedSlot`.
- [x] **`src/lib/queries/rescheduleRequest.ts`** — `getPendingRequestsForCoach`, `getStudentActiveRescheduleRequests`.
- [x] **`RescheduleRequestButton`** (student) — componente de 4 estados que gestiona el ciclo completo desde el turno en el calendario del alumno.
- [x] **`RescheduleRequestsPanel`** (coach) — panel por encima del calendario. Lista todas las solicitudes pendientes/offered. Acciones inline con slot picker, multi-select y campo de nota.
- [x] **`CalendarWeek`** — nuevo prop `rescheduleRequests?: Record<string, StudentRescheduleRequestInfo>`. Pasa el estado al `EventRow` de cada turno.
- [x] **Push notifications integradas:** cada transición de estado dispara push al actor correspondiente.
- [x] **`/student/calendario`** — llama `getStudentActiveRescheduleRequests` y pasa el mapa a `CalendarWeek`.
- [x] **`/coach/calendario`** — llama `getPendingRequestsForCoach`, renderiza `RescheduleRequestsPanel` antes del `CalendarWeek`.

> **Para aplicar a la DB:** `npx drizzle-kit push`

### Fase 5 — Pendiente

- [ ] Cola offline (IndexedDB) con sincronización automática
- [ ] Gestión avanzada de planes (pausa, clases de prueba)
- [ ] Recordatorio automático de turno (cron job — 1 día antes)
- [ ] Recordatorio automático de plan por vencer (cron job — 3 días antes)

---

## Decisiones de Diseño UX

1. **Mobile-first real** — 100% de flujos usables con una sola mano. Botones grandes, scroll mínimo.
2. **Velocidad sobre perfección en sala** — Registro de sesiones en menos de 2 minutos. Auto-save por set.
3. **El alumno ve progreso, no solo datos** — Gráficos que cuentan una historia.
4. **WhatsApp como canal externo** — Links pre-cargados para comunicaciones que ya ocurren naturalmente.
5. **Onboarding fluido** — Nuevo alumno: ingresa → ve CTA → elige días → tiene turnos en 30 segundos.
6. **Horario fijo como contrato semanal** — Los slots generan 8 semanas automáticamente. El alumno elige una vez.
7. **Admin = coach + gestión** — El admin puede hacer todo lo del coach más acciones de administración. Una sola ficha para todo.
8. **Dialogs centrados > bottom sheets** — Los bottom sheets cortan contenido cuando hay muchos campos. Todos los formularios usan `<Dialog>` de shadcn.

---

---

## Decisiones de Diseño UX

1. **Mobile-first real** — 100% de flujos usables con una sola mano. Botones grandes, scroll mínimo.
2. **Velocidad sobre perfección en sala** — Registro de sesiones en menos de 2 minutos. Auto-save por set.
3. **El alumno ve progreso, no solo datos** — Gráficos que cuentan una historia.
4. **WhatsApp como canal externo** — Links pre-cargados para comunicaciones que ya ocurren naturalmente.
5. **Onboarding fluido** — Nuevo alumno: ingresa → ve CTA → elige días → tiene turnos en 30 segundos.
6. **Horario fijo como contrato semanal** — Los slots generan 8 semanas automáticamente. El alumno elige una vez.
7. **Admin = coach + gestión** — El admin puede hacer todo lo del coach más acciones de administración.
8. **Dialogs centrados > bottom sheets** — Los bottom sheets cortan contenido con muchos campos. Todos los formularios usan `<Dialog>` de shadcn.
9. **Solicitudes, no cambios unilaterales** — El alumno no puede reprogramar por su cuenta; envía una solicitud al coach que puede aprobar, rechazar u ofrecer alternativas. Mantiene el control del coach sobre su agenda.

---

*Documentación actualizada — Rheb App v0.7 — Marzo 2026*
