# Proyecto: Rheb App — Gestión Integral de Entrenamiento

## 1. Introducción y Propósito

**Rheb App** es una solución digital diseñada específicamente para el gimnasio **Rheb**, con el objetivo de migrar la gestión actual (basada en Excel/Sheets) hacia una **Web App Mobile-First**.

El propósito es facilitar la coordinación entre entrenadores y alumnos, personalizar el seguimiento de los entrenamientos (fuerza, acondicionamiento y rehabilitación), y centralizar la información administrativa y de progreso deportivo en una sola herramienta accesible desde el celular, sin pasar por App Stores.

---

## 2. Usuarios y Roles

La aplicación contará con tres niveles de acceso con permisos bien definidos:

### Administrador (Dueño)
- Visión global de todos los entrenadores, alumnos e ingresos.
- Gestión de planes y precios.
- Estadísticas del gimnasio: asistencia promedio, horas pico, retención de alumnos, ingresos mensuales.
- Alta/baja de entrenadores y alumnos.
- Acceso de solo lectura a cualquier ficha o sesión.

### Entrenador (Coach)
- Gestión de su propia cartera de alumnos.
- Crear, asignar y modificar rutinas de entrenamiento.
- Registrar asistencias y cargar métricas de sesión en tiempo real (interfaz optimizada para uso en sala).
- Ver estado de pago de sus alumnos.
- Seguimiento del progreso físico y clínico.
- Comunicación interna mediante notas por alumno.

### Alumno
- Visualización de su agenda de turnos.
- Avisar inasistencia ("No voy") con un toque.
- Ver su rutina asignada para cada sesión.
- Registrar sus marcas y sensaciones post-entrenamiento.
- Ver su evolución mediante gráficos de progreso.
- Acceso a su ficha de objetivos y antecedentes.

---

## 3. Modelo de Datos (Estructura de Base de Datos)

> Usando Supabase (PostgreSQL) con Row Level Security (RLS) por rol.

```
profiles           → extiende auth.users (nombre, avatar, rol: admin/coach/student)
coaches            → id_profile, especialidad, bio
students           → id_profile, id_coach, deporte_base, objetivos, antecedentes_lesiones, fecha_inicio
plans              → id, nombre (3/4/5 días), precio, duracion_dias, activo
student_plans      → id_student, id_plan, fecha_inicio, fecha_vencimiento, estado (activo/pausado/vencido)
schedule_slots     → id, id_coach, dia_semana, hora_inicio, cupo_maximo
bookings           → id, id_student, id_slot, fecha, estado (confirmada/cancelada/recupero)
attendance         → id, id_booking, presente (bool), registrado_por
exercises          → id, nombre, categoria (fuerza/acond/rehab/movilidad), descripcion, video_url
routines           → id, id_coach, nombre, descripcion, fecha_creacion
routine_assignments → id, id_routine, id_student, fecha_asignacion, activa
routine_blocks     → id, id_routine, nombre_bloque (ej: "A", "Entrada en calor"), orden
routine_exercises  → id, id_block, id_exercise, series, reps, notas_tecnicas, orden
sessions           → id, id_student, id_coach, fecha, id_routine (nullable), notas_coach
session_logs       → id, id_session, id_exercise, sets_data (JSONB: [{serie, peso, reps, rpe}])
metrics            → id, id_student, tipo, valor, unidad, fecha (para PRs, ROM, tests de campo)
wellness_logs      → id, id_student, fecha, sueño, fatiga, dolor (0-10), bienestar_general, notas
payments           → id, id_student, monto, fecha_pago, periodo_cubierto, metodo, comprobante_url
notes              → id, id_student, id_author, fecha, contenido, tipo (coach/alumno/sistema)
```

**Clave de diseño:** Los campos `sets_data` (JSONB en `session_logs`) y las `metrics` genéricas permiten total flexibilidad sin romper la estructura relacional para las consultas analíticas.

---

## 4. Funcionalidades Principales

### A. Sistema Flexible de Turnos y Asistencia

El modelo de Rheb no es un sistema de reservas rígido — se basa en la confianza y la comunicación directa. La app debe acompañar ese estilo.

- **Agenda semanal del coach:** Vista de todos sus turnos del día/semana con alumnos asignados y estado de confirmación.
- **Vista del alumno:** Sus turnos de la semana, con botón "No voy" que libera el cupo y notifica al coach.
- **Lista de espera automática:** Cuando un cupo se libera, notifica a los alumnos con recuperos pendientes.
- **Control semanal de asistencia:** Validación automática por plan contratado (3, 4 o 5 días). Alerta visual si un alumno se está por quedar sin clases en la semana.
- **Integración WhatsApp:** Botón directo que abre un mensaje pre-cargado al alumno para coordinar recupero o confirmación.
- **Registro de recuperos:** Distinción entre clase ordinaria y clase de recupero en el historial.

