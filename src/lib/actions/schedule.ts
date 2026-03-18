"use server"

import { db } from "@/lib/db"
import { scheduleSlots, slotAssignments, bookings, students } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { getCoachByUserId } from "@/lib/queries/coach"
import { revalidatePath } from "next/cache"
import { addDays, format, parseISO } from "date-fns"

async function getCoachFromSession() {
  const session = await auth()
  if (!session) throw new Error("No autorizado")
  const coach = await getCoachByUserId(session.user.id)
  if (!coach) throw new Error("No autorizado")
  return coach
}

export async function createSlot(formData: FormData) {
  const coach = await getCoachFromSession()

  const dayOfWeek = parseInt(formData.get("dayOfWeek") as string)
  const startTime = formData.get("startTime") as string
  const maxCapacity = parseInt(formData.get("maxCapacity") as string) || 1

  await db.insert(scheduleSlots).values({
    coachId: coach.id,
    dayOfWeek,
    startTime,
    maxCapacity,
    active: true,
  })

  revalidatePath("/coach/perfil")
}

export async function deleteSlot(slotId: string) {
  const coach = await getCoachFromSession()

  const slot = await db
    .select({ id: scheduleSlots.id })
    .from(scheduleSlots)
    .where(and(eq(scheduleSlots.id, slotId), eq(scheduleSlots.coachId, coach.id)))
    .limit(1)

  if (slot.length === 0) throw new Error("No autorizado")

  await db.update(scheduleSlots).set({ active: false }).where(eq(scheduleSlots.id, slotId))

  revalidatePath("/coach/perfil")
}

export async function createBooking(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("No autorizado")

  const studentId = formData.get("studentId") as string
  const slotId = formData.get("slotId") as string
  const date = formData.get("date") as string

  if (session.user.role !== "admin") {
    const coach = await getCoachByUserId(session.user.id)
    if (!coach) throw new Error("No autorizado")
    const slot = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(and(eq(scheduleSlots.id, slotId), eq(scheduleSlots.coachId, coach.id)))
      .limit(1)
    if (slot.length === 0) throw new Error("Turno no válido")
  }

  const existing = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(
      eq(bookings.studentId, studentId),
      eq(bookings.slotId, slotId),
      eq(bookings.date, date),
      eq(bookings.status, "confirmed")
    ))
    .limit(1)

  if (existing.length > 0) throw new Error("Ya existe un turno para esa fecha y horario")

  await db.insert(bookings).values({ studentId, slotId, date, status: "confirmed" })

  revalidatePath("/coach")
  revalidatePath(`/coach/alumnos/${studentId}`)
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath("/coach/calendario")
}

/**
 * Creates recurring weekly bookings for a student on a given slot.
 */
export async function createBookingsBulk(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("No autorizado")

  const studentId = formData.get("studentId") as string
  const slotId = formData.get("slotId") as string
  const startDate = formData.get("startDate") as string
  const weeks = Math.min(parseInt(formData.get("weeks") as string) || 4, 16)

  if (session.user.role !== "admin") {
    const coach = await getCoachByUserId(session.user.id)
    if (!coach) throw new Error("No autorizado")
    const slot = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(and(eq(scheduleSlots.id, slotId), eq(scheduleSlots.coachId, coach.id)))
      .limit(1)
    if (slot.length === 0) throw new Error("Turno no válido")
  } else {
    const slot = await db
      .select({ id: scheduleSlots.id })
      .from(scheduleSlots)
      .where(eq(scheduleSlots.id, slotId))
      .limit(1)
    if (slot.length === 0) throw new Error("Turno no válido")
  }

  // Generate N weekly dates starting from startDate
  const start = parseISO(startDate + "T00:00:00")
  const dates = Array.from({ length: weeks }, (_, i) =>
    format(addDays(start, i * 7), "yyyy-MM-dd")
  )

  // Skip dates that already have a confirmed booking on this slot
  const existing = await db
    .select({ date: bookings.date })
    .from(bookings)
    .where(
      and(
        eq(bookings.studentId, studentId),
        eq(bookings.slotId, slotId),
        inArray(bookings.date, dates),
        eq(bookings.status, "confirmed")
      )
    )

  const existingDates = new Set(existing.map((e) => e.date))
  const toCreate = dates.filter((d) => !existingDates.has(d))

  if (toCreate.length > 0) {
    await db.insert(bookings).values(
      toCreate.map((date) => ({ studentId, slotId, date, status: "confirmed" as const }))
    )
  }

  revalidatePath("/coach")
  revalidatePath(`/coach/alumnos/${studentId}`)
  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath("/coach/calendario")
  revalidatePath("/student/calendario")
}

