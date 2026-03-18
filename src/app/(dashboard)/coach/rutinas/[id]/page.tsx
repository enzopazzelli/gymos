import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getCoachByUserId, getRoutineWithBlocks, getCoachExercises, getCoachStudents } from "@/lib/queries/coach"
import { RoutineEditor } from "@/components/coach/RoutineEditor"

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/login")

  const { id } = await params
  const coach = await getCoachByUserId(session.user.id)
  if (!coach) redirect("/login")

  const [routine, exercises, students] = await Promise.all([
    getRoutineWithBlocks(id, coach.id),
    getCoachExercises(coach.id),
    getCoachStudents(coach.id),
  ])

  if (!routine) notFound()

  return (
    <div className="px-4 py-5">
      <RoutineEditor routine={routine} exercises={exercises} students={students} />
    </div>
  )
}