### B. Módulo de Rutinas y Entrenamiento

Es el núcleo funcional de la app. Permite al coach diseñar, asignar y ejecutar programas de entrenamiento.

#### Biblioteca de Ejercicios
- Ejercicios globales (visibles para todos los coaches) y ejercicios propios (privados del coach).
- Categorías: Fuerza, Acondicionamiento, Rehabilitación, Movilidad.
- Campo de notas técnicas y link a video de referencia (YouTube/Drive).
- Buscador por nombre y categoría.

#### Constructor de Rutinas
- El coach arma una rutina con bloques (ej: "Entrada en calor", "A", "B", "Vuelta a la calma").
- Dentro de cada bloque: ejercicios con series, repeticiones/tiempo, notas técnicas.
- Una rutina puede asignarse a uno o varios alumnos.
- Historial de versiones: si se modifica una rutina, se conserva el historial para no perder lo ya ejecutado.

#### Ejecución en Sala (UX prioritaria)
- El coach abre la sesión del alumno desde su lista.
- Ve la rutina asignada con todos los ejercicios.
- Carga las series con peso y reps con el mínimo de toques (inputs grandes, numéricos directos).
- Campo opcional de RPE (esfuerzo percibido, escala 1-10) por ejercicio o por sesión.
- Al finalizar, el coach confirma la sesión — queda registrada con timestamp.

### C. Seguimiento Personalizado (Dashboard)

Enfocado en hacer visible el progreso del alumno de forma motivadora.

#### Métricas Cuantitativas (Fuerza)
- Gráficos de evolución de PRs (1RM estimado o real) por ejercicio.
- Volumen total de carga por sesión/semana (tonelaje).
- Progresión en el tiempo con línea de tendencia.

#### Métricas de Rehabilitación y Salud
- Rango de movimiento (ROM) con comparación entre miembro izquierdo y derecho.
- Escala de dolor por zona (0-10) con histórico.
- Tests de campo: salto en largo, countermovement jump, velocidad (ingreso manual o carga de archivo).

#### Escala de Bienestar
- Check-in rápido del alumno (o coach) al inicio de cada sesión: sueño, fatiga, dolor general, humor (escala visual 1-5 con íconos).
- Visible en el dashboard del coach para ajustar la intensidad del día.

#### Bitácora Cualitativa
- Notas libres por sesión, visibles para coach y alumno.
- Tags de colores para clasificar: "PR", "Dolor", "Buena sesión", "Falta técnica", "Récord personal", etc.

### D. Gestión Administrativa y Pagos

- **Semáforo de pagos:** Verde (al día) / Amarillo (vence en 5 días) / Rojo (vencido). Visible en la lista de alumnos del coach y del admin.
- **Gestión de planes:** Alta, pausa y reactivación de planes por alumno. Registro del período cubierto por cada pago.
- **Ficha del alumno:** Deporte base, objetivos a corto/largo plazo, antecedentes de lesiones, fecha de inicio en Rheb.
- **Alerta de retención:** Si un alumno lleva más de 7 días sin asistir (sin justificación), aparece un aviso en el dashboard del coach.

### E. Notificaciones Push (PWA)

Al ser PWA, se pueden enviar notificaciones nativas en Android (y limitadas en iOS):

- Recordatorio 1 hora antes del turno.
- Aviso al coach cuando un alumno cancela su clase.
- Aviso al alumno cuando se libera un turno que puede tomar.
- Alerta de pago próximo a vencer (para el alumno) y de deuda (para el coach/admin).

---

## 5. Autenticación y Seguridad

- **Proveedor:** Supabase Auth.
- **Método:** Magic Link por email (sin contraseña) para simplificar el onboarding de alumnos no técnicos. Opción adicional de usuario/contraseña para coaches y admin.
- **Row Level Security (RLS):** Cada tabla tiene políticas que garantizan que:
  - Un alumno solo ve su propia información.
  - Un coach solo accede a sus alumnos asignados.
  - El admin tiene acceso total de lectura.
- **JWT Claims personalizados:** El rol queda embebido en el token para validación eficiente en el frontend y edge functions.

---

