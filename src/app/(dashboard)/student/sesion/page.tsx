import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getStudentByUserId, getStudentActiveRoutine } from "@/lib/queries/student"
import { getOrCreateTodaySession, getSessionExistingLogs, getLastExercisePerformances } from "@/lib/queries/sessions"
import { SessionLogger } from "@/components/SessionLogger"

export default async function StudentSessionPage() {
  const session = await auth()
  if (!session || session.user.role !== "student") redirect("/login")

  const student = await getStudentByUserId(session.user.id)
  if (!student) redirect("/login")

  if (!student.coachId) {
    return (
      <div className="px-4 py-5 space-y-4">
        <h2 className="text-2xl font-bold">Sesión</h2>
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No tenés coach asignado todavía.
        </div>
      </div>
    )
  }

  const routine = await getStudentActiveRoutine(student.id)
  if (!routine) {
    return (
      <div className="px-4 py-5 space-y-4">
        <h2 className="text-2xl font-bold">Sesión</h2>
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Tu coach todavía no te asignó una rutina.
        </div>
      </div>
    )
  }

  const { id: sessionId, startedAt } = await getOrCreateTodaySession(student.id, student.coachId, routine.id)

  const allExerciseIds = routine.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId))
  const [existingLogs, prevPerformance] = await Promise.all([
    getSessionExistingLogs(sessionId),
    getLastExercisePerformances(student.id, allExerciseIds),
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
        studentName={session.user.name ?? ""}
        blocks={blocks}
        backHref="/student/rutina"
        role="student"
        startedAt={startedAt.toISOString()}
      />
    </div>
  )
}
