import { db } from "@/lib/db"
import { rescheduleRequests, bookings, scheduleSlots, students, users } from "@/lib/db/schema"
import type { OfferedSlot } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export type RescheduleRequestForCoach = {
  id: string
  bookingId: string
  bookingDate: string
  bookingTime: string
  studentId: string
  studentName: string | null
  studentNote: string | null
  status: "pending" | "offered"
  createdAt: Date
}

export type StudentRescheduleRequestInfo = {
  id: string
  status: "pending" | "approved" | "rejected" | "offered"
  coachNote: string | null
  offeredSlots: OfferedSlot[] | null
}

export async function getPendingRequestsForCoach(
  coachId: string
): Promise<RescheduleRequestForCoach[]> {
  const rows = await db
    .select({
      id: rescheduleRequests.id,
      bookingId: rescheduleRequests.bookingId,
      bookingDate: bookings.date,
      bookingTime: scheduleSlots.startTime,
      studentId: rescheduleRequests.studentId,
      studentName: users.name,
      studentNote: rescheduleRequests.studentNote,
      status: rescheduleRequests.status,
      createdAt: rescheduleRequests.createdAt,
    })
    .from(rescheduleRequests)
    .innerJoin(bookings, eq(rescheduleRequests.bookingId, bookings.id))
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .innerJoin(students, eq(rescheduleRequests.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(
      and(
        eq(rescheduleRequests.coachId, coachId),
        inArray(rescheduleRequests.status, ["pending", "offered"])
      )
    )
    .orderBy(rescheduleRequests.createdAt)

  return rows as RescheduleRequestForCoach[]
}

export async function getStudentActiveRescheduleRequests(
  studentId: string
): Promise<Record<string, StudentRescheduleRequestInfo>> {
  const rows = await db
    .select({
      id: rescheduleRequests.id,
      bookingId: rescheduleRequests.bookingId,
      status: rescheduleRequests.status,
      coachNote: rescheduleRequests.coachNote,
      offeredSlots: rescheduleRequests.offeredSlots,
    })
    .from(rescheduleRequests)
    .where(
      and(
        eq(rescheduleRequests.studentId, studentId),
        inArray(rescheduleRequests.status, ["pending", "offered", "rejected"])
      )
    )

  const map: Record<string, StudentRescheduleRequestInfo> = {}
  for (const r of rows) {
    map[r.bookingId] = {
      id: r.id,
      status: r.status as "pending" | "approved" | "rejected" | "offered",
      coachNote: r.coachNote,
      offeredSlots: r.offeredSlots as OfferedSlot[] | null,
    }
  }
  return map
}
