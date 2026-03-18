import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  getAdminStats,
  getOverdueStudents,
  getStudentsNotAttendedRecently,
  getRevenueByMonth,
  getCoachesStats,
} from "@/lib/queries/admin"
import Link from "next/link"
import { format, parseISO, differenceInDays, parse } from "date-fns"
import { es } from "date-fns/locale"
import { Users, TrendingUp, AlertTriangle, Clock, DollarSign, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function AdminDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "admin") redirect("/login")

  const [stats, overdueStudents, inactiveStudents, revenueByMonth, coachesStats] = await Promise.all([
    getAdminStats(),
    getOverdueStudents(),
    getStudentsNotAttendedRecently(),
    getRevenueByMonth(6),
    getCoachesStats(),
  ])

  const today = new Date()
  const monthLabel = format(today, "MMMM yyyy", { locale: es })

  // Revenue chart helpers
  const maxRevenue = Math.max(...revenueByMonth.map((r) => Number(r.revenue)), 1)

  return (
    <div className="px-4 py-5 space-y-6">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold">Panel Admin</h2>
        <p className="text-sm text-muted-foreground capitalize">
          {format(today, "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-wide">Alumnos</span>
          </div>
          <p className="text-3xl font-black">{stats.totalStudents}</p>
          <p className="text-[11px] text-muted-foreground">{stats.activePlans} con plan activo</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-wide capitalize">{monthLabel}</span>
          </div>
          <p className="text-3xl font-black">
            ${Number(stats.monthRevenue).toLocaleString("es-AR")}
          </p>
          <p className="text-[11px] text-muted-foreground">ingresos del mes</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-wide">Deudas</span>
          </div>
          <p className="text-3xl font-black text-red-400">{overdueStudents.length}</p>
          <p className="text-[11px] text-muted-foreground">plan vencido o sin plan</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-wide">Inactivos</span>
          </div>
          <p className="text-3xl font-black text-amber-400">{inactiveStudents.length}</p>
          <p className="text-[11px] text-muted-foreground">sin asistir en +7 días</p>
        </div>
      </div>

      {/* Revenue por mes */}
      {revenueByMonth.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Ingresos por mes
          </h3>
          <div className="rounded-xl border bg-card p-4 space-y-2.5">
            {revenueByMonth.map(({ month, revenue }) => {
              const pct = Math.round((Number(revenue) / maxRevenue) * 100)
              const label = format(parse(month, "yyyy-MM", new Date()), "MMM yy", { locale: es })
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-[11px] w-10 shrink-0 text-muted-foreground capitalize">{label}</span>
                  <div className="flex-1 h-4 rounded bg-muted relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/70 rounded transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] w-20 text-right font-mono text-foreground shrink-0">
                    ${Number(revenue).toLocaleString("es-AR")}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Breakdown por coach */}
      {coachesStats.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Coaches
          </h3>
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {coachesStats.map((c) => (
              <div key={c.coachId} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.studentCount} alumno{c.studentCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                  ${Number(c.monthRevenue).toLocaleString("es-AR")} este mes
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Alertas: deudas */}
      {overdueStudents.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            Deudas vencidas
          </h3>
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {overdueStudents.map((s) => {
              const daysOverdue = s.planEnd
                ? differenceInDays(today, parseISO(s.planEnd))
                : null
              return (
                <Link
                  key={s.studentId}
                  href={`/admin/alumnos/${s.studentId}`}
                  className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {s.planEnd
                        ? daysOverdue === 0 ? "Vence hoy" : `Vencido ${daysOverdue}d`
                        : "Sin plan"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Alertas: inactivos */}
      {inactiveStudents.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            Sin asistir en +7 días
          </h3>
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {inactiveStudents.map((s) => (
              <Link
                key={s.studentId}
                href={`/admin/alumnos/${s.studentId}`}
                className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-muted/40 transition-colors"
              >
                <p className="font-medium text-sm truncate flex-1">{s.name}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {s.lastAttendance
                      ? `Últ. ${format(parseISO(s.lastAttendance), "d MMM", { locale: es })}`
                      : "Sin historial"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