## 6. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | Next.js 14+ (App Router) | SSR, routing, API routes |
| Estilos | TailwindCSS + shadcn/ui | Componentes accesibles y rápidos de implementar |
| Lógica | TypeScript | Tipado fuerte, crítico en un modelo de datos complejo |
| Backend / DB | Supabase (PostgreSQL) | Auth, DB, Storage, Realtime y Edge Functions en un solo servicio |
| Estado global | Zustand o Context API | Ligero, suficiente para la escala actual |
| Gráficos | Recharts | Simple, composable, bien integrado con React |
| Distribución | PWA (next-pwa) | Instalable en Android/iOS sin App Store |
| Notificaciones | Web Push API + Supabase Edge Functions | Notificaciones nativas desde el servidor |

> **Nota TypeScript:** Se cambia de JS a TS para tipar el modelo de datos. Con ~15 tablas relacionadas, el tipado evita errores silenciosos costosos.

---

## 7. Funcionamiento Offline (PWA)

El gimnasio puede tener wifi inestable. La app debe funcionar degradadamente sin conexión:

- **Cacheable:** Lista de alumnos del día, rutinas asignadas, últimas sesiones registradas.
- **Con cola offline:** Si el coach registra una sesión sin internet, los datos se guardan localmente (IndexedDB) y se sincronizan al recuperar señal.
- **Indicador de estado:** La app muestra claramente cuando está operando offline.

---

## 8. Hoja de Ruta (Roadmap)

### Fase 1: MVP Core
- [ ] Configuración de proyecto: Next.js + Supabase + TailwindCSS + TypeScript.
- [ ] Schema de base de datos completo con RLS.
- [ ] Autenticación: Magic Link (coach y alumno) + sesión persistente.
- [ ] Dashboard del Coach: lista de alumnos con semáforo de pago y plan.
- [ ] Agenda del día: turnos con alumnos, estado de asistencia.
- [ ] Botón "No voy" del alumno + apertura de WhatsApp desde el coach.
- [ ] Control semanal por plan (3/4/5 días).
- [ ] Configuración PWA: manifest, service worker, instalable en celular.

### Fase 2: Entrenamiento y Progreso
- [ ] Biblioteca de ejercicios (global + privados del coach).
- [ ] Constructor de rutinas (bloques y ejercicios).
- [ ] Asignación de rutinas a alumnos.
- [ ] Interfaz de carga de sesión en sala (sets, peso, reps, RPE).
- [ ] Dashboard del alumno: gráficos de PRs y volumen.
- [ ] Bitácora cualitativa con tags.
- [ ] Check-in de bienestar pre-sesión.

### Fase 3: Salud, Rehabilitación y Notificaciones
- [ ] Módulo de métricas de rehabilitación (ROM, dolor, simetría).
- [ ] Tests de campo con histórico.
- [ ] Notificaciones Push (recordatorio de turno, cancelación, pago).
- [ ] Cola offline con sincronización.
- [ ] Lista de espera automática para turnos liberados.

### Fase 4: Administración y Escala
- [ ] Panel del Administrador: estadísticas globales, retención, ingresos.
- [ ] Gestión avanzada de planes (pausas, vencimientos, clases de prueba).
- [ ] Templates de rutinas reutilizables entre alumnos.
- [ ] Alerta de retención (más de 7 días sin asistir).
- [ ] Entrevistas con coaches para ajustes de UX en sala.

---

## 9. Decisiones de Diseño UX Clave

1. **Mobile-first real:** El 100% de los flujos deben ser usables con una sola mano. Botones grandes, inputs numéricos nativos del celular, scroll mínimo.
2. **Velocidad sobre perfección en sala:** El registro de sesiones debe poder hacerse en menos de 2 minutos. La app no puede ser una fricción para el entrenador.
3. **El alumno ve progreso, no solo datos:** Los gráficos deben contar una historia ("Levantás un 23% más que hace 3 meses"). La motivación visual es parte del producto.
4. **WhatsApp como canal externo, no reemplazarlo:** La integración es para facilitar comunicaciones que ya ocurren naturalmente, no para forzar al usuario a cambiar su canal preferido.
5. **Onboarding sin fricción:** El alumno recibe un link mágico por WhatsApp o email, entra directo, sin crear contraseña. Primero ve su turno y su rutina.

---

## 10. Visión de Futuro

Rheb App no busca ser solo un software de gestión, sino una herramienta que potencie la confianza del alumno en su proceso de entrenamiento, transformando los datos en motivación visual.

A mediano plazo:
- **Multi-gimnasio:** La arquitectura de roles permite escalar a una red de sedes.
- **IA básica:** Sugerencias de progresión de carga basadas en historial (siguiente sesión, cuánto agregar).
- **Exportación de reportes:** PDF de progreso para alumnos de rehabilitación que necesitan presentarlo a médicos o kinesiólogos.
