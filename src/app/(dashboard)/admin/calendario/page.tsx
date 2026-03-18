import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAdminCalendarWeek } from "@/lib/queries/calendar"
import { CalendarWeek } from "@/components/CalendarWeek"
import { startOfWeek, format } from "date-fns"

function getWeekStart(w?: string): string {
  if (w) return w
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(monday, "yyyy-MM-dd")
}

export default async function AdminCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== "admin") redirect("/login")

  const { w } = await searchParams
  const weekStart = getWeekStart(typeof w === "string" ? w : undefined)

  const events = await getAdminCalendarWeek(weekStart)

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Calendario</h2>
        <p className="text-sm text-muted-foreground">Todos los turnos del gimnasio</p>
      </div>

      <CalendarWeek
        key={weekStart}
        weekStart={weekStart}
        events={events}
        role="admin"
        basePath="/admin/calendario"
      />
    </div>
  )
}