/**
 * Reschedules an existing booking to a new date.
 * Allowed for admin or the booking's coach.
 */
export async function rescheduleBooking(bookingId: string, newDate: string) {
  const session = await auth()
  if (!session) throw new Error("No autorizado")

  if (session.user.role !== "admin") {
    const coach = await getCoachByUserId(session.user.id)
    if (!coach) throw new Error("No autorizado")
    // Verify the booking belongs to a slot owned by this coach
    const row = await db
      .select({ coachId: scheduleSlots.coachId })
      .from(bookings)
      .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
      .where(eq(bookings.id, bookingId))
      .limit(1)
    if (row[0]?.coachId !== coach.id) throw new Error("No autorizado")
  }

  await db.update(bookings).set({ date: newDate }).where(eq(bookings.id, bookingId))

  const booking = await db.select({ studentId: bookings.studentId }).from(bookings).where(eq(bookings.id, bookingId)).limit(1)
  const studentId = booking[0]?.studentId

  revalidatePath("/coach/calendario")
  if (studentId) {
    revalidatePath(`/coach/alumnos/${studentId}`)
    revalidatePath(`/admin/alumnos/${studentId}`)
  }
}

/**
 * Creates hourly slots from fromTime (inclusive) to toTime (exclusive) for a given day.
 * e.g. day=0 (Mon), from=07:00, to=17:00 → creates Mon 07:00, 08:00, ..., 16:00
 */
export async function createSlotBlock(formData: FormData) {
  const coach = await getCoachFromSession()
  const dayOfWeek = parseInt(formData.get("dayOfWeek") as string)
  const fromTime = formData.get("fromTime") as string // "07:00"
  const toTime = formData.get("toTime") as string     // "17:00"

  const [fromH] = fromTime.split(":").map(Number)
  const [toH] = toTime.split(":").map(Number)
  if (fromH >= toH || toH > 24 || fromH < 0) throw new Error("Rango horario inválido")

  // Get existing active slots for this day to avoid duplicates
  const existing = await db
    .select({ startTime: scheduleSlots.startTime })
    .from(scheduleSlots)
    .where(and(
      eq(scheduleSlots.coachId, coach.id),
      eq(scheduleSlots.dayOfWeek, dayOfWeek),
      eq(scheduleSlots.active, true),
    ))
  const existingTimes = new Set(existing.map(e => e.startTime))

  const toCreate = []
  for (let h = fromH; h < toH; h++) {
    const time = `${String(h).padStart(2, "0")}:00`
    if (!existingTimes.has(time)) {
      toCreate.push({ coachId: coach.id, dayOfWeek, startTime: time, maxCapacity: 1, active: true })
    }
  }

  if (toCreate.length > 0) {
    await db.insert(scheduleSlots).values(toCreate)
  }

  revalidatePath("/coach/perfil")
  revalidatePath("/coach/calendario")
}

