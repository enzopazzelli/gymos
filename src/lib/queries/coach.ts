import { db } from "@/lib/db"
import { coaches, students, studentPlans, plans, payments, bookings, scheduleSlots, slotAssignments, users, attendance, routines, routineBlocks, routineExercises, routineAssignments, exercises, trainingSessions } from "@/lib/db/schema"
import { eq, and, gte, lte, desc, sql, or, inArray, isNotNull } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { format, addDays } from "date-fns"

/** Obtiene el perfil del coach a partir del userId de la sesión */
export async function getCoachByUserId(userId: string) {
  const result = await db
    .select()
    .from(coaches)
    .where(eq(coaches.userId, userId))
    .limit(1)
  return result[0] ?? null
}

/** Lista de alumnos del coach con su plan activo y último pago */
export async function getCoachStudents(coachId: string) {
  const rows = await db
    .select({
      id: students.id,
      name: users.name,
      email: users.email,
      image: users.image,
      sport: students.sport,
      objectives: students.objectives,
      plan: plans.name,
      daysPerWeek: plans.daysPerWeek,
      planStatus: studentPlans.status,
      planEnd: studentPlans.endDate,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(
      studentPlans,
      and(eq(studentPlans.studentId, students.id), eq(studentPlans.status, "active"))
    )
    .leftJoin(plans, eq(studentPlans.planId, plans.id))
    .where(eq(students.coachId, coachId))
    .orderBy(users.name)

  return rows
}

/** Turnos del día con estado de asistencia */
export async function getTodayBookings(coachId: string) {
  const today = format(new Date(), "yyyy-MM-dd")

  const rows = await db
    .select({
      bookingId: bookings.id,
      studentId: students.id,
      studentName: users.name,
      studentImage: users.image,
      startTime: scheduleSlots.startTime,
      status: bookings.status,
      present: attendance.present,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(attendance, eq(attendance.bookingId, bookings.id))
    .where(
      and(
        eq(scheduleSlots.coachId, coachId),
        eq(bookings.date, today),
        eq(bookings.status, "confirmed")
      )
    )
    .orderBy(scheduleSlots.startTime)

  return rows
}

/** Último pago de cada alumno para calcular el semáforo */
export async function getStudentsPaymentStatus(coachId: string) {
  const today = new Date()
  const in5days = new Date(today)
  in5days.setDate(in5days.getDate() + 5)

  const rows = await db
    .select({
      studentId: students.id,
      lastPayment: sql<string>`MAX(${payments.paidAt})`,
      planEnd: studentPlans.endDate,
    })
    .from(students)
    .leftJoin(payments, eq(payments.studentId, students.id))
    .leftJoin(
      studentPlans,
      and(eq(studentPlans.studentId, students.id), eq(studentPlans.status, "active"))
    )
    .where(eq(students.coachId, coachId))
    .groupBy(students.id, studentPlans.endDate)

  return rows.map((r) => {
    const end = r.planEnd ? new Date(r.planEnd) : null
    let paymentStatus: "green" | "yellow" | "red" = "red"
    if (end) {
      if (end >= in5days) paymentStatus = "green"
      else if (end >= today) paymentStatus = "yellow"
    }
    return { studentId: r.studentId, paymentStatus }
  })
}

/** Slots de horario activos del coach */
export async function getCoachSlots(coachId: string) {
  return db
    .select()
    .from(scheduleSlots)
    .where(and(eq(scheduleSlots.coachId, coachId), eq(scheduleSlots.active, true)))
    .orderBy(scheduleSlots.dayOfWeek, scheduleSlots.startTime)
}

/** Detalle completo de un alumno */
export async function getStudentById(studentId: string) {
  const coachUsers = alias(users, "coach_users")

  const result = await db
    .select({
      id: students.id,
      userId: users.id,
      coachId: students.coachId,
      name: users.name,
      email: users.email,
      image: users.image,
      sport: students.sport,
      objectives: students.objectives,
      injuryHistory: students.injuryHistory,
      startDate: students.startDate,
      whatsapp: students.whatsappNumber,
      coachName: coachUsers.name,
      planName: plans.name,
      planDays: plans.daysPerWeek,
      planEnd: studentPlans.endDate,
      planStatus: studentPlans.status,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(coaches, eq(students.coachId, coaches.id))
    .leftJoin(coachUsers, eq(coaches.userId, coachUsers.id))
    .leftJoin(
      studentPlans,
      and(eq(studentPlans.studentId, students.id), eq(studentPlans.status, "active"))
    )
    .leftJoin(plans, eq(studentPlans.planId, plans.id))
    .where(eq(students.id, studentId))
    .limit(1)
  return result[0] ?? null
}

/** Lista de rutinas del coach con cantidad de alumnos asignados */
export async function getCoachRoutines(coachId: string) {
  return db
    .select({
      id: routines.id,
      name: routines.name,
      description: routines.description,
      createdAt: routines.createdAt,
      assignmentCount: sql<number>`COUNT(DISTINCT ${routineAssignments.id}) FILTER (WHERE ${routineAssignments.active} = true)`,
    })
    .from(routines)
    .leftJoin(routineAssignments, eq(routineAssignments.routineId, routines.id))
    .where(eq(routines.coachId, coachId))
    .groupBy(routines.id)
    .orderBy(desc(routines.createdAt))
}

/** Rutina completa con bloques, ejercicios y asignaciones */
export async function getRoutineWithBlocks(routineId: string, coachId: string) {
  const routine = await db.select().from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.coachId, coachId))).limit(1)
  if (!routine[0]) return null

  const blocks = await db.select().from(routineBlocks)
    .where(eq(routineBlocks.routineId, routineId))
    .orderBy(routineBlocks.order)

  let blockExercises: Array<{
    id: string; blockId: string; exerciseId: string; exerciseName: string | null
    exerciseCategory: string; sets: number | null; reps: string | null; technicalNotes: string | null; order: number
  }> = []

  if (blocks.length > 0) {
    blockExercises = await db
      .select({
        id: routineExercises.id,
        blockId: routineExercises.blockId,
        exerciseId: exercises.id,
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

  const assignments = await db
    .select({
      assignmentId: routineAssignments.id,
      studentId: students.id,
      studentName: users.name,
    })
    .from(routineAssignments)
    .innerJoin(students, eq(routineAssignments.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(and(eq(routineAssignments.routineId, routineId), eq(routineAssignments.active, true)))

  return {
    ...routine[0],
    blocks: blocks.map((b) => ({
      ...b,
      exercises: blockExercises.filter((e) => e.blockId === b.id),
    })),
    assignments,
  }
}

/** Ejercicios disponibles para el coach (globales + los suyos) — para búsqueda en rutinas */
export async function getCoachExercises(coachId: string) {
  return db
    .select({ id: exercises.id, name: exercises.name, category: exercises.category })
    .from(exercises)
    .where(or(eq(exercises.isGlobal, true), eq(exercises.coachId, coachId)))
    .orderBy(exercises.name)
}

/** Ejercicios con detalle completo para la biblioteca */
export async function getCoachExercisesFull(coachId: string) {
  return db
    .select()
    .from(exercises)
    .where(or(eq(exercises.isGlobal, true), eq(exercises.coachId, coachId)))
    .orderBy(exercises.category, exercises.name)
}

/** Próximos turnos de un alumno sin filtro de coach (para admin) */
export async function getStudentBookingsAll(studentId: string) {
  const today = format(new Date(), "yyyy-MM-dd")
  const in30days = format(addDays(new Date(), 30), "yyyy-MM-dd")

  return db
    .select({
      bookingId: bookings.id,
      date: bookings.date,
      status: bookings.status,
      startTime: scheduleSlots.startTime,
      dayOfWeek: scheduleSlots.dayOfWeek,
      slotId: bookings.slotId,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .where(and(
      eq(bookings.studentId, studentId),
      gte(bookings.date, today),
      lte(bookings.date, in30days),
    ))
    .orderBy(bookings.date, scheduleSlots.startTime)
}

/** Próximos turnos de un alumno (próximos 30 días) */
export async function getStudentBookings(studentId: string, coachId: string) {
  const today = format(new Date(), "yyyy-MM-dd")
  const in30days = format(addDays(new Date(), 30), "yyyy-MM-dd")

  return db
    .select({
      bookingId: bookings.id,
      date: bookings.date,
      status: bookings.status,
      startTime: scheduleSlots.startTime,
      dayOfWeek: scheduleSlots.dayOfWeek,
      slotId: bookings.slotId,
    })
    .from(bookings)
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .where(
      and(
        eq(bookings.studentId, studentId),
        eq(scheduleSlots.coachId, coachId),
        gte(bookings.date, today),
        lte(bookings.date, in30days)
      )
    )
    .orderBy(bookings.date, scheduleSlots.startTime)
}

/**
 * Última sesión completada por cada alumno del coach.
 * Usado para detectar alumnos sin asistir en +7 días (alerta de retención).
 */
export async function getStudentsLastSession(coachId: string) {
  const rows = await db
    .select({
      studentId: trainingSessions.studentId,
      lastDate: sql<string>`MAX(${trainingSessions.date})`.as("last_date"),
    })
    .from(trainingSessions)
    .innerJoin(students, eq(trainingSessions.studentId, students.id))
    .where(
      and(
        eq(students.coachId, coachId),
        isNotNull(trainingSessions.completedAt)
      )
    )
    .groupBy(trainingSessions.studentId)

  return Object.fromEntries(rows.map((r) => [r.studentId, r.lastDate]))
}

/** Returns all active slots for the coach with their assigned students array, ordered by day + time */
export async function getCoachScheduleWithAssignments(coachId: string) {
  const slots = await db
    .select({
      id: scheduleSlots.id,
      dayOfWeek: scheduleSlots.dayOfWeek,
      startTime: scheduleSlots.startTime,
      maxCapacity: scheduleSlots.maxCapacity,
    })
    .from(scheduleSlots)
    .where(and(eq(scheduleSlots.coachId, coachId), eq(scheduleSlots.active, true)))
    .orderBy(scheduleSlots.dayOfWeek, scheduleSlots.startTime)

  if (slots.length === 0) return []

  const assignments = await db
    .select({
      slotId: slotAssignments.slotId,
      studentId: students.id,
      name: users.name,
    })
    .from(slotAssignments)
    .innerJoin(students, eq(slotAssignments.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(inArray(slotAssignments.slotId, slots.map((s) => s.id)))

  return slots.map((s) => ({
    ...s,
    assignedStudents: assignments
      .filter((a) => a.slotId === s.id)
      .map((a) => ({ studentId: a.studentId, name: a.name })),
  }))
}
