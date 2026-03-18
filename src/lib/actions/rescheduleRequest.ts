"use server"

import { db } from "@/lib/db"
import {
  rescheduleRequests,
  bookings,
  scheduleSlots,
  students,
  coaches,
  users,
} from "@/lib/db/schema"
import type { OfferedSlot } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { sendPushToUser } from "@/lib/push"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

async function getStudentOrThrow() {
  const session = await auth()
  if (!session || session.user.role !== "student") throw new Error("No autorizado")
  const [student] = await db
    .select({ id: students.id, userId: students.userId })
    .from(students)
    .where(eq(students.userId, session.user.id))
    .limit(1)
  if (!student) throw new Error("No autorizado")
  return student
}

async function getCoachOrThrow() {
  const session = await auth()
  if (!session || session.user.role !== "coach") throw new Error("No autorizado")
  const [coach] = await db
    .select({ id: coaches.id, userId: coaches.userId })
    .from(coaches)
    .where(eq(coaches.userId, session.user.id))
    .limit(1)
  if (!coach) throw new Error("No autorizado")
  return coach
}

// Student submits a reschedule request
export async function requestReschedule(bookingId: string, note: string) {
  const student = await getStudentOrThrow()

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.studentId, student.id),
        eq(bookings.status, "confirmed")
      )
    )
    .limit(1)
  if (!booking) throw new Error("Turno no encontrado")

  const [slotInfo] = await db
    .select({ coachId: scheduleSlots.coachId, startTime: scheduleSlots.startTime })
    .from(scheduleSlots)
    .where(eq(scheduleSlots.id, booking.slotId))
    .limit(1)
  if (!slotInfo) throw new Error("Turno no encontrado")

  // Block if a pending/offered request already exists
  const [existing] = await db
    .select({ id: rescheduleRequests.id })
    .from(rescheduleRequests)
    .where(
      and(
        eq(rescheduleRequests.bookingId, bookingId),
        inArray(rescheduleRequests.status, ["pending", "offered"])
      )
    )
    .limit(1)
  if (existing) throw new Error("Ya existe una solicitud para este turno")

  await db.insert(rescheduleRequests).values({
    bookingId,
    studentId: student.id,
    coachId: slotInfo.coachId,
    studentNote: note?.trim() || null,
  })

  // Push al coach
  const [coachInfo] = await db
    .select({ userId: coaches.userId })
    .from(coaches)
    .where(eq(coaches.id, slotInfo.coachId))
    .limit(1)
  const [studentUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, student.userId))
    .limit(1)

  if (coachInfo) {
    const dateStr = format(parseISO(booking.date + "T12:00:00"), "d 'de' MMM", { locale: es })
    await sendPushToUser(
      coachInfo.userId,
      "Solicitud de cambio de horario",
      `${studentUser?.name ?? "Un alumno"} quiere cambiar el turno del ${dateStr} a las ${slotInfo.startTime}`,
      "/coach/calendario"
    )
  }

  revalidatePath("/student/calendario")
  revalidatePath("/coach/calendario")
}

// Student cancels their own pending request
export async function cancelRescheduleRequest(requestId: string) {
  const student = await getStudentOrThrow()

  await db
    .delete(rescheduleRequests)
    .where(
      and(
        eq(rescheduleRequests.id, requestId),
        eq(rescheduleRequests.studentId, student.id),
        inArray(rescheduleRequests.status, ["pending", "offered", "rejected"])
      )
    )

  revalidatePath("/student/calendario")
  revalidatePath("/coach/calendario")
}

