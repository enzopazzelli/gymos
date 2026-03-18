import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getCoachByUserId, getCoachSlots, getStudentById, getStudentBookings } from "@/lib/queries/coach"
import { getStudentAssignedSlots } from "@/lib/queries/student"
import { getStudentStats, getSessionsPerWeek, getStudentPRs } from "@/lib/queries/sessions"
import { getWellnessHistory } from "@/lib/queries/wellness"
import { getStudentMetrics } from "@/lib/queries/metrics"
import { getStudentPayments } from "@/lib/queries/payments"
import { SessionsBarChart, PRTable } from "@/components/ProgressCharts"
import { WellnessHistory } from "@/components/coach/WellnessHistory"
import { MetricsPanel } from "@/components/coach/MetricsPanel"
import { CreateBookingDialog } from "@/components/coach/CreateBookingDialog"
import { AssignStudentScheduleDialog } from "@/components/coach/AssignStudentScheduleDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PaymentBadge } from "@/components/coach/PaymentBadge"
import Link from "next/link"
import { format, parseISO, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, MessageCircle, Calendar, Dumbbell, Trophy, Flame, AlertTriangle, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const { id } = await params
  const student = await getStudentById(id)

  if (!student || student.coachId !== coach.id) notFound()

  const [slots, assignedSlots, upcomingBookings, stats, weeklySessions, prs, wellnessLogs, studentMetrics, recentPayments] = await Promise.all([
    getCoachSlots(coach.id),
    getStudentAssignedSlots(id),
    getStudentBookings(id, coach.id),
    getStudentStats(id),
    getSessionsPerWeek(id, 8),
    getStudentPRs(id),
    getWellnessHistory(id, 14),
    getStudentMetrics(id),
    getStudentPayments(id, 6),
  ])

  const initials = student.name
    ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

  const today = new Date()

  const daysSinceLastSession = stats.lastSessionDate
    ? differenceInDays(today, parseISO(stats.lastSessionDate))
    : null

  let paymentStatus: "green" | "yellow" | "red" = "red"
  if (student.planEnd) {
    const daysLeft = differenceInDays(parseISO(student.planEnd), today)
    if (daysLeft > 5) paymentStatus = "green"
    else if (daysLeft >= 1) paymentStatus = "yellow"
  }

  const waLink = student.whatsapp
    ? `https://wa.me/${student.whatsapp.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(student.name ?? "")}!`
    : null

  return (
    <div className="px-4 py-5 space-y-6">

      {/* Back */}
      <Link href="/coach/alumnos" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" />
        Alumnos
      </Link>

      {/* Header del alumno */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={student.image ?? undefined} />
          <AvatarFallback className="text-base font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{student.name}</h2>
          <p className="text-sm text-muted-foreground truncate">{student.email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {student.sport && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {student.sport}
              </span>
            )}
            <PaymentBadge status={paymentStatus} />
            {(daysSinceLastSession === null || daysSinceLastSession >= 7) && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                <AlertTriangle className="h-2.5 w-2.5" />
                {daysSinceLastSession === null ? "Sin sesiones" : `${daysSinceLastSession}d sin entrenar`}
              </span>
            )}
          </div>
        </div>
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </a>
        )}
      </div>

      {/* Plan */}
      {student.planName && (
        <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan activo</p>
            <p className="font-semibold mt-0.5">{student.planName}</p>
          </div>
          {student.planEnd && (
            <p className="text-xs text-muted-foreground">
              Vence {format(parseISO(student.planEnd), "d MMM", { locale: es })}
            </p>
          )}
        </div>
      )}

      {/* Info clínica */}
      {(student.objectives || student.injuryHistory) && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          {student.objectives && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Objetivos</p>
              <p className="text-sm">{student.objectives}</p>
            </div>
          )}
          {student.injuryHistory && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Antecedentes</p>
              <p className="text-sm">{student.injuryHistory}</p>
            </div>
          )}
        </div>
      )}

      {/* Sesión de hoy */}
      <Link
        href={`/coach/alumnos/${id}/sesion`}
        className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-primary/40 bg-primary/5 py-3.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
      >
        <Dumbbell className="h-4 w-4" />
        Iniciar sesión de hoy
      </Link>

      {/* Próximos turnos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Próximos turnos
          </h3>
          <div className="flex items-center gap-3">
            <AssignStudentScheduleDialog
              studentId={id}
              studentName={student.name}
              coachSlots={slots}
              assignedSlotIds={assignedSlots.map((s) => s.id)}
              planDays={student.planDays}
            />
            <CreateBookingDialog studentId={id} slots={slots} />
          </div>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No hay turnos agendados.
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {upcomingBookings.map((b) => {
              const dateObj = parseISO(b.date)
              return (
                <div key={b.bookingId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {DAY_NAMES[b.dayOfWeek]} · {format(dateObj, "d MMM", { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.startTime} hs</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    b.status === "confirmed" && "bg-emerald-100 text-emerald-700",
                    b.status === "cancelled" && "bg-red-100 text-red-700",
                    b.status === "recovery" && "bg-amber-100 text-amber-700",
                  )}>
                    {b.status === "confirmed" ? "Confirmado" : b.status === "cancelled" ? "Cancelado" : "Recupero"}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
      {/* Progreso */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Progreso</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-black">{stats.thisMonth}</p>
            <p className="text-[10px] text-muted-foreground">Este mes</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <Calendar className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total sesiones</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Sesiones por semana</p>
          {stats.total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin sesiones aún.</p>
          ) : (
            <SessionsBarChart data={weeklySessions} />
          )}
        </div>

        {prs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Mejores marcas
            </p>
            <PRTable prs={prs} />
          </div>
        )}
      </section>

      {/* Wellness */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Bienestar (14 días)</h3>
        <div className="rounded-xl border bg-card p-4">
          <WellnessHistory logs={wellnessLogs} />
        </div>
      </section>

      {/* Pagos recientes */}
      {recentPayments.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Pagos recientes
          </h3>
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    ${Number(p.amount).toLocaleString("es-AR")}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground capitalize">
                      {{ cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro" }[p.method]}
                    </span>
                  </p>
                  {p.periodCovered && (
                    <p className="text-[11px] text-muted-foreground">{p.periodCovered}</p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(p.paidAt), "d MMM yyyy", { locale: es })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Métricas clínicas */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          Métricas clínicas
        </h3>
        <MetricsPanel studentId={id} metrics={studentMetrics} />
      </section>
    </div>
  )
}
