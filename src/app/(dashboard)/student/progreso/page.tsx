import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  getStudentByUserId,
  getStudentActivePlan,
  getStudentAssignedSlots,
} from "@/lib/queries/student"
import { getStudentStats, getSessionsPerWeek, getStudentPRs } from "@/lib/queries/sessions"
import { getStudentMetrics } from "@/lib/queries/metrics"
import { getTodayWellnessLog } from "@/lib/queries/wellness"
import { SessionsBarChart, PRTable } from "@/components/ProgressCharts"
import { MetricsPanel } from "@/components/coach/MetricsPanel"
import { WellnessCheckIn } from "@/components/student/WellnessCheckIn"
import { Badge } from "@/components/ui/badge"
import { Trophy, Flame, Calendar, Activity, CalendarClock, ChevronRight } from "lucide-react"
import { format, parseISO, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function StudentProgresoPage() {
  const session = await auth()
  if (!session || session.user.role !== "student") redirect("/login")

  const student = await getStudentByUserId(session.user.id)
  if (!student) redirect("/login")

  const [stats, weeklySessions, prs, studentMetrics, plan, todayWellness, assignedSlots] =
    await Promise.all([
      getStudentStats(student.id),
      getSessionsPerWeek(student.id, 8),
      getStudentPRs(student.id),
      getStudentMetrics(student.id),
      getStudentActivePlan(student.id),
      getTodayWellnessLog(student.id),
      getStudentAssignedSlots(student.id),
    ])

  const firstName = session.user.name?.split(" ")[0] ?? "Alumno"

  let daysLeft: number | null = null
  let planColor = "red"
  if (plan?.endDate) {
    daysLeft = differenceInDays(parseISO(plan.endDate), new Date())
    if (daysLeft > 5) planColor = "green"
    else if (daysLeft >= 1) planColor = "yellow"
    else planColor = "red"
  }

  return (
    <div className="px-4 py-5 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Buenas, {firstName}</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        {plan && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold shrink-0 mt-1",
              planColor === "green" && "bg-emerald-100 text-emerald-700 border-emerald-200",
              planColor === "yellow" && "bg-yellow-100 text-yellow-700 border-yellow-200",
              planColor === "red" && "bg-red-100 text-red-700 border-red-200",
            )}
          >
            {daysLeft === null
              ? plan.planName
              : daysLeft <= 0
              ? "Plan vencido"
              : `${plan.planName} · ${daysLeft}d`}
          </Badge>
        )}
      </div>

      {/* CTA primer ingreso */}
      {plan && student.coachId && assignedSlots.length === 0 && (
        <Link
          href="/student/elegir-horario"
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 hover:bg-primary/10 transition-colors"
        >
          <CalendarClock className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-primary">Configurá tu horario</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Elegí tus días y horarios fijos para las próximas semanas.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary/60 shrink-0" />
        </Link>
      )}

      {/* Stats hero */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
          <p className="text-2xl font-black">{stats.thisMonth}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Este mes</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-black">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <Trophy className="h-4 w-4 mx-auto mb-1 text-amber-500" />
          <p className="text-2xl font-black">{prs.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">PRs</p>
        </div>
      </div>

      {stats.lastSessionDate && (
        <p className="text-xs text-muted-foreground -mt-2">
          Última sesión: {format(parseISO(stats.lastSessionDate), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      )}

      {/* Sesiones por semana */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Sesiones por semana
        </h3>
        <div className="rounded-xl border bg-card p-4">
          {stats.total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Todavía no hay sesiones registradas.
            </p>
          ) : (
            <SessionsBarChart data={weeklySessions} />
          )}
        </div>
      </section>

      {/* Wellness check-in */}
      <WellnessCheckIn todayLog={todayWellness} />

      {/* Mejores marcas */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          Mejores marcas
        </h3>
        <PRTable prs={prs} />
      </section>

      {/* Métricas clínicas */}
      {studentMetrics.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Métricas clínicas
          </h3>
          <MetricsPanel studentId={student.id} metrics={studentMetrics} readonly />
        </section>
      )}

    </div>
  )
}
