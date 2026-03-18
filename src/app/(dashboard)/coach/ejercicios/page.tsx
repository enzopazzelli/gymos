import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachByUserId, getCoachExercisesFull } from "@/lib/queries/coach"
import { CreateExerciseDialog } from "@/components/coach/CreateExerciseDialog"
import { EditExerciseDialog } from "@/components/coach/EditExerciseDialog"
import { DeleteExerciseButton } from "@/components/coach/DeleteExerciseButton"
import { Globe, Lock, ExternalLink } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  strength: "Fuerza",
  conditioning: "Acondicionamiento",
  rehab: "Rehabilitación",
  mobility: "Movilidad",
}

const CATEGORY_ORDER = ["strength", "conditioning", "rehab", "mobility"]

export default async function CoachEjerciciosPage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const allExercises = await getCoachExercisesFull(coach.id)

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = allExercises.filter((e) => e.category === cat)
    return acc
  }, {} as Record<string, typeof allExercises>)

  const total = allExercises.length
  const mine = allExercises.filter((e) => e.coachId === coach.id).length

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ejercicios</h2>
          <p className="text-sm text-muted-foreground">{total} en total · {mine} propios</p>
        </div>
        <CreateExerciseDialog />
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const list = grouped[cat]
        if (!list.length) return null
        return (
          <section key={cat} className="space-y-2">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground px-1">
              {CATEGORY_LABELS[cat]} ({list.length})
            </h3>
            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              {list.map((ex) => {
                const isOwn = ex.coachId === coach.id
                return (
                  <div key={ex.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{ex.name}</p>
                        {ex.isGlobal ? (
                          <Globe className="h-3 w-3 text-muted-foreground/50 shrink-0" aria-label="Global" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" aria-label="Solo vos" />
                        )}
                      </div>
                      {ex.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ex.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {ex.videoUrl && (
                        <a
                          href={ex.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          title="Ver video"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {isOwn && (
                        <>
                          <EditExerciseDialog exercise={ex} />
                          <DeleteExerciseButton exerciseId={ex.id} exerciseName={ex.name} />
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {total === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No hay ejercicios todavía. Creá el primero.
        </div>
      )}
    </div>
  )
}
