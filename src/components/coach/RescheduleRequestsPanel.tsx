"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  approveRescheduleRequest,
  rejectRescheduleRequest,
  offerAlternativeSlots,
} from "@/lib/actions/rescheduleRequest"
import type { RescheduleRequestForCoach } from "@/lib/queries/rescheduleRequest"
import type { AvailableSlot } from "@/lib/queries/schedule"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  requests: RescheduleRequestForCoach[]
  availableSlots: AvailableSlot[]
}

type ActiveAction = "approve" | "offer" | "reject" | null

export function RescheduleRequestsPanel({ requests, availableSlots }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [action, setAction] = useState<ActiveAction>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<AvailableSlot[]>([])
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  function selectRequest(id: string, act: ActiveAction) {
    if (activeId === id && action === act) {
      // Toggle off
      setActiveId(null)
      setAction(null)
    } else {
      setActiveId(id)
      setAction(act)
      setSelectedSlot(null)
      setSelectedSlots([])
      setNote("")
    }
  }

  function toggleOfferedSlot(slot: AvailableSlot) {
    const key = `${slot.slotId}|${slot.date}`
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => `${s.slotId}|${s.date}` === key)
      return exists ? prev.filter((s) => `${s.slotId}|${s.date}` !== key) : [...prev, slot]
    })
  }

  if (requests.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <ArrowLeftRight className="h-3.5 w-3.5 text-amber-500" />
        Solicitudes de cambio
        <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </h3>

      <div className="divide-y rounded-xl border bg-card overflow-hidden">
        {requests.map((req) => {
          const isActive = activeId === req.id
          const dateFormatted = format(
            parseISO(req.bookingDate + "T00:00:00"),
            "EEEE d 'de' MMM",
            { locale: es }
          )

          return (
            <div key={req.id} className="px-4 py-3 space-y-3">
              {/* Request info */}
              <div>
                <p className="text-sm font-medium">{req.studentName}</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {dateFormatted} · {req.bookingTime} hs
                </p>
                {req.studentNote && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                    "{req.studentNote}"
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => selectRequest(req.id, "approve")}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors",
                    isActive && action === "approve"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  Reprogramar
                </button>
                <button
                  onClick={() => selectRequest(req.id, "offer")}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors",
                    isActive && action === "offer"
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  Ofrecer opciones
                </button>
                <button
                  onClick={() => selectRequest(req.id, "reject")}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors",
                    isActive && action === "reject"
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  Rechazar
                </button>
              </div>

              {/* ── Approve: pick one slot ── */}
              {isActive && action === "approve" && (
                <div className="space-y-2 pt-1">
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin horarios disponibles.</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">Seleccioná el nuevo horario:</p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {availableSlots.map((slot) => {
                          const isSelected =
                            selectedSlot?.slotId === slot.slotId &&
                            selectedSlot?.date === slot.date
                          return (
                            <button
                              key={`${slot.slotId}|${slot.date}`}
                              onClick={() => setSelectedSlot(isSelected ? null : slot)}
                              className={cn(
                                "w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors",
                                isSelected
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <span className="font-medium capitalize">{slot.dayLabel}</span>
                              <span className="ml-2 text-muted-foreground">{slot.startTime} hs</span>
                            </button>
                          )
                        })}
                      </div>
                      <Button
                        size="sm"
                        disabled={!selectedSlot || pending}
                        onClick={() => {
                          if (!selectedSlot) return
                          startTransition(async () => {
                            await approveRescheduleRequest(
                              req.id,
                              selectedSlot.slotId,
                              selectedSlot.date
                            )
                            setActiveId(null)
                            setAction(null)
                            setSelectedSlot(null)
                          })
                        }}
                        className="w-full"
                      >
                        {pending ? "Guardando..." : "Confirmar cambio"}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* ── Offer alternatives: multi-select slots ── */}
              {isActive && action === "offer" && (
                <div className="space-y-2 pt-1">
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin horarios disponibles.</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Seleccioná uno o más horarios para ofrecer:
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {availableSlots.map((slot) => {
                          const key = `${slot.slotId}|${slot.date}`
                          const isSelected = selectedSlots.some(
                            (s) => `${s.slotId}|${s.date}` === key
                          )
                          return (
                            <button
                              key={key}
                              onClick={() => toggleOfferedSlot(slot)}
                              className={cn(
                                "w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors",
                                isSelected
                                  ? "bg-blue-50 border-blue-300 text-blue-800"
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <span className="font-medium capitalize">{slot.dayLabel}</span>
                              <span className="ml-2 text-muted-foreground">{slot.startTime} hs</span>
                            </button>
                          )
                        })}
                      </div>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Mensaje opcional..."
                        rows={2}
                        className="text-sm resize-none"
                      />
                      <Button
                        size="sm"
                        disabled={selectedSlots.length === 0 || pending}
                        onClick={() => {
                          startTransition(async () => {
                            await offerAlternativeSlots(req.id, selectedSlots, note)
                            setActiveId(null)
                            setAction(null)
                            setSelectedSlots([])
                            setNote("")
                          })
                        }}
                        className="w-full"
                      >
                        {pending
                          ? "Enviando..."
                          : `Ofrecer ${selectedSlots.length || ""} horario${selectedSlots.length !== 1 ? "s" : ""}`}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* ── Reject: optional note ── */}
              {isActive && action === "reject" && (
                <div className="space-y-2 pt-1">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Motivo (opcional)..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await rejectRescheduleRequest(req.id, note)
                        setActiveId(null)
                        setAction(null)
                        setNote("")
                      })
                    }}
                    className="w-full"
                  >
                    {pending ? "Rechazando..." : "Confirmar rechazo"}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
