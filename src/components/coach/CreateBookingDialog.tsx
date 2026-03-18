"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarPlus } from "lucide-react"
import { createBooking, createBookingsBulk } from "@/lib/actions/schedule"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const WEEK_OPTIONS = [1, 2, 4, 8, 12]

interface Slot {
  id: string
  dayOfWeek: number
  startTime: string
  maxCapacity: number
}

export function CreateBookingDialog({ studentId, slots }: { studentId: string; slots: Slot[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState(1)

  const isBulk = weeks > 1

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("studentId", studentId)
    setError(null)

    startTransition(async () => {
      try {
        if (isBulk) {
          formData.set("startDate", formData.get("date") as string)
          formData.set("weeks", String(weeks))
          await createBookingsBulk(formData)
        } else {
          await createBooking(formData)
        }
        setOpen(false)
        setWeeks(1)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al crear el turno")
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <CalendarPlus className="h-4 w-4" />
        Nuevo turno
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar turno</DialogTitle>
          </DialogHeader>

          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tenés turnos configurados. Agregalos desde tu perfil.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="bk-slot">Horario *</Label>
                <select
                  id="bk-slot"
                  name="slotId"
                  required
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Seleccioná un horario</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {DAY_NAMES[s.dayOfWeek]} {s.startTime} hs
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-date">
                  {isBulk ? "Primera fecha *" : "Fecha *"}
                </Label>
                <Input
                  id="bk-date"
                  name="date"
                  type="date"
                  required
                  min={format(new Date(), "yyyy-MM-dd")}
                />
                {isBulk && (
                  <p className="text-[11px] text-muted-foreground">
                    La fecha debe coincidir con el día del horario elegido.
                  </p>
                )}
              </div>

              {/* Repetition selector */}
              <div className="space-y-1.5">
                <Label>Repetir</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEK_OPTIONS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeeks(w)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                        weeks === w
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input hover:bg-muted"
                      )}
                    >
                      {w === 1 ? "Solo este" : `${w} sem.`}
                    </button>
                  ))}
                </div>
                {isBulk && (
                  <p className="text-xs text-muted-foreground">
                    Se crearán {weeks} turnos semanales.
                  </p>
                )}
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={pending} className="w-full">
                  {pending
                    ? "Agendando..."
                    : isBulk
                    ? `Agendar ${weeks} semanas`
                    : "Agendar turno"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
