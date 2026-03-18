import { db } from "@/lib/db"
import { students, bookings, scheduleSlots, slotAssignments, studentPlans, plans, routineAssignments, routines, routineBlocks, routineExercises, exercises } from "@/lib/db/schema"
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm"
import { format, addDays } from "date-fns"

export async function getStudentByUserId(userId: string) {
  const result = await db
    .select()
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1)
  return result[0] ?? null
}

export async function getStudentUpcomingBookings(studentId: string) {
  const today = format(new Date(), "yyyy-MM-dd")
  const in14days = format(addDays(new Date(), 14), "yyyy-MM-dd")

  return db
    .select({
      bookingId: bookings.id,
      date: bookings.date,
      status: bookings.status,
      startTime: scheduleSlots.startTime,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .where(
      and(
        eq(bookings.studentId, studentId),
        gte(bookings.date, today),
        lte(bookings.date, in14days)
      )
    )
    .orderBy(bookings.date, scheduleSlots.startTime)
}

export async function getStudentActiveRoutine(studentId: string) {
  const assignment = await db
    .select({ routineId: routineAssignments.routineId })
    .from(routineAssignments)
    .where(and(eq(routineAssignments.studentId, studentId), eq(routineAssignments.active, true)))
    .limit(1)

  if (!assignment[0]) return null

  const routineId = assignment[0].routineId
  const routine = await db.select().from(routines).where(eq(routines.id, routineId)).limit(1)
  if (!routine[0]) return null

  const blocks = await db.select().from(routineBlocks)
    .where(eq(routineBlocks.routineId, routineId))
    .orderBy(routineBlocks.order)

  let blockExercises: Array<{
    id: string; blockId: string; exerciseId: string; exerciseName: string | null; exerciseCategory: string
    sets: number | null; reps: string | null; technicalNotes: string | null; order: number
  }> = []

  if (blocks.length > 0) {
    blockExercises = await db
      .select({
        id: routineExercises.id,
        blockId: routineExercises.blockId,
        exerciseId: routineExercises.exerciseId,
        exerciseName: exercises.name,
        exerciseCategory: exercises.category,
        sets: routineExercises.sets,
        reps: routineExercises.reps,
        technicalNotes: routineExercises.technicalNotes,
        order: routineExercises.order,
      })
      .from(routineExercises)
      .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
      .where(inArray(routineExercises.blockId, blocks.map((b) => b.id)))
      .orderBy(routineExercises.order)
  }

  return {
    ...routine[0],
    blocks: blocks.map((b) => ({
      ...b,
      exercises: blockExercises.filter((e) => e.blockId === b.id),
    })),
  }
}

/** Returns the slots currently assigned to this student (their fixed weekly schedule). */
export async function getStudentAssignedSlots(studentId: string) {
  return db
    .select({
      id: scheduleSlots.id,
      dayOfWeek: scheduleSlots.dayOfWeek,
      startTime: scheduleSlots.startTime,
    })
    .from(slotAssignments)
    .innerJoin(scheduleSlots, eq(slotAssignments.slotId, scheduleSlots.id))
    .where(and(eq(slotAssignments.studentId, studentId), eq(scheduleSlots.active, true)))
    .orderBy(scheduleSlots.dayOfWeek, scheduleSlots.startTime)
}

/** Returns slots from the student's coach that have capacity and the student isn't already in. */
export async function getAvailableSlotsForStudent(studentId: string) {
  const student = await db
    .select({ coachId: students.coachId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (!student[0]?.coachId) return []
  const coachId = student[0].coachId

  const allSlots = await db
    .select({
      id: scheduleSlots.id,
      dayOfWeek: scheduleSlots.dayOfWeek,
      startTime: scheduleSlots.startTime,
      maxCapacity: scheduleSlots.maxCapacity,
    })
    .from(scheduleSlots)
    .where(and(eq(scheduleSlots.coachId, coachId), eq(scheduleSlots.active, true)))
    .orderBy(scheduleSlots.dayOfWeek, scheduleSlots.startTime)

  if (allSlots.length === 0) return []

  const counts = await db
    .select({ slotId: slotAssignments.slotId, count: sql<number>`count(*)` })
    .from(slotAssignments)
    .where(inArray(slotAssignments.slotId, allSlots.map((s) => s.id)))
    .groupBy(slotAssignments.slotId)

  const currentAssigned = await db
    .select({ slotId: slotAssignments.slotId })
    .from(slotAssignments)
    .where(eq(slotAssignments.studentId, studentId))

  const countMap = new Map(counts.map((c) => [c.slotId, Number(c.count)]))
  const assignedIds = new Set(currentAssigned.map((c) => c.slotId))

  return allSlots.filter((s) => !assignedIds.has(s.id) && (countMap.get(s.id) ?? 0) < s.maxCapacity)
}

export async function getStudentActivePlan(studentId: string) {
  const result = await db
    .select({
      planName: plans.name,
      daysPerWeek: plans.daysPerWeek,
      endDate: studentPlans.endDate,
    })
    .from(studentPlans)
    .innerJoin(plans, eq(studentPlans.planId, plans.id))
    .where(and(eq(studentPlans.studentId, studentId), eq(studentPlans.status, "active")))
    .limit(1)
  return result[0] ?? null
}
