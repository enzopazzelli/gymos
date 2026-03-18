import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachByUserId, getCoachStudents, getStudentsPaymentStatus, getStudentsLastSession } from "@/lib/queries/coach"
import { getActivePlans } from "@/lib/queries/admin"
import { CreateStudentDialog } from "@/components/coach/CreateStudentDialog"
import { PaymentBadge } from "@/components/coach/PaymentBadge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Users, AlertTriangle } from "lucide-react"
import { differenceInDays, parseISO } from "date-fns"

export default async function CoachAlumnosPage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const [students, paymentStatuses, lastSessionMap, plans] = await Promise.all([
    getCoachStudents(coach.id),
    getStudentsPaymentStatus(coach.id),
    getStudentsLastSession(coach.id),
    getActivePlans(),
  ])

  const paymentMap = Object.fromEntries(
    paymentStatuses.map((p) => [p.studentId, p.paymentStatus])
  )

  const today = new Date()

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alumnos</h2>
          <p className="text-sm text-muted-foreground">{students.length} asignados</p>
        </div>
        <CreateStudentDialog plans={plans} />
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 flex flex-col items-center gap-2 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Todavía no tenés alumnos asignados.</p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card overflow-hidden">
          {students.map((student) => {
            const status = paymentMap[student.id] ?? "red"
            const initials = student.name
              ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

            const lastDate = lastSessionMap[student.id]
            const daysSince = lastDate
              ? differenceInDays(today, parseISO(lastDate))
              : null
            const showRetention = daysSince === null || daysSince >= 7

            return (
              <Link
                key={student.id}
                href={`/coach/alumnos/${student.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.image ?? undefined} />
                  <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{student.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <p className="text-[11px] text-muted-foreground">
                      {student.plan ?? "Sin plan"} · {student.sport ?? "—"}
                    </p>
                    {showRetention && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {daysSince === null ? "Sin sesiones" : `${daysSince}d sin entrenar`}
                      </span>
                    )}
                  </div>
                </div>
                <PaymentBadge status={status} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
