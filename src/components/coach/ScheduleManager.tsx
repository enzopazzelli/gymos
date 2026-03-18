"use client"

import { cn } from "@/lib/utils"

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"]

type AssignedStudent = {
  studentId: string
  name: string | null
}

type Slot = {
  id: string
  dayOfWeek: number
  startTime: string
  maxCapacity: number
  assignedStudents: AssignedStudent[]
}

interface Props {
  slots: Slot[]
}

export function ScheduleManager({ slots }: Props) {
  // We need client state for selected day — but since this is now purely display,
  // we can use a simple approach. Still needs "use client" for the tab interaction.
  // Using URL-param-free approach: local state via a hidden trick.
  // Actually let's keep useState but import it inline.
  return <ScheduleManagerInner slots={slots} />
}

import { useState } from "react"

function ScheduleManagerInner({ slots }: Props) {
  const [selectedDay, setSelectedDay] = useState(0)

  const daySlots = slots
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="space-y-4">
      {/* Day tabs */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_SHORT.map((d, i) => {
          const count = slots.filter((s) => s.dayOfWeek === i).length
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors",
                selectedDay === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold uppercase",
                selectedDay === i ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {d}
              </span>
              <span className="text-sm font-bold">{count || "·"}</span>
            </button>
          )
        })}
      </div>

      {/* Day header */}
      <h3 className="font-semibold text-sm">{DAY_NAMES[selectedDay]}</h3>

      {/* Slots */}
      {daySlots.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay turnos configurados para {DAY_NAMES[selectedDay].toLowerCase()}.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border">
          {daySlots.map((slot) => {
            const assigned = slot.assignedStudents.length
            const full = assigned >= slot.maxCapacity
            return (
              <div key={slot.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-bold tabular-nums w-12 shrink-0 text-muted-foreground">
                  {slot.startTime}
                </span>
                <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
                  {assigned === 0 ? (
                    <span className="text-sm text-muted-foreground italic">Disponible</span>
                  ) : (
                    slot.assignedStudents.map((s) => (
                      <span
                        key={s.studentId}
                        className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                      >
                        {s.name ?? "Alumno"}
                      </span>
                    ))
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold shrink-0 tabular-nums",
                  full ? "text-red-500" : "text-muted-foreground"
                )}>
                  {assigned}/{slot.maxCapacity}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
