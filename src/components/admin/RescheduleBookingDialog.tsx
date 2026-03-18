"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarClock } from "lucide-react"
import { rescheduleBooking } from "@/lib/actions/schedule"
import { format } from "date-fns"

interface Props {
  bookingId: string
  currentDate: string  // "yyyy-MM-dd"
}

export function RescheduleBookingDialog({ bookingId, currentDate }: Props) {
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState(currentDate)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    if (!newDate || newDate === currentDate) { setOpen(false); return }
    setError(null)
    startTransition(async () => {
      try {
        await rescheduleBooking(bookingId, newDate)
        setOpen(false)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al reprogramar")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => { setNewDate(currentDate); setOpen(true) }}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        title="Reprogramar"
      >
        <CalendarClock className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar turno</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Fecha actual: <span className="font-medium text-foreground">{format(new Date(currentDate + "T12:00:00"), "dd/MM/yyyy")}</span>
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="new-date">Nueva fecha</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={pending || !newDate}>
              {pending ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
