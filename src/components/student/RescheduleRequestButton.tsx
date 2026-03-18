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
import { Textarea } from "@/components/ui/textarea"
import {
  requestReschedule,
  cancelRescheduleRequest,
  acceptOfferedSlot,
} from "@/lib/actions/rescheduleRequest"
import type { StudentRescheduleRequestInfo } from "@/lib/queries/rescheduleRequest"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Props {
  bookingId: string
  date: string
  startTime: string
  request?: StudentRescheduleRequestInfo
}

export function RescheduleRequestButton({ bookingId, date, startTime, request }: Props) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  const dateFormatted = format(parseISO(date + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })

  // ── No request / rejected → student can submit a new one ──
  if (!request || request.status === "rejected") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors whitespace-nowrap",
            request?.status === "rejected"
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          )}
        >
          {request?.status === "rejected" ? "Rechazada" : "Cambiar horario"}
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar cambio de horario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-1">
              {request?.status === "rejected" && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm">
                  <p className="font-medium text-red-700">Solicitud anterior rechazada</p>
                  {request.coachNote && (
                    <p className="text-red-600 mt-0.5 text-[12px]">{request.coachNote}</p>
                  )}
                </div>
              )}
              <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
                <p className="font-medium capitalize">{dateFormatted}</p>
                <p className="text-muted-foreground mt-0.5">{startTime} hs</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Mensaje al coach (opcional)
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="¿Qué días o horarios te vendrían mejor?"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  onClick={() => {
                    startTransition(async () => {
                      await requestReschedule(bookingId, note)
                      setOpen(false)
                      setNote("")
                    })
                  }}
                  disabled={pending}
                  className="w-full"
                >
                  {pending ? "Enviando..." : "Enviar solicitud"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
                  Cancelar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ── Pending → student can cancel ──
  if (request.status === "pending") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors whitespace-nowrap"
        >
          Cambio pendiente
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitud enviada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-1">
              <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
                <p className="font-medium capitalize">{dateFormatted}</p>
                <p className="text-muted-foreground mt-0.5">{startTime} hs</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Tu solicitud fue enviada al coach. Te notificará cuando la revise.
              </p>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  variant="outline"
                  onClick={() => {
                    startTransition(async () => {
                      await cancelRescheduleRequest(request.id)
                      setOpen(false)
                    })
                  }}
                  disabled={pending}
                  className="w-full text-muted-foreground"
                >
                  {pending ? "Cancelando..." : "Cancelar solicitud"}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ── Offered → student picks one of the coach's proposed slots ──
  if (request.status === "offered") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors whitespace-nowrap animate-pulse"
        >
          Ver opciones
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>El coach te ofrece estos horarios</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-1">
              {request.coachNote && (
                <p className="text-sm text-muted-foreground italic">"{request.coachNote}"</p>
              )}
              {request.offeredSlots && request.offeredSlots.length > 0 ? (
                <div className="space-y-2">
                  {request.offeredSlots.map((slot) => (
                    <button
                      key={`${slot.slotId}-${slot.date}`}
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          await acceptOfferedSlot(request.id, slot.slotId, slot.date)
                          setOpen(false)
                        })
                      }}
                      className="w-full text-left rounded-xl border bg-card px-4 py-3 hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <p className="text-sm font-medium capitalize">{slot.dayLabel}</p>
                      <p className="text-[11px] text-muted-foreground">{slot.startTime} hs</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin horarios disponibles.</p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    startTransition(async () => {
                      await cancelRescheduleRequest(request.id)
                      setOpen(false)
                    })
                  }}
                  disabled={pending}
                  className="w-full text-muted-foreground"
                >
                  {pending ? "..." : "Cancelar solicitud"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return null
}
