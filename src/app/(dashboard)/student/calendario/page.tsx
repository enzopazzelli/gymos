import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getStudentByUserId, getStudentActivePlan, getStudentAssignedSlots } from "@/lib/queries/student"
import { getStudentCalendarWeek } from "@/lib/queries/calendar"
import { getStudentActiveRescheduleRequests } from "@/lib/queries/rescheduleRequest"
import { CalendarWeek } from "@/components/CalendarWeek"
import { startOfWeek, format, differenceInDays, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Settings2 } from "lucide-react"

function getWeekStart(w?: string): string {
  if (w) return w
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(monday, "yyyy-MM-dd")
}

export default async function StudentCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== "student") redirect("/login")

  const student = await getStudentByUserId(session.user.id)
  if (!student) redirect("/login")

  const { w } = await searchParams
  const weekStart = getWeekStart(typeof w === "string" ? w : undefined)

  const [events, plan, assignedSlots, rescheduleRequests] = await Promise.all([
    getStudentCalendarWeek(student.id, weekStart),
    getStudentActivePlan(student.id),
    getStudentAssignedSlots(student.id),
    getStudentActiveRescheduleRequests(student.id),
  ])

  let daysLeft: number | null = null
  let planColor = "red"
  if (plan?.endDate) {
    daysLeft = differenceInDays(parseISO(plan.endDate), new Date())
    if (daysLeft > 5) planColor = "green"
    else if (daysLeft >= 1) planColor = "yellow"
    else planColor = "red"
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Mis turnos</h2>
        <p className="text-sm text-muted-foreground capitalize">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Plan status */}
      {plan && (
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium">{plan.planName}</p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                planColor === "green" && "bg-emerald-100 text-emerald-700",
                planColor === "yellow" && "bg-yellow-100 text-yellow-700",
                planColor === "red" && "bg-red-100 text-red-700"
              )}
            >
              {daysLeft === null
                ? "Sin vencimiento"
                : daysLeft <= 0
                ? "Vencido"
                : `Vence en ${daysLeft}d`}
            </span>
            {assignedSlots.length > 0 && (
              <Link
                href="/student/elegir-horario"
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1"
              >
                <Settings2 className="h-3 w-3" />
                Cambiar
              </Link>
            )}
          </div>
        </div>
      )}

      <CalendarWeek
        key={weekStart}
        weekStart={weekStart}
        events={events}
        role="student"
        basePath="/student/calendario"
        rescheduleRequests={rescheduleRequests}
      />
    </div>
  )
}
