import { db } from "@/lib/db"
import { scheduleSlots, bookings } from "@/lib/db/schema"
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm"
import { addDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export type AvailableSlot = {
  slotId: string
  date: string
  startTime: string
  dayLabel: string // "lunes 20 de mar"
}

/**
 * Returns all (slot, date) combinations where the coach has availability
 * in the next `days` days (excluding today).
 */
export async function getAvailableSlotsForReschedule(
  coachId: string,
  days = 21
): Promise<AvailableSlot[]> {
  const slots = await db
    .select()
    .from(scheduleSlots)
    .where(and(eq(scheduleSlots.coachId, coachId), eq(scheduleSlots.active, true)))

  if (!slots.length) return []

  const today = new Date()
  const from = format(addDays(today, 1), "yyyy-MM-dd")
  const to = format(addDays(today, days), "yyyy-MM-dd")
  const slotIds = slots.map((s) => s.id)

  // Batch-count confirmed bookings per slot+date in range
  const counts = await db
    .select({
      slotId: bookings.slotId,
      date: bookings.date,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(bookings)
    .where(
      and(
        inArray(bookings.slotId, slotIds),
        gte(bookings.date, from),
        lte(bookings.date, to),
        eq(bookings.status, "confirmed")
      )
    )
    .groupBy(bookings.slotId, bookings.date)

  const countMap: Record<string, number> = {}
  for (const row of counts) countMap[`${row.slotId}|${row.date}`] = row.count

  const result: AvailableSlot[] = []
  for (let i = 1; i <= days; i++) {
    const date = addDays(today, i)
    const jsDay = date.getDay() // 0=Sun…6=Sat
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1 // schema: Mon=0, Sun=6
    const dateStr = format(date, "yyyy-MM-dd")

    for (const slot of slots) {
      if (slot.dayOfWeek === dayOfWeek) {
        const used = countMap[`${slot.id}|${dateStr}`] ?? 0
        if (used < slot.maxCapacity) {
          result.push({
            slotId: slot.id,
            date: dateStr,
            startTime: slot.startTime,
            dayLabel: format(date, "EEEE d 'de' MMM", { locale: es }),
          })
        }
      }
    }
  }
  return result
}
