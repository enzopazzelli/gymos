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
import { MessageCircle } from "lucide-react"
import { cancelBooking } from "@/lib/actions/booking"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
  bookingId: string
  date: string
  startTime: string
  coachName?: string | null
  coachWhatsApp?: string | null
}

export function CancelBookingDialog({
  bookingId,
  date,
  startTime,
  coachName,
  coachWhatsApp,
}: Props) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      await cancelBooking(bookingId)
      setDone(true)
    })
  }

  const dateFormatted = format(parseISO(date + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })
  const waMessage = `Hola! No voy a poder asistir al turno del ${dateFormatted} a las ${startTime} hs. Aviso con anticipación.`
  const waLink = coachWhatsApp
    ? `https://wa.me/${coachWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`
    : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors whitespace-nowrap"
      >
        No puedo ir
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿No podés asistir?</DialogTitle>
          </DialogHeader>

          {!done ? (
            <div className="space-y-4 mt-1">
              <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
                <p className="font-medium capitalize">{dateFormatted}</p>
                <p className="text-muted-foreground mt-0.5">{startTime} hs</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Tu turno quedará cancelado. Si podés, avisá al coach con anticipación.
              </p>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  onClick={handleCancel}
                  disabled={pending}
                  variant="destructive"
                  className="w-full"
                >
                  {pending ? "Cancelando..." : "Confirmar — no voy"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
                  Volver
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3 mt-2 text-center">
              <p className="text-sm text-muted-foreground">Turno cancelado.</p>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 text-white py-2.5 text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Avisar {coachName ? `a ${coachName}` : "al coach"} por WhatsApp
                </a>
              )}
              <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
