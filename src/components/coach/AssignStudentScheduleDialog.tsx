"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { setStudentSlots } from "@/lib/actions/schedule"
import { CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"]

type Slot = { id: string; dayOfWeek: number; startTime: string }

interface Props {
  studentId: string
  studentName: string | null
  coachSlots: Slot[]
  assignedSlotIds: string[]
  planDays?: number | null
}

export function AssignStudentScheduleDialog({
  studentId,
  studentName,
  coachSlots,
  assignedSlotIds,
  planDays,
}: Props) {
  // daySlots maps dayOfWeek → slotId ("" = day selected but no time chosen)
  function buildInitial(): Record<number, string> {
    const map: Record<number, string> = {}
    for (const slotId of assignedSlotIds) {
      const slot = coachSlots.find((s) => s.id === slotId)
      if (slot) map[slot.dayOfWeek] = slotId
    }
    return map
  }

  const [open, setOpen] = useState(false)
  const [daySlots, setDaySlots] = useState<Record<number, string>>(buildInitial)
  const [pending, startTransition] = useTransition()

  function handleOpen() {
    setDaySlots(buildInitial())
    setOpen(true)
  }

  const activeDayCount = Object.keys(daySlots).length
  const atLimit = !!planDays && activeDayCount >= planDays

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

  const allDaysHaveTime = activeDayCount > 0 &&
    Object.values(daySlots).every((v) => v !== "")

  const selectedSlotIds = Object.values(daySlots).filter(Boolean)

  function handleSave() {
    startTransition(async () => {
      await setStudentSlots(studentId, selectedSlotIds)
      setOpen(false)
    })
  }

  const daysWithSlots = new Set(coachSlots.map((s) => s.dayOfWeek))

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {assignedSlotIds.length > 0 ? "Cambiar horario" : "Asignar horario"}
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v && !pending) setOpen(false) }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Horario — {studentName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {planDays && (
              <p className="text-xs text-muted-foreground">
                Plan de{" "}
                <span className="font-semibold text-foreground">{planDays} día{planDays !== 1 ? "s" : ""}</span>
                {" "}· elegí hasta {planDays} día{planDays !== 1 ? "s" : ""}
              </p>
            )}

            {/* ── Day toggles ── */}
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

            {/* ── Time selects for active days ── */}
            {activeDayCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Seleccioná los días de entrenamiento
              </p>
            ) : (
              <div className="space-y-2.5">
                {[0, 1, 2, 3, 4, 5, 6]
                  .filter((d) => d in daySlots)
                  .map((day) => {
                    const slotsForDay = coachSlots
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

            {/* Counter */}
            {activeDayCount > 0 && (
              <p className={cn(
                "text-xs font-medium",
                planDays && activeDayCount === planDays
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              )}>
                {activeDayCount}{planDays ? `/${planDays}` : ""} día{activeDayCount !== 1 ? "s" : ""} seleccionado{activeDayCount !== 1 ? "s" : ""}
                {!allDaysHaveTime && " · Elegí el horario de cada día"}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 mt-4 flex-row">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={pending || !allDaysHaveTime}
              className="flex-1"
            >
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
