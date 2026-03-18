"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { confirmStudentSchedule } from "@/lib/actions/schedule"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"]

type Slot = { id: string; dayOfWeek: number; startTime: string }

interface Props {
  availableSlots: Slot[]
  planDays: number
  currentSlots?: Slot[]
}

export function SchedulePicker({ availableSlots, planDays, currentSlots = [] }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // daySlots maps dayOfWeek → slotId ("" = day selected but no time chosen yet)
  function buildInitial(): Record<number, string> {
    const map: Record<number, string> = {}
    const allSlots = [...currentSlots, ...availableSlots]
    for (const s of currentSlots) {
      // pre-fill from current assignment
      const found = allSlots.find((x) => x.id === s.id)
      if (found) map[found.dayOfWeek] = found.id
    }
    return map
  }

  const [daySlots, setDaySlots] = useState<Record<number, string>>(buildInitial)

  const allSlots = [...currentSlots, ...availableSlots]
  const daysWithSlots = new Set(allSlots.map((s) => s.dayOfWeek))
  const activeDayCount = Object.keys(daySlots).length
  const atLimit = activeDayCount >= planDays

  function toggleDay(day: number) {
    setDaySlots((prev) => {
      const next = { ...prev }
      if (day in next) {
        delete next[day]
      } else {
        if (atLimit) return prev
        next[day] = ""
      }
      return next
    })
  }

  function setDayTime(day: number, slotId: string) {
    setDaySlots((prev) => ({ ...prev, [day]: slotId }))
  }

  const allDaysHaveTime = activeDayCount > 0 && Object.values(daySlots).every((v) => v !== "")
  const selectedSlotIds = Object.values(daySlots).filter(Boolean)

  function handleSubmit() {
    if (activeDayCount !== planDays) {
      setError(`Seleccioná exactamente ${planDays} día${planDays !== 1 ? "s" : ""}`)
      return
    }
    if (!allDaysHaveTime) {
      setError("Elegí el horario para cada día seleccionado")
      return
    }
    const fd = new FormData()
    for (const id of selectedSlotIds) fd.append("slotId", id)
    setError(null)
    startTransition(async () => {
      try {
        await confirmStudentSchedule(fd)
        setDone(true)
        setTimeout(() => router.push("/student/calendario"), 1800)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al confirmar el horario")
      }
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <div>
          <p className="text-xl font-bold">¡Horario confirmado!</p>
          <p className="text-sm text-muted-foreground mt-1">Tus turnos fueron agendados para las próximas semanas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Instructions */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          Elegí tus <span className="font-semibold text-foreground">{planDays} días</span> fijos por semana
        </p>
        <span className={cn(
          "text-sm font-bold tabular-nums",
          activeDayCount === planDays ? "text-emerald-600" : "text-muted-foreground"
        )}>
          {activeDayCount}/{planDays}
        </span>
      </div>

      {/* Day toggles */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_SHORT.map((d, i) => {
          const hasSlots = daysWithSlots.has(i)
          const isSelected = i in daySlots
          const disabled = !hasSlots || (!isSelected && atLimit)

          return (
            <button
              key={i}
              onClick={() => !disabled && toggleDay(i)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center py-2.5 rounded-xl transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : disabled
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-muted border border-transparent"
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold uppercase",
                isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {d}
              </span>
              <span className="text-sm font-bold">
                {isSelected ? "✓" : "·"}
              </span>
            </button>
          )
        })}
      </div>

      {/* Time selects for active days */}
      {activeDayCount === 0 ? (
        <div className="rounded-xl border bg-card p-5 text-center text-sm text-muted-foreground">
          Tocá los días en los que entrenás
        </div>
      ) : (
        <div className="space-y-2.5">
          {[0, 1, 2, 3, 4, 5, 6]
            .filter((d) => d in daySlots)
            .map((day) => {
              const slotsForDay = allSlots
                .filter((s) => s.dayOfWeek === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))

              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-[90px] shrink-0">
                    {DAY_NAMES[day]}
                  </span>
                  <select
                    value={daySlots[day]}
                    onChange={(e) => setDayTime(day, e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
                  >
                    <option value="">— Horario —</option>
                    {slotsForDay.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.startTime} hs
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
        </div>
      )}

      {error && <p className="text-xs text-destructive text-center px-1">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={pending || !allDaysHaveTime || activeDayCount !== planDays}
        className="w-full"
        size="lg"
      >
        {pending
          ? "Confirmando..."
          : activeDayCount < planDays
          ? `Seleccioná ${planDays - activeDayCount} día${planDays - activeDayCount !== 1 ? "s" : ""} más`
          : !allDaysHaveTime
          ? "Elegí el horario de cada día"
          : "Confirmar horario"}
      </Button>
    </div>
  )
}
