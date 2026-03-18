"use server"

import { db } from "@/lib/db"
import { bookings, scheduleSlots, coaches, students, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { auth } from "@/lib/auth"
import { getCoachByUserId } from "@/lib/queries/coach"
import { revalidatePath } from "next/cache"
import { sendPushToUser } from "@/lib/push"
import { format, parseISO } from "date-fns"

export async function cancelBooking(bookingId: string) {
  const session = await auth()
  if (!session) throw new Error("No autorizado")

  // Fetch info before cancelling to notify coach
  const studentUsers = alias(users, "student_users")
  const [info] = await db
    .select({
      coachUserId: coaches.userId,
      studentName: studentUsers.name,
      date: bookings.date,
      startTime: scheduleSlots.startTime,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .innerJoin(coaches, eq(scheduleSlots.coachId, coaches.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(studentUsers, eq(students.userId, studentUsers.id))
    .where(eq(bookings.id, bookingId))
    .limit(1)

  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, bookingId))

  // Push al coach
  if (info) {
    const dateStr = format(parseISO(info.date + "T12:00:00"), "d/MM")
    await sendPushToUser(
      info.coachUserId,
      "Turno cancelado",
      `${info.studentName} canceló el turno del ${dateStr} a las ${info.startTime}`,
      "/coach/calendario"
    )
  }

  revalidatePath("/student")
  revalidatePath("/student/calendario")
  revalidatePath("/coach/calendario")
  revalidatePath("/admin/calendario")
}

export async function rescheduleBooking(formData: FormData) {
  const session = await auth()
  if (!session || (session.user.role !== "coach" && session.user.role !== "admin")) {
    throw new Error("No autorizado")
  }

  const bookingId = formData.get("bookingId") as string
  const newSlotId = formData.get("slotId") as string
  const newDate = formData.get("date") as string

  // Get old booking
  const old = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)
  if (!old[0]) throw new Error("Turno no encontrado")
  const { studentId } = old[0]

  // If coach, verify the new slot belongs to them
  if (session.user.role === "coach") {
    const coach = await getCoachByUserId(session.user.id)
    if (!coach) throw new Error("No autorizado")
    const slotCheck = await db
      .select({ coachId: scheduleSlots.coachId })
      .from(scheduleSlots)
      .where(eq(scheduleSlots.id, newSlotId))
      .limit(1)
    if (!slotCheck[0] || slotCheck[0].coachId !== coach.id) throw new Error("Turno no válido")
  }

  await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, bookingId))
  await db.insert(bookings).values({ studentId, slotId: newSlotId, date: newDate, status: "confirmed" })

  // Push al alumno
  const [studentInfo] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (studentInfo) {
    const dateStr = format(parseISO(newDate + "T12:00:00"), "d/MM")
    const [slot] = await db
      .select({ startTime: scheduleSlots.startTime })
      .from(scheduleSlots)
      .where(eq(scheduleSlots.id, newSlotId))
      .limit(1)
    await sendPushToUser(
      studentInfo.userId,
      "Turno reprogramado",
      `Tu turno fue movido al ${dateStr} a las ${slot?.startTime ?? ""}`,
      "/student/calendario"
    )
  }

  revalidatePath("/coach/calendario")
  revalidatePath("/student/calendario")
  revalidatePath("/admin/calendario")
}
