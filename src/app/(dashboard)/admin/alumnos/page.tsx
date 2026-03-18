import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllStudentsWithCoach, getCoachesForSelect, getActivePlans } from "@/lib/queries/admin"
import { CreateStudentDialog } from "@/components/admin/CreateStudentDialog"
import { CreatePlanDialog } from "@/components/admin/CreatePlanDialog"
import { ImportStudentsDialog } from "@/components/admin/ImportStudentsDialog"
import { differenceInDays, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Users, ChevronRight } from "lucide-react"
import Link from "next/link"

export default async function AdminAlumnosPage() {
  const session = await auth()
  if (!session || session.user.role !== "admin") redirect("/login")

  const [students, coaches, plans] = await Promise.all([
    getAllStudentsWithCoach(),
    getCoachesForSelect(),
    getActivePlans(),
  ])

  const today = new Date()

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alumnos</h2>
          <p className="text-sm text-muted-foreground">{students.length} registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <ImportStudentsDialog coaches={coaches} plans={plans} />
          <CreatePlanDialog />
          <CreateStudentDialog coaches={coaches} plans={plans} />
        </div>
      </div>

      {plans.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No hay planes creados todavía. Creá al menos uno antes de asignar alumnos.
        </div>
      )}

      {students.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 flex flex-col items-center gap-2 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay alumnos. Creá el primero.</p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card overflow-hidden">
          {students.map((s) => {
            let status: "green" | "yellow" | "red" = "red"
            if (s.planEnd) {
              const daysLeft = differenceInDays(parseISO(s.planEnd), today)
              if (daysLeft > 5) status = "green"
              else if (daysLeft >= 1) status = "yellow"
            }

            return (
              <Link
                key={s.studentId}
                href={`/admin/alumnos/${s.studentId}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
              >
                {/* Status dot */}
                <span className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  !s.planName && "bg-muted-foreground/30",
                  s.planName && status === "green" && "bg-emerald-500",
                  s.planName && status === "yellow" && "bg-amber-500",
                  s.planName && status === "red" && "bg-red-500",
                )} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {s.coachName ?? "Sin coach"}
                    {s.planName ? ` · ${s.planName}` : " · Sin plan"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
