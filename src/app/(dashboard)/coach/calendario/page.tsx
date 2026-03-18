import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachByUserId, getCoachScheduleWithAssignments } from "@/lib/queries/coach"
import { getCoachCalendarWeek } from "@/lib/queries/calendar"
import { getAvailableSlotsForReschedule } from "@/lib/queries/schedule"
import { getPendingRequestsForCoach } from "@/lib/queries/rescheduleRequest"
import { CalendarWeek } from "@/components/CalendarWeek"
import { ScheduleManager } from "@/components/coach/ScheduleManager"
import { RescheduleRequestsPanel } from "@/components/coach/RescheduleRequestsPanel"
import { startOfWeek, format } from "date-fns"
import { CalendarDays, Settings2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

function getWeekStart(w?: string): string {
  if (w) return w
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(monday, "yyyy-MM-dd")
}

export default async function CoachCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; tab?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const { w, tab } = await searchParams
  const activeTab = tab === "horario" ? "horario" : "semana"
  const weekStart = getWeekStart(typeof w === "string" ? w : undefined)

  const scheduleSlots = activeTab === "horario"
    ? await getCoachScheduleWithAssignments(coach.id)
    : []

  let events: Awaited<ReturnType<typeof getCoachCalendarWeek>> = []
  let availableSlots: Awaited<ReturnType<typeof getAvailableSlotsForReschedule>> = []
  let pendingRequests: Awaited<ReturnType<typeof getPendingRequestsForCoach>> = []
  if (activeTab === "semana") {
    ;[events, availableSlots, pendingRequests] = await Promise.all([
      getCoachCalendarWeek(coach.id, weekStart),
      getAvailableSlotsForReschedule(coach.id),
      getPendingRequestsForCoach(coach.id),
    ])
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Calendario</h2>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        <Link
          href="/coach/calendario?tab=semana"
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "semana"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Semana
        </Link>
        <Link
          href="/coach/calendario?tab=horario"
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "horario"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings2 className="h-4 w-4" />
          Horario
        </Link>
      </div>

      {activeTab === "semana" ? (
        <>
          <RescheduleRequestsPanel
            requests={pendingRequests}
            availableSlots={availableSlots}
          />
          <CalendarWeek
          key={weekStart}
          weekStart={weekStart}
          events={events}
          role="coach"
          basePath="/coach/calendario"
          studentLinkBase="/coach/alumnos/"
          availableSlots={availableSlots}
        />
        </>
      ) : (
        <ScheduleManager slots={scheduleSlots} />
      )}
    </div>
  )
}
