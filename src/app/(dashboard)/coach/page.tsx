import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  getCoachByUserId,
  getCoachStudents,
  getTodayBookings,
  getStudentsPaymentStatus,
} from "@/lib/queries/coach"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PaymentBadge } from "@/components/coach/PaymentBadge"
import { AttendanceButton } from "@/components/coach/AttendanceButton"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Users, AlertCircle, CheckCircle2, MessageCircle } from "lucide-react"

export default async function CoachDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const [students, todayBookings, paymentStatuses] = await Promise.all([
    getCoachStudents(coach.id),
    getTodayBookings(coach.id),
    getStudentsPaymentStatus(coach.id),
  ])

  const paymentMap = Object.fromEntries(
    paymentStatuses.map((p) => [p.studentId, p.paymentStatus])
  )

  const greenCount = paymentStatuses.filter((p) => p.paymentStatus === "green").length
  const redCount = paymentStatuses.filter((p) => p.paymentStatus === "red").length
  const yellowCount = paymentStatuses.filter((p) => p.paymentStatus === "yellow").length

  const firstName = session.user.name?.split(" ")[0] ?? "Coach"
  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  const whatsappBase = coach.whatsappNumber
    ? `https://wa.me/${coach.whatsappNumber.replace(/\D/g, "")}`
    : null

  return (
    <div className="px-4 py-5 space-y-6">

      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold">Buenas, {firstName} 👋</h2>
        <p className="text-sm text-muted-foreground capitalize">{todayLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-black">{students.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Alumnos</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-black text-emerald-500">{greenCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Al día</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-black text-red-500">{redCount + yellowCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pendiente</p>
        </div>
      </div>

      {/* Turnos de hoy */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Hoy — {todayBookings.length} turno{todayBookings.length !== 1 && "s"}
          </h3>
        </div>

        {todayBookings.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No hay turnos para hoy.
          </div>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((booking) => {
              const initials = booking.studentName
                ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"
              const waLink = whatsappBase
                ? `${whatsappBase}?text=Hola%20${encodeURIComponent(booking.studentName ?? "")}%2C%20¿podés%20confirmar%20tu%20turno%20de%20hoy%3F`
                : null

              return (
                <div key={booking.bookingId} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={booking.studentImage ?? undefined} />
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{booking.studentName}</p>
                      <p className="text-xs text-muted-foreground">{booking.startTime}</p>
                    </div>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 hover:text-emerald-600"
                        title="Consultar por WhatsApp"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                  <AttendanceButton
                    bookingId={booking.bookingId}
                    initialPresent={booking.present ?? null}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Lista de alumnos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Mis alumnos
          </h3>
          <Link href="/coach/alumnos" className="text-xs text-primary font-medium">
            Ver todos
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Todavía no tenés alumnos asignados.
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {students.map((student) => {
              const status = paymentMap[student.id] ?? "red"
              const initials = student.name
                ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

              return (
                <Link
                  key={student.id}
                  href={`/coach/alumnos/${student.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={student.image ?? undefined} />
                    <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{student.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {student.plan ?? "Sin plan"} · {student.sport ?? "—"}
                    </p>
                  </div>
                  <PaymentBadge status={status} />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
