"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, MessageCircle } from "lucide-react"
import { rescheduleBooking } from "@/lib/actions/booking"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

export type AvailableSlot = {
  slotId: string
  date: string
  startTime: string
  dayLabel: string
}

interface Props {
  bookingId: string
  currentDate: string
  currentTime: string
  studentName: string
  studentWhatsApp?: string | null
  availableSlots: AvailableSlot[]
}

export function RescheduleBookingDialog({
  bookingId,
  currentDate,
  currentTime,
  studentName,
  studentWhatsApp,
  availableSlots,
}: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AvailableSlot | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    if (!selected) return
    const fd = new FormData()
    fd.set("bookingId", bookingId)
    fd.set("slotId", selected.slotId)
    fd.set("date", selected.date)
    startTransition(async () => {
      await rescheduleBooking(fd)
      setDone(true)
    })
  }

  function handleClose() {
    setOpen(false)
    setSelected(null)
    setDone(false)
  }

  const dateFormatted = format(parseISO(currentDate + "T00:00:00"), "d 'de' MMMM", { locale: es })
  const newDateFormatted = selected
    ? format(parseISO(selected.date + "T00:00:00"), "d 'de' MMMM", { locale: es })
    : ""

  const waMessage = selected
    ? `Hola ${studentName}! Tu turno del ${dateFormatted} a las ${currentTime} fue reprogramado al ${selected.dayLabel} a las ${selected.startTime} hs. ✅`
    : ""
  const waLink =
    studentWhatsApp && selected
      ? `https://wa.me/${studentWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`
      : null

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors whitespace-nowrap"
      >
        Reprog.
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Reprogramar turno
            </DialogTitle>
          </DialogHeader>

          {!done ? (
            <div className="space-y-4 mt-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{studentName}</span> ·{" "}
                {dateFormatted} a las {currentTime} hs
              </p>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nuevo horario
                </p>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay turnos disponibles en los próximos 21 días.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {availableSlots.map((s) => {
                      const isSelected =
                        selected?.date === s.date && selected?.slotId === s.slotId
                      return (
                        <button
                          key={`${s.slotId}|${s.date}`}
                          type="button"
                          onClick={() => setSelected(s)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors capitalize",
                            isSelected
                              ? "border-primary bg-primary/5 font-medium"
                              : "border-input hover:bg-muted"
                          )}
                        >
                          {s.dayLabel}
                          <span className="text-muted-foreground ml-2 font-normal">
                            {s.startTime} hs
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={handleConfirm}
                  disabled={!selected || pending}
                  className="w-full"
                >
                  {pending ? "Reprogramando..." : "Confirmar reprogramación"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3 mt-2 text-center">
              <div className="rounded-xl bg-emerald-50 text-emerald-700 p-4">
                <p className="text-sm font-semibold">✅ Turno reprogramado</p>
                <p className="text-xs mt-1 capitalize">
                  {selected?.dayLabel} a las {selected?.startTime} hs
                </p>
              </div>
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 text-white py-2.5 text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Avisar a {studentName} por WhatsApp
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Recordá avisar al alumno.</p>
              )}
              <Button variant="outline" onClick={handleClose} className="w-full">
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
