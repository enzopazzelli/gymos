import { db } from "@/lib/db"
import { bookings, scheduleSlots, students, coaches, users, studentPlans } from "@/lib/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { addDays, format, parseISO } from "date-fns"

export type CalendarEvent = {
  bookingId: string
  date: string
  startTime: string
  status: string
  studentId: string
  studentName: string | null
  studentWhatsApp: string | null
  coachName: string | null
  coachWhatsApp: string | null
  planEnd: string | null
}

function weekEnd(weekStart: string): string {
  return format(addDays(parseISO(weekStart + "T00:00:00"), 6), "yyyy-MM-dd")
}

export async function getAdminCalendarWeek(weekStart: string): Promise<CalendarEvent[]> {
  const end = weekEnd(weekStart)
  const studentUsers = alias(users, "student_users")
  const coachUsers = alias(users, "coach_users")

  const rows = await db
    .select({
      bookingId: bookings.id,
      date: bookings.date,
      startTime: scheduleSlots.startTime,
      status: bookings.status,
      studentId: students.id,
      studentName: studentUsers.name,
      studentWhatsApp: students.whatsappNumber,
      coachName: coachUsers.name,
      coachWhatsApp: coaches.whatsappNumber,
      planEnd: studentPlans.endDate,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(studentUsers, eq(students.userId, studentUsers.id))
    .innerJoin(coaches, eq(scheduleSlots.coachId, coaches.id))
    .innerJoin(coachUsers, eq(coaches.userId, coachUsers.id))
    .leftJoin(
      studentPlans,
      and(eq(studentPlans.studentId, students.id), eq(studentPlans.status, "active"))
    )
    .where(and(gte(bookings.date, weekStart), lte(bookings.date, end)))
    .orderBy(bookings.date, scheduleSlots.startTime)

  return rows
}

export async function getCoachCalendarWeek(
  coachId: string,
  weekStart: string
): Promise<CalendarEvent[]> {
  const end = weekEnd(weekStart)

  const rows = await db
    .select({
      bookingId: bookings.id,
      date: bookings.date,
      startTime: scheduleSlots.startTime,
      status: bookings.status,
      studentId: students.id,
      studentName: users.name,
      studentWhatsApp: students.whatsappNumber,
      planEnd: studentPlans.endDate,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(
      studentPlans,
      and(eq(studentPlans.studentId, students.id), eq(studentPlans.status, "active"))
    )
    .where(
      and(
        eq(scheduleSlots.coachId, coachId),
        gte(bookings.date, weekStart),
        lte(bookings.date, end)
      )
    )
    .orderBy(bookings.date, scheduleSlots.startTime)

  return rows.map((r) => ({ ...r, coachName: null, coachWhatsApp: null }))
}

export async function getStudentCalendarWeek(
  studentId: string,
  weekStart: string
): Promise<CalendarEvent[]> {
  const end = weekEnd(weekStart)
  const coachUsers = alias(users, "coach_users")

  const rows = await db
    .select({
      bookingId: bookings.id,
      date: bookings.date,
      startTime: scheduleSlots.startTime,
      status: bookings.status,
      studentId: bookings.studentId,
      coachName: coachUsers.name,
      coachWhatsApp: coaches.whatsappNumber,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .innerJoin(coaches, eq(scheduleSlots.coachId, coaches.id))
    .innerJoin(coachUsers, eq(coaches.userId, coachUsers.id))
    .where(
      and(
        eq(bookings.studentId, studentId),
        gte(bookings.date, weekStart),
        lte(bookings.date, end)
      )
    )
    .orderBy(bookings.date, scheduleSlots.startTime)

  return rows.map((r) => ({ ...r, studentName: null, studentWhatsApp: null, planEnd: null }))
}
