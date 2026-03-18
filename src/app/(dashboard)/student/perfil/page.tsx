import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getStudentByUserId, getStudentActivePlan } from "@/lib/queries/student"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/lib/actions/auth"
import { PushNotificationToggle } from "@/components/student/PushNotificationToggle"
import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { format, parseISO, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function StudentPerfilPage() {
  const session = await auth()
  if (!session || session.user.role !== "student") redirect("/login")

  const student = await getStudentByUserId(session.user.id)
  const [plan, pushSub] = await Promise.all([
    student ? getStudentActivePlan(student.id) : null,
    db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, session.user.id)).limit(1).then((r) => r[0] ?? null),
  ])

  const initials = session.user.name
    ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

  const today = new Date()
  let daysLeft: number | null = null
  let planColor: "green" | "yellow" | "red" = "red"
  if (plan?.endDate) {
    daysLeft = differenceInDays(parseISO(plan.endDate), today)
    if (daysLeft > 5) planColor = "green"
    else if (daysLeft >= 1) planColor = "yellow"
  }

  return (
    <div className="px-4 py-5 space-y-6">

      {/* Avatar + nombre */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={session.user.image ?? undefined} />
          <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{session.user.name}</h2>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
      </div>

      {/* Info */}
      <div className="divide-y rounded-xl border bg-card overflow-hidden">
        {student?.sport && (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Deporte</span>
            <span className="text-sm font-medium">{student.sport}</span>
          </div>
        )}
        {student?.startDate && (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Inicio</span>
            <span className="text-sm font-medium">
              {format(parseISO(student.startDate), "d 'de' MMMM yyyy", { locale: es })}
            </span>
          </div>
        )}
        {plan && (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{plan.planName}</span>
              {daysLeft !== null && (
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  planColor === "green" && "bg-emerald-100 text-emerald-700",
                  planColor === "yellow" && "bg-amber-100 text-amber-700",
                  planColor === "red" && "bg-red-100 text-red-700",
                )}>
                  {daysLeft <= 0 ? "Vencido" : `${daysLeft}d`}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {student?.objectives && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Objetivos</p>
          <p className="text-sm">{student.objectives}</p>
        </div>
      )}

      {/* Notificaciones */}
      <PushNotificationToggle
        initialBookingReminder={pushSub?.notifyBookingReminder ?? false}
        initialPlanExpiry={pushSub?.notifyPlanExpiry ?? false}
      />

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
