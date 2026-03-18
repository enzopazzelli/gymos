import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachByUserId, getCoachRoutines } from "@/lib/queries/coach"
import { CreateRoutineDialog } from "@/components/coach/CreateRoutineDialog"
import { DeleteRoutineButton } from "@/components/coach/DeleteRoutineButton"
import { DuplicateRoutineButton } from "@/components/coach/DuplicateRoutineButton"
import Link from "next/link"
import { Dumbbell, ChevronRight, BookOpen } from "lucide-react"

export default async function CoachRutinasPage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const routineList = await getCoachRoutines(coach.id)

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rutinas</h2>
          <p className="text-sm text-muted-foreground">{routineList.length} creadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/coach/ejercicios"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Ejercicios
          </Link>
          <CreateRoutineDialog />
        </div>
      </div>

      {routineList.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 flex flex-col items-center gap-2 text-center">
          <Dumbbell className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay rutinas. Creá la primera.</p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card overflow-hidden">
          {routineList.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/coach/rutinas/${r.id}`} className="flex-1 min-w-0">
                <p className="font-medium text-sm">{r.name}</p>
                {r.description && (
                  <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {r.assignmentCount} alumno{r.assignmentCount !== 1 ? "s" : ""} asignado{r.assignmentCount !== 1 ? "s" : ""}
                </p>
              </Link>
              <DuplicateRoutineButton routineId={r.id} />
              <DeleteRoutineButton routineId={r.id} routineName={r.name} />
              <Link href={`/coach/rutinas/${r.id}`} className="text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
