import { auth } from "@/lib/auth"
import Link from "next/link"
import Image from "next/image"
import {
  CalendarDays,
  Dumbbell,
  TrendingUp,
  Bell,
  ShieldCheck,
  ClipboardList,
  CreditCard,
  HeartPulse,
  Smartphone,
  ChevronRight,
  BarChart3,
  LayoutDashboard,
} from "lucide-react"

export default async function Home() {
  const session = await auth()

  const dashboardHref = !session
    ? "/login"
    : session.user.role === "admin"
    ? "/admin"
    : session.user.role === "coach"
    ? "/coach"
    : "/student"

  return (
    <div className="min-h-svh bg-background text-foreground">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
            GymOS
          </Link>
          <Link
            href={dashboardHref}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {session ? (
              <><LayoutDashboard className="h-4 w-4" /> Dashboard</>
            ) : (
              <>Ingresar</>
            )}
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/gym.jpg"
          alt="Gym"
          fill
          priority
          className="object-cover brightness-[0.3] -z-10"
        />
        <div className="mx-auto max-w-5xl px-6 py-32 text-center text-white">
          <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            PWA · Sin App Store
          </span>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
            Gestión integral<br />
            <span className="text-primary">para tu gimnasio</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
            GymOS reemplaza las planillas de Excel por una app instalable en celulares.
            Turnos, rutinas, pagos y progreso, todo en un solo lugar.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={dashboardHref}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {session ? "Ir al dashboard" : "Empezar ahora"} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────── */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">Todo lo que necesitás</h2>
          <p className="mb-12 text-center text-muted-foreground">
            Diseñado para entornos de fuerza, acondicionamiento y rehabilitación.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-background p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">Un sistema, tres roles</h2>
          <p className="mb-12 text-center text-muted-foreground">
            Cada usuario ve exactamente lo que necesita.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {roles.map((r) => (
              <div key={r.role} className="rounded-xl border bg-background p-6 shadow-sm">
                <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">
                  {r.role}
                </span>
                <h3 className="mb-3 text-lg font-semibold">{r.title}</h3>
                <ul className="space-y-2">
                  {r.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PWA callout ─────────────────────────────────────────────── */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <Smartphone className="mx-auto mb-4 h-10 w-10 opacity-80" />
          <h2 className="mb-3 text-3xl font-bold">Instalable como app nativa</h2>
          <p className="mx-auto max-w-md text-primary-foreground/80">
            GymOS es una PWA. Se instala directo desde el navegador en Android e iOS,
            sin pasar por App Store ni Google Play.
          </p>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────── */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">¿Listo para empezar?</h2>
          <p className="mb-8 text-muted-foreground">
            Ingresá con tu cuenta y empezá a gestionar tu gimnasio hoy.
          </p>
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {session ? "Ir al dashboard" : "Ingresar a GymOS"} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GymOS · Todos los derechos reservados
      </footer>

    </div>
  )
}

const features = [
  {
    icon: CalendarDays,
    title: "Turnos y calendario",
    description: "Reservas, reprogramaciones y cancelaciones en tiempo real. Vista semanal para coaches y alumnos.",
  },
  {
    icon: Dumbbell,
    title: "Rutinas y ejercicios",
    description: "Creación y asignación de rutinas personalizadas. Biblioteca de ejercicios con sets, reps y carga.",
  },
  {
    icon: TrendingUp,
    title: "Progreso del alumno",
    description: "Seguimiento de métricas de entrenamiento con gráficos históricos por sesión.",
  },
  {
    icon: HeartPulse,
    title: "Wellness check-in",
    description: "Los alumnos reportan cómo llegan a cada sesión. Los coaches pueden ver el historial de bienestar.",
  },
  {
    icon: ClipboardList,
    title: "Asistencia",
    description: "Registro de presencias con un clic desde el calendario del coach. Historial por alumno.",
  },
  {
    icon: CreditCard,
    title: "Pagos y planes",
    description: "Gestión de planes, fechas de vencimiento y pagos. Alertas automáticas antes del vencimiento.",
  },
  {
    icon: Bell,
    title: "Notificaciones push",
    description: "Recordatorios de turno y avisos de plan por vencer directo en el celular, sin abrir la app.",
  },
  {
    icon: BarChart3,
    title: "Métricas y reportes",
    description: "Dashboard con ocupación, ingresos y actividad de alumnos para admins y coaches.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-rol seguro",
    description: "Acceso diferenciado por rol (admin, coach, alumno). Cada uno ve solo lo que le corresponde.",
  },
]

const roles = [
  {
    role: "Admin",
    title: "Control total del gimnasio",
    items: [
      "Dashboard con revenue y ocupación",
      "Gestión de coaches y alumnos",
      "Asignación de planes y pagos",
      "Vista de todos los calendarios",
      "Importación masiva de alumnos",
    ],
  },
  {
    role: "Coach",
    title: "Foco en sus alumnos",
    items: [
      "Vista semanal de turnos",
      "Registro de asistencia",
      "Creación y edición de rutinas",
      "Log de sesión en sala",
      "Historial de wellness por alumno",
    ],
  },
  {
    role: "Alumno",
    title: "Experiencia simple",
    items: [
      "Reserva y reprogramación de turnos",
      "Ver rutina del día",
      "Check-in de bienestar",
      "Progreso y gráficos propios",
      "Notificaciones de recordatorio",
    ],
  },
]