async function generateWeeklyBookings(slotId: string, studentId: string, dayOfWeek: number) {
  const targetJsDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1
  const today = new Date()
  let daysUntil = targetJsDay - today.getDay()
  if (daysUntil <= 0) daysUntil += 7

  const dates = Array.from({ length: 8 }, (_, i) =>
    format(addDays(today, daysUntil + i * 7), "yyyy-MM-dd")
  )

  const existing = await db
    .select({ date: bookings.date })
    .from(bookings)
    .where(and(
      eq(bookings.studentId, studentId),
      eq(bookings.slotId, slotId),
      inArray(bookings.date, dates),
      eq(bookings.status, "confirmed")
    ))

  const existingDates = new Set(existing.map((b) => b.date))
  const toCreate = dates.filter((d) => !existingDates.has(d))

  if (toCreate.length > 0) {
    await db.insert(bookings).values(
      toCreate.map((date) => ({ studentId, slotId, date, status: "confirmed" as const }))
    )
  }
}

/**
 * Assigns a student to a slot and generates their bookings for the next 8 weeks.
 */
export async function assignStudentToSlot(slotId: string, studentId: string) {
  const coach = await getCoachFromSession()

  const slot = await db
    .select()
    .from(scheduleSlots)
    .where(and(eq(scheduleSlots.id, slotId), eq(scheduleSlots.coachId, coach.id)))
    .limit(1)
  if (!slot[0]) throw new Error("Turno no válido")

  await db.insert(slotAssignments).values({ slotId, studentId }).onConflictDoNothing()

  await generateWeeklyBookings(slotId, studentId, slot[0].dayOfWeek)

  revalidatePath("/coach/calendario")
  revalidatePath("/student/calendario")
  revalidatePath("/student")
}

/**
 * Removes a student from a slot. Existing bookings are NOT cancelled.
 */
export async function unassignStudentFromSlot(slotId: string, studentId: string) {
  await getCoachFromSession()
  await db.delete(slotAssignments).where(
    and(eq(slotAssignments.slotId, slotId), eq(slotAssignments.studentId, studentId))
  )
  revalidatePath("/coach/calendario")
}

/**
 * Sets the complete weekly slot schedule for a student (coach/admin only).
 * Replaces all existing assignments and generates bookings for each new slot.
 */
