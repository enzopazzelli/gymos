import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getStudentByUserId, getStudentActiveRoutine } from "@/lib/queries/student"
import { Dumbbell } from "lucide-react"
import Link from "next/link"

const CATEGORY_LABELS: Record<string, string> = {
  strength: "Fuerza",
  conditioning: "Acond.",
  rehab: "Rehab.",
  mobility: "Movilidad",
}

export default async function StudentRutinaPage() {
  const session = await auth()
  if (!session || session.user.role !== "student") redirect("/login")

  const student = await getStudentByUserId(session.user.id)
  if (!student) redirect("/login")

  const routine = await getStudentActiveRoutine(student.id)

  return (
    <div className="px-4 py-5 space-y-4">
      <h2 className="text-2xl font-bold">Mi rutina</h2>

      {!routine ? (
        <div className="rounded-xl border bg-card p-10 flex flex-col items-center gap-3 text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold">Sin rutina asignada</p>
          <p className="text-sm text-muted-foreground">
            Cuando tu coach te asigne una rutina, la vas a ver acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">{routine.name}</h3>
              {routine.description && (
                <p className="text-sm text-muted-foreground">{routine.description}</p>
              )}
            </div>
            <Link
              href="/student/sesion"
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Dumbbell className="h-3.5 w-3.5" />
              Entrenar hoy
            </Link>
          </div>

          {routine.blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">La rutina no tiene ejercicios todavía.</p>
          ) : (
            <div className="space-y-3">
              {routine.blocks.map((block) => (
                <div key={block.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b">
                    <p className="font-semibold text-sm">{block.name}</p>
                  </div>
                  {block.exercises.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted-foreground italic">Sin ejercicios.</p>
                  ) : (
                    <div className="divide-y">
                      {block.exercises.map((ex, idx) => (
                        <div key={ex.id} className="px-4 py-3 flex items-start gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{ex.exerciseName}</p>
                            <p className="text-xs text-muted-foreground">
                              {[
                                ex.sets ? `${ex.sets} series` : null,
                                ex.reps ? `× ${ex.reps}` : null,
                              ].filter(Boolean).join(" ") || "—"}
                              <span className="ml-2 text-muted-foreground/60">
                                {CATEGORY_LABELS[ex.exerciseCategory]}
                              </span>
                            </p>
                            {ex.technicalNotes && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">{ex.technicalNotes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
