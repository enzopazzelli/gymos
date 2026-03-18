import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachByUserId, getCoachSlots } from "@/lib/queries/coach"
import { CoachScheduleConfig } from "@/components/coach/CoachScheduleConfig"
import { EditCoachProfileDialog } from "@/components/coach/EditCoachProfileDialog"
import { CoachPushToggle } from "@/components/coach/CoachPushToggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/lib/actions/auth"
import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { MessageCircle, Star, LogOut } from "lucide-react"

export default async function CoachPerfilPage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const [slots, pushSub] = await Promise.all([
    getCoachSlots(coach.id),
    db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, session.user.id)).limit(1).then((r) => r[0] ?? null),
  ])

  const initials = session.user.name
    ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

  // Derive schedule config from existing active slots
  const initialConfig = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const daySlots = slots.filter((s) => s.dayOfWeek === day)
    if (daySlots.length === 0) return { day, active: false, from: "08:00", to: "18:00" }
    const times = daySlots.map((s) => s.startTime).sort()
    const fromH = parseInt(times[0].split(":")[0])
    const toH = parseInt(times[times.length - 1].split(":")[0]) + 1
    return {
      day,
      active: true,
      from: `${String(fromH).padStart(2, "0")}:00`,
      to: `${String(toH).padStart(2, "0")}:00`,
    }
  })

  const initialCapacity = slots.length > 0 ? Math.max(...slots.map((s) => s.maxCapacity)) : 1

  return (
    <div className="px-4 py-5 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={session.user.image ?? undefined} />
          <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{session.user.name}</h2>
          <p className="text-sm text-muted-foreground truncate">{session.user.email}</p>
        </div>
        <EditCoachProfileDialog
          name={session.user.name}
          specialty={coach.specialty}
          whatsapp={coach.whatsappNumber}
          bio={coach.bio}
        />
      </div>

      {/* Info */}
      {(coach.specialty || coach.whatsappNumber || coach.bio) && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          {coach.specialty && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{coach.specialty}</span>
            </div>
          )}
          {coach.whatsappNumber && (
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{coach.whatsappNumber}</span>
            </div>
          )}
          {coach.bio && (
            <p className="text-sm text-muted-foreground">{coach.bio}</p>
          )}
        </div>
      )}

      {/* Notificaciones */}
      <CoachPushToggle initialSubscribed={!!pushSub} />

      {/* Configuración de horario */}
      <CoachScheduleConfig initialConfig={initialConfig} initialCapacity={initialCapacity} />

      {/* Cerrar sesión */}
      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </form>

    </div>
  )
}