export async function setStudentSlots(studentId: string, slotIds: string[]) {
  const session = await auth()
  if (!session || !["coach", "admin"].includes(session.user.role))
    throw new Error("No autorizado")

  if (session.user.role === "coach") {
    const coach = await getCoachByUserId(session.user.id)
    if (!coach) throw new Error("No autorizado")
    const s = await db
      .select({ coachId: students.coachId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1)
    if (s[0]?.coachId !== coach.id) throw new Error("No autorizado")
  }

  await db.delete(slotAssignments).where(eq(slotAssignments.studentId, studentId))

  if (slotIds.length > 0) {
    await db.insert(slotAssignments).values(slotIds.map((slotId) => ({ slotId, studentId })))
    for (const slotId of slotIds) {
      const slot = await db.select().from(scheduleSlots).where(eq(scheduleSlots.id, slotId)).limit(1)
      if (slot[0]) await generateWeeklyBookings(slotId, studentId, slot[0].dayOfWeek)
    }
  }

  revalidatePath("/coach/calendario")
  revalidatePath("/student/calendario")
  revalidatePath(`/coach/alumnos/${studentId}`)
}

/**
 * Saves the coach's full weekly schedule config.
 * For each day 0-6:
 *   - active_{day} = "1" or missing/0
 *   - from_{day} = "08:00" (start time)
 *   - to_{day}   = "18:00" (end time, exclusive: last slot = to-1h)
 * capacity = max students per slot (applied to all slots)
 *
 * Logic per day:
 *   - inactive: soft-delete all active slots for that day
 *   - active: deactivate slots outside range, reactivate/create slots inside range, update capacity
 */
export async function saveCoachSchedule(formData: FormData) {
  const coach = await getCoachFromSession()
  const capacity = Math.max(1, parseInt(formData.get("capacity") as string) || 1)

  for (let day = 0; day < 7; day++) {
    const active = formData.get(`active_${day}`) === "1"

    const existingSlots = await db
      .select()
      .from(scheduleSlots)
      .where(and(eq(scheduleSlots.coachId, coach.id), eq(scheduleSlots.dayOfWeek, day)))

    if (!active) {
      // Deactivate all slots for this day
      for (const slot of existingSlots) {
        if (slot.active) {
          await db.update(scheduleSlots).set({ active: false }).where(eq(scheduleSlots.id, slot.id))
        }
      }
      continue
    }

    const fromTime = (formData.get(`from_${day}`) as string) || "08:00"
    const toTime = (formData.get(`to_${day}`) as string) || "18:00"
    const [fromH] = fromTime.split(":").map(Number)
    const [toH] = toTime.split(":").map(Number)
    if (fromH >= toH || toH > 24 || fromH < 0) continue

    const newTimes = new Set(
      Array.from({ length: toH - fromH }, (_, i) => `${String(fromH + i).padStart(2, "0")}:00`)
    )
    const existingMap = new Map(existingSlots.map((s) => [s.startTime, s]))

    // Deactivate slots outside range
    for (const slot of existingSlots) {
      if (slot.active && !newTimes.has(slot.startTime)) {
        await db.update(scheduleSlots).set({ active: false }).where(eq(scheduleSlots.id, slot.id))
      }
    }

    // Create or reactivate slots inside range
    for (const time of newTimes) {
      const existing = existingMap.get(time)
      if (!existing) {
        await db.insert(scheduleSlots).values({
          coachId: coach.id,
          dayOfWeek: day,
          startTime: time,
          maxCapacity: capacity,
          active: true,
        })
      } else if (!existing.active) {
        await db
          .update(scheduleSlots)
          .set({ active: true, maxCapacity: capacity })
          .where(eq(scheduleSlots.id, existing.id))
      } else {
        await db
          .update(scheduleSlots)
          .set({ maxCapacity: capacity })
          .where(eq(scheduleSlots.id, existing.id))
      }
    }
  }

  revalidatePath("/coach/perfil")
  revalidatePath("/coach/calendario")
}

/**
 * Called by the student to confirm their weekly schedule.
 * Unassigns any existing slots, assigns the selected ones, and generates 8 weeks of bookings.
 */
export async function confirmStudentSchedule(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "student") throw new Error("No autorizado")

  const studentResult = await db
    .select({ id: students.id, coachId: students.coachId })
    .from(students)
    .where(eq(students.userId, session.user.id))
    .limit(1)
  if (!studentResult[0]) throw new Error("Alumno no encontrado")

  const { id: studentId, coachId } = studentResult[0]
  if (!coachId) throw new Error("No tenés un coach asignado")

  const slotIds = formData.getAll("slotId") as string[]
  if (slotIds.length === 0) throw new Error("Seleccioná al menos un turno")

  // Verify all selected slots belong to the student's coach and are active
  const validSlots = await db
    .select()
    .from(scheduleSlots)
    .where(
      and(
        inArray(scheduleSlots.id, slotIds),
        eq(scheduleSlots.coachId, coachId),
        eq(scheduleSlots.active, true),
      )
    )
  if (validSlots.length !== slotIds.length) throw new Error("Algunos turnos no son válidos")

  // Replace all slot assignments for this student
  await db.delete(slotAssignments).where(eq(slotAssignments.studentId, studentId))
  await db.insert(slotAssignments).values(slotIds.map((slotId) => ({ slotId, studentId })))

  // Generate bookings for each slot
  for (const slot of validSlots) {
    await generateWeeklyBookings(slot.id, studentId, slot.dayOfWeek)
  }

  revalidatePath("/student")
  revalidatePath("/student/calendario")
  revalidatePath("/student/elegir-horario")
  revalidatePath("/coach/calendario")
}
