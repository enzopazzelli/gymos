import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  getStudentByUserId,
  getStudentActivePlan,
  getAvailableSlotsForStudent,
  getStudentAssignedSlots,
} from "@/lib/queries/student"
import { SchedulePicker } from "@/components/student/SchedulePicker"
import { CalendarClock, AlertCircle } from "lucide-react"

export default async function ElegirHorarioPage() {
  const session = await auth()
  if (!session || session.user.role !== "student") redirect("/login")

  const student = await getStudentByUserId(session.user.id)
  if (!student) redirect("/login")

  const [plan, availableSlots, currentSlots] = await Promise.all([
    getStudentActivePlan(student.id),
    getAvailableSlotsForStudent(student.id),
    getStudentAssignedSlots(student.id),
  ])

  // No coach assigned
  if (!student.coachId) {
    return (
      <div className="px-4 py-5 space-y-4">
        <h2 className="text-2xl font-bold">Elegir horario</h2>
        <div className="rounded-xl border bg-card p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">Sin coach asignado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aún no tenés un coach asignado. Contactá al gimnasio para que te asignen uno.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // No active plan
  if (!plan) {
    return (
      <div className="px-4 py-5 space-y-4">
        <h2 className="text-2xl font-bold">Elegir horario</h2>
        <div className="rounded-xl border bg-card p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">Sin plan activo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Necesitás un plan activo para elegir tu horario.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // No available slots from coach
  if (availableSlots.length === 0 && currentSlots.length === 0) {
    return (
      <div className="px-4 py-5 space-y-4">
        <h2 className="text-2xl font-bold">Elegir horario</h2>
        <div className="rounded-xl border bg-card p-6 flex flex-col items-center text-center gap-3">
          <CalendarClock className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">Sin turnos disponibles</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tu coach todavía no cargó turnos disponibles. Volvé a revisar más tarde.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isChanging = currentSlots.length > 0

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">
          {isChanging ? "Cambiar horario" : "Elegir horario"}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {plan.planName} · {plan.daysPerWeek} día{plan.daysPerWeek !== 1 ? "s" : ""} por semana
        </p>
      </div>

      <SchedulePicker
        availableSlots={availableSlots}
        planDays={plan.daysPerWeek}
        currentSlots={currentSlots}
      />
    </div>
  )
}
