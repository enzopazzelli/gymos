import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getStudentById, getCoachSlots, getStudentBookingsAll } from "@/lib/queries/coach"
import { getStudentAssignedSlots } from "@/lib/queries/student"
import { getStudentStats, getSessionsPerWeek, getStudentPRs } from "@/lib/queries/sessions"
import { getWellnessHistory } from "@/lib/queries/wellness"
import { getStudentMetrics } from "@/lib/queries/metrics"
import { getStudentPayments } from "@/lib/queries/payments"
import { getCoachesForSelect, getActivePlans } from "@/lib/queries/admin"
import { MetricsPanel } from "@/components/coach/MetricsPanel"
import { WellnessHistory } from "@/components/coach/WellnessHistory"
import { AssignStudentScheduleDialog } from "@/components/coach/AssignStudentScheduleDialog"
import { CreateBookingDialog } from "@/components/coach/CreateBookingDialog"
import { SessionsBarChart, PRTable } from "@/components/ProgressCharts"
import { AssignPlanDialog } from "@/components/admin/AssignPlanDialog"
import { AddPaymentDialog } from "@/components/admin/AddPaymentDialog"
import { ChangeCoachDialog } from "@/components/admin/ChangeCoachDialog"
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog"
import { DeleteStudentButton } from "@/components/admin/DeleteStudentButton"
import { EditStudentDialog } from "@/components/admin/EditStudentDialog"
import { RescheduleBookingDialog } from "@/components/admin/RescheduleBookingDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PaymentBadge } from "@/components/coach/PaymentBadge"
import Link from "next/link"
import { format, parseISO, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeft, MessageCircle, Calendar, Dumbbell, Trophy,
  Flame, AlertTriangle, DollarSign, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") redirect("/login")

  const { id } = await params
  const student = await getStudentById(id)
  if (!student) notFound()

  const [
    coachSlots, assignedSlots, upcomingBookings,
    stats, weeklySessions, prs,
    wellnessLogs, studentMetrics, recentPayments,
    coaches, plans,
  ] = await Promise.all([
    student.coachId ? getCoachSlots(student.coachId) : Promise.resolve([]),
    getStudentAssignedSlots(id),
    getStudentBookingsAll(id),
    getStudentStats(id),
    getSessionsPerWeek(id, 8),
    getStudentPRs(id),
    getWellnessHistory(id, 14),
    getStudentMetrics(id),
    getStudentPayments(id, 6),
    getCoachesForSelect(),
    getActivePlans(),
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
    <div className="px-4 py-5 space-y-5">

      {/* Back */}
      <Link href="/admin/alumnos" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" />
        Alumnos
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={student.image ?? undefined} />
          <AvatarFallback className="text-sm font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate">{student.name}</h2>
          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
        <div className="flex items-center gap-2 shrink-0">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </a>
          )}
          <EditStudentDialog
            studentId={id}
            name={student.name}
            email={student.email}
            sport={student.sport}
            whatsapp={student.whatsapp}
            objectives={student.objectives}
            injuryHistory={student.injuryHistory}
          />
        </div>
      </div>

      {/* Plan + admin actions */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
            <p className="font-semibold mt-0.5">{student.planName ?? "Sin plan"}</p>
          </div>
          <div className="flex items-center gap-2">
            {student.planEnd && (
              <p className="text-xs text-muted-foreground">
                Vence {format(parseISO(student.planEnd), "d MMM", { locale: es })}
              </p>
            )}
            <AssignPlanDialog studentId={id} studentName={student.name} plans={plans} />
          </div>
        </div>
        <AddPaymentDialog studentId={id} studentName={student.name} payments={recentPayments} />
      </div>

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

      {/* Turnos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Turnos
          </h3>
          <div className="flex items-center gap-3">
            {student.coachId && (
              <AssignStudentScheduleDialog
                studentId={id}
                studentName={student.name}
                coachSlots={coachSlots}
                assignedSlotIds={assignedSlots.map((s) => s.id)}
                planDays={student.planDays}
              />
            )}
            {coachSlots.length > 0 && (
              <CreateBookingDialog studentId={id} slots={coachSlots} />
            )}
          </div>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="rounded-xl border bg-card p-5 text-center text-sm text-muted-foreground">
            No hay turnos agendados.
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {upcomingBookings.map((b) => {
              const dateObj = parseISO(b.date)
              return (
                <div key={b.bookingId} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {DAY_NAMES[b.dayOfWeek]} · {format(dateObj, "d MMM", { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.startTime} hs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      b.status === "confirmed" && "bg-emerald-100 text-emerald-700",
                      b.status === "cancelled" && "bg-red-100 text-red-700",
                      b.status === "recovery" && "bg-amber-100 text-amber-700",
                    )}>
                      {b.status === "confirmed" ? "Confirmado" : b.status === "cancelled" ? "Cancelado" : "Recupero"}
                    </span>
                    <RescheduleBookingDialog bookingId={b.bookingId} currentDate={b.date} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Progreso */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          Progreso
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-black">{stats.thisMonth}</p>
            <p className="text-[10px] text-muted-foreground">Este mes</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total sesiones</p>
          </div>
        </div>
        {stats.total > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-2">Sesiones por semana</p>
            <SessionsBarChart data={weeklySessions} />
          </div>
        )}
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
      {wellnessLogs.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Bienestar</h3>
          <div className="rounded-xl border bg-card p-4">
            <WellnessHistory logs={wellnessLogs} />
          </div>
        </section>
      )}

      {/* Pagos */}
      {recentPayments.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Pagos recientes
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

      {/* Métricas */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Métricas clínicas</h3>
        <MetricsPanel studentId={id} metrics={studentMetrics} />
      </section>

      {/* Acciones admin */}
      <section className="space-y-2 border-t pt-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Settings className="h-3.5 w-3.5" /> Administración
        </h3>
        <div className="rounded-xl border bg-card divide-y overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-sm font-medium">Coach asignado</p>
              <p className="text-xs text-muted-foreground">{student.coachName ?? "Sin coach"}</p>
            </div>
            <ChangeCoachDialog
              studentId={id}
              studentName={student.name}
              currentCoachId={student.coachId}
              coaches={coaches}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-sm font-medium">Contraseña</p>
            <ResetPasswordDialog userId={student.userId} userName={student.name} />
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-destructive">Eliminar alumno</p>
              <p className="text-xs text-muted-foreground">Esta acción no se puede deshacer</p>
            </div>
            <DeleteStudentButton studentId={id} studentName={student.name} />
          </div>
        </div>
      </section>

      {/* Sesión */}
      <Link
        href={`/coach/alumnos/${id}/sesion`}
        className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
      >
        <Dumbbell className="h-4 w-4" />
        Iniciar sesión de hoy
      </Link>

    </div>
  )
}