// Coach approves: picks a new slot+date directly
export async function approveRescheduleRequest(
  requestId: string,
  newSlotId: string,
  newDate: string
) {
  const coach = await getCoachOrThrow()

  const [req] = await db
    .select()
    .from(rescheduleRequests)
    .where(
      and(
        eq(rescheduleRequests.id, requestId),
        eq(rescheduleRequests.coachId, coach.id),
        inArray(rescheduleRequests.status, ["pending", "offered"])
      )
    )
    .limit(1)
  if (!req) throw new Error("Solicitud no encontrada")

  await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, req.bookingId))
  await db.insert(bookings).values({
    studentId: req.studentId,
    slotId: newSlotId,
    date: newDate,
    status: "confirmed",
  })
  await db
    .update(rescheduleRequests)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(rescheduleRequests.id, requestId))

  // Push al alumno
  const [studentInfo] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, req.studentId))
    .limit(1)
  const [slot] = await db
    .select({ startTime: scheduleSlots.startTime })
    .from(scheduleSlots)
    .where(eq(scheduleSlots.id, newSlotId))
    .limit(1)

  if (studentInfo) {
    const dateStr = format(parseISO(newDate + "T12:00:00"), "d/MM")
    await sendPushToUser(
      studentInfo.userId,
      "Turno reprogramado",
      `Tu solicitud fue aprobada. Nuevo turno: ${dateStr} a las ${slot?.startTime ?? ""}`,
      "/student/calendario"
    )
  }

  revalidatePath("/student/calendario")
  revalidatePath("/coach/calendario")
}

// Coach rejects the request (optional note)
export async function rejectRescheduleRequest(requestId: string, coachNote: string) {
  const coach = await getCoachOrThrow()

  const [req] = await db
    .select()
    .from(rescheduleRequests)
    .where(
      and(
        eq(rescheduleRequests.id, requestId),
        eq(rescheduleRequests.coachId, coach.id),
        inArray(rescheduleRequests.status, ["pending", "offered"])
      )
    )
    .limit(1)
  if (!req) throw new Error("Solicitud no encontrada")

  await db
    .update(rescheduleRequests)
    .set({ status: "rejected", coachNote: coachNote?.trim() || null, updatedAt: new Date() })
    .where(eq(rescheduleRequests.id, requestId))

  const [studentInfo] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, req.studentId))
    .limit(1)

  if (studentInfo) {
    await sendPushToUser(
      studentInfo.userId,
      "Solicitud rechazada",
      coachNote?.trim() || "Tu solicitud de cambio de horario no pudo ser aprobada",
      "/student/calendario"
    )
  }

  revalidatePath("/student/calendario")
  revalidatePath("/coach/calendario")
}

// Coach offers alternative slots for the student to pick from
export async function offerAlternativeSlots(
  requestId: string,
  slots: OfferedSlot[],
  coachNote: string
) {
  const coach = await getCoachOrThrow()

  const [req] = await db
    .select()
    .from(rescheduleRequests)
    .where(
      and(
        eq(rescheduleRequests.id, requestId),
        eq(rescheduleRequests.coachId, coach.id),
        inArray(rescheduleRequests.status, ["pending", "offered"])
      )
    )
    .limit(1)
  if (!req) throw new Error("Solicitud no encontrada")

  await db
    .update(rescheduleRequests)
    .set({
      status: "offered",
      offeredSlots: slots,
      coachNote: coachNote?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(rescheduleRequests.id, requestId))

  const [studentInfo] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, req.studentId))
    .limit(1)

  if (studentInfo) {
    await sendPushToUser(
      studentInfo.userId,
      "Horarios alternativos disponibles",
      `Tu coach te ofrece ${slots.length} horario${slots.length !== 1 ? "s" : ""} alternativo${slots.length !== 1 ? "s" : ""}. Elegí uno desde tu calendario.`,
      "/student/calendario"
    )
  }

  revalidatePath("/student/calendario")
  revalidatePath("/coach/calendario")
}

// Student accepts one of the coach's offered slots
export async function acceptOfferedSlot(requestId: string, slotId: string, date: string) {
  const student = await getStudentOrThrow()

  const [req] = await db
    .select()
    .from(rescheduleRequests)
    .where(
      and(
        eq(rescheduleRequests.id, requestId),
        eq(rescheduleRequests.studentId, student.id),
        eq(rescheduleRequests.status, "offered")
      )
    )
    .limit(1)
  if (!req) throw new Error("Solicitud no encontrada")

  await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, req.bookingId))
  await db.insert(bookings).values({
    studentId: req.studentId,
    slotId,
    date,
    status: "confirmed",
  })
  await db
    .update(rescheduleRequests)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(rescheduleRequests.id, requestId))

  revalidatePath("/student/calendario")
  revalidatePath("/coach/calendario")
}
