import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getCoachByUserId, getStudentById } from "@/lib/queries/coach"
import { getStudentActiveRoutine } from "@/lib/queries/student"
import { getOrCreateTodaySession, getSessionExistingLogs, getLastExercisePerformances } from "@/lib/queries/sessions"
import { SessionLogger } from "@/components/SessionLogger"

export default async function CoachSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const { id: studentId } = await params
  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const student = await getStudentById(studentId)
  if (!student || student.coachId !== coach.id) notFound()

  const routine = await getStudentActiveRoutine(studentId)
  if (!routine) {
    return (
      <div className="px-4 py-5 space-y-4">
        <h2 className="text-2xl font-bold">Sesión</h2>
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {student.name} no tiene una rutina asignada todavía.
        </div>
      </div>
    )
  }

  const { id: sessionId, startedAt } = await getOrCreateTodaySession(studentId, coach.id, routine.id)

  const allExerciseIds = routine.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId))
  const [existingLogs, prevPerformance] = await Promise.all([
    getSessionExistingLogs(sessionId),
    getLastExercisePerformances(studentId, allExerciseIds),
  ])

  const blocks = routine.blocks.map((block) => ({
    id: block.id,
    name: block.name,
    exercises: block.exercises.map((ex) => ({
      id: ex.id,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName ?? ex.exerciseId,
      exerciseCategory: ex.exerciseCategory,
      order: ex.order,
      prevPerformance: prevPerformance[ex.exerciseId] ?? null,
      sets: (existingLogs[ex.exerciseId] ?? []).map((s) => ({
        weight: s.weight != null ? String(s.weight) : "",
        reps: s.reps,
      })),
    })),
  }))

  return (
    <div className="px-4 py-5">
      <SessionLogger
        sessionId={sessionId}
        studentName={student.name ?? ""}
        blocks={blocks}
        backHref={`/coach/alumnos/${studentId}`}
        role="coach"
        startedAt={startedAt.toISOString()}
      />
    </div>
  )
}
