"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, addDays, parseISO, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { CalendarEvent } from "@/lib/queries/calendar"
import type { AvailableSlot } from "@/lib/queries/schedule"
import { RescheduleBookingDialog } from "@/components/coach/RescheduleBookingDialog"
import { CancelBookingDialog } from "@/components/student/CancelBookingDialog"
import { RescheduleRequestButton } from "@/components/student/RescheduleRequestButton"
import type { StudentRescheduleRequestInfo } from "@/lib/queries/rescheduleRequest"

export type { AvailableSlot }

const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"]

interface Props {
  weekStart: string
  events: CalendarEvent[]
  role: "admin" | "coach" | "student"
  basePath: string
  studentLinkBase?: string
  availableSlots?: AvailableSlot[] // coach/admin: for rescheduling
  rescheduleRequests?: Record<string, StudentRescheduleRequestInfo> // student: request state per bookingId
}

export function CalendarWeek({
  weekStart,
  events,
  role,
  basePath,
  studentLinkBase,
  availableSlots = [],
  rescheduleRequests = {},
}: Props) {
  const router = useRouter()
  const today = format(new Date(), "yyyy-MM-dd")

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStart + "T00:00:00"), i), "yyyy-MM-dd")
  )

  const defaultDay = weekDays.includes(today) ? today : weekDays[0]
  const [selectedDay, setSelectedDay] = useState(defaultDay)

  const byDay: Record<string, CalendarEvent[]> = {}
  for (const d of weekDays) byDay[d] = []
  for (const ev of events) {
    if (byDay[ev.date]) byDay[ev.date].push(ev)
  }

  const selectedEvents = byDay[selectedDay] ?? []

  function navigateWeek(delta: number) {
    const newMonday = format(
      addDays(parseISO(weekStart + "T00:00:00"), delta * 7),
      "yyyy-MM-dd"
    )
    router.push(`${basePath}?w=${newMonday}`)
  }

  const startLabel = format(parseISO(weekStart + "T00:00:00"), "d", { locale: es })
  const endDate = parseISO(weekDays[6] + "T00:00:00")
  const endLabel = format(endDate, "d MMM", { locale: es })
  const yearLabel = format(endDate, "yyyy")
  const totalEvents = events.filter((e) => e.status !== "cancelled").length

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold capitalize">
            {startLabel} – {endLabel} {yearLabel}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {totalEvents} {totalEvents === 1 ? "turno" : "turnos"}
          </span>
        </div>

        <button
          onClick={() => navigateWeek(1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day strip */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, i) => {
          const isSelected = date === selectedDay
          const isToday = date === today
          const count = byDay[date]?.filter((e) => e.status !== "cancelled").length ?? 0

          return (
            <button
              key={date}
              onClick={() => setSelectedDay(date)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase",
                  isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {DAY_SHORT[i]}
              </span>
              <span
                className={cn(
                  "text-sm font-bold",
                  isToday && !isSelected && "text-primary"
                )}
              >
                {parseInt(date.slice(8))}
              </span>
              {count > 0 ? (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              ) : (
                <span className="h-1.5 w-1.5" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">
          {format(parseISO(selectedDay + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })}
          {selectedDay === today && (
            <span className="ml-2 text-primary normal-case font-semibold">· Hoy</span>
          )}
        </h3>

        {selectedEvents.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Sin turnos este día.
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border">
            {selectedEvents.map((ev) => (
              <EventRow
                key={ev.bookingId}
                event={ev}
                role={role}
                studentLinkBase={studentLinkBase}
                availableSlots={availableSlots}
                rescheduleRequest={rescheduleRequests[ev.bookingId]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventRow({
  event,
  role,
  studentLinkBase,
  availableSlots,
  rescheduleRequest,
}: {
  event: CalendarEvent
  role: "admin" | "coach" | "student"
  studentLinkBase?: string
  availableSlots: AvailableSlot[]
  rescheduleRequest?: StudentRescheduleRequestInfo
}) {
  const today = new Date()
  const isFuture = new Date(event.date + "T23:59:00") > today

  const daysLeft = event.planEnd
    ? differenceInDays(parseISO(event.planEnd + "T00:00:00"), today)
    : null

  const planBadge =
    role !== "student"
      ? event.planEnd === null
        ? { label: "Sin plan", cls: "bg-red-100 text-red-700" }
        : daysLeft !== null && daysLeft < 0
        ? { label: "Vencido", cls: "bg-red-100 text-red-700" }
        : daysLeft !== null && daysLeft <= 5
        ? { label: `${daysLeft}d`, cls: "bg-yellow-100 text-yellow-700" }
        : null
      : null

  const statusBadge =
    event.status === "confirmed"
      ? { label: "✓", cls: "bg-emerald-100 text-emerald-700" }
      : event.status === "cancelled"
      ? { label: "✗", cls: "bg-red-100 text-red-700" }
      : { label: "↩", cls: "bg-amber-100 text-amber-700" }

  const canReschedule =
    (role === "coach" || role === "admin") &&
    event.status === "confirmed" &&
    isFuture

  const canCancel =
    role === "student" &&
    event.status === "confirmed" &&
    isFuture

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-xs font-bold tabular-nums text-muted-foreground w-10 shrink-0">
        {event.startTime}
      </span>

      <div className="flex-1 min-w-0">
        {role !== "student" ? (
          <>
            <p className="text-sm font-medium truncate">{event.studentName ?? "—"}</p>
            {role === "admin" && event.coachName && (
              <p className="text-[11px] text-muted-foreground truncate">{event.coachName}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Turno reservado</p>
            {event.coachName && (
              <p className="text-[11px] text-muted-foreground">{event.coachName}</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {planBadge && (
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              planBadge.cls
            )}
          >
            {planBadge.label}
          </span>
        )}

        {canReschedule && (
          <RescheduleBookingDialog
            bookingId={event.bookingId}
            currentDate={event.date}
            currentTime={event.startTime}
            studentName={event.studentName ?? ""}
            studentWhatsApp={event.studentWhatsApp}
            availableSlots={availableSlots}
          />
        )}

        {canCancel && (
          <>
            <RescheduleRequestButton
              bookingId={event.bookingId}
              date={event.date}
              startTime={event.startTime}
              request={rescheduleRequest}
            />
            <CancelBookingDialog
              bookingId={event.bookingId}
              date={event.date}
              startTime={event.startTime}
              coachName={event.coachName}
              coachWhatsApp={event.coachWhatsApp}
            />
          </>
        )}

        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
            statusBadge.cls
          )}
        >
          {statusBadge.label}
        </span>
      </div>
    </div>
  )

  if (studentLinkBase && event.studentId && role !== "student") {
    return (
      <Link
        href={`${studentLinkBase}${event.studentId}`}
        className="block hover:bg-muted/30 transition-colors"
      >
        {inner}
      </Link>
    )
  }

  return <div>{inner}</div>
}
