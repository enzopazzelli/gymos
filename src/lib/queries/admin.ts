import { db } from "@/lib/db"
import { users, students, coaches, payments, studentPlans, plans, attendance, bookings } from "@/lib/db/schema"
import { eq, and, lt, isNull, or, sql, count, gte } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { format, subDays, startOfMonth, subMonths } from "date-fns"

export async function getAdminStats() {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd")

  const [[{ totalStudents }], [{ totalCoaches }], [{ activePlans }], [{ monthRevenue }]] =
    await Promise.all([
      db.select({ totalStudents: count() }).from(students),
      db.select({ totalCoaches: count() }).from(coaches),
      db
        .select({ activePlans: count() })
        .from(studentPlans)
        .where(eq(studentPlans.status, "active")),
      db
        .select({ monthRevenue: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(gte(sql`DATE(${payments.paidAt})`, monthStart)),
    ])

  return { totalStudents, totalCoaches, activePlans, monthRevenue }
}

export async function getOverdueStudents() {
  const today = format(new Date(), "yyyy-MM-dd")

  return db
    .select({
      studentId: students.id,
      name: users.name,
      email: users.email,
      planEnd: studentPlans.endDate,
      planName: plans.name,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(
      studentPlans,
      and(eq(studentPlans.studentId, students.id), eq(studentPlans.status, "active"))
    )
    .leftJoin(plans, eq(studentPlans.planId, plans.id))
    .where(
      or(isNull(studentPlans.id), lt(studentPlans.endDate, today))
    )
    .orderBy(users.name)
}

export async function getStudentsNotAttendedRecently() {
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd")

  return db
    .select({
      studentId: students.id,
      name: users.name,
      lastAttendance: sql<string | null>`MAX(CASE WHEN ${attendance.present} = true THEN DATE(${attendance.registeredAt}) END)`,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(bookings, eq(bookings.studentId, students.id))
    .leftJoin(attendance, eq(attendance.bookingId, bookings.id))
    .groupBy(students.id, users.id)
    .having(
      sql`
        MAX(CASE WHEN ${attendance.present} = true THEN DATE(${attendance.registeredAt}) END) < ${sevenDaysAgo}
        OR MAX(CASE WHEN ${attendance.present} = true THEN DATE(${attendance.registeredAt}) END) IS NULL
      `
    )
    .orderBy(users.name)
}

export async function getCoachesForSelect() {
  return db
    .select({ id: coaches.id, name: users.name })
    .from(coaches)
    .innerJoin(users, eq(coaches.userId, users.id))
    .orderBy(users.name)
}

export async function getActivePlans() {
  return db
    .select()
    .from(plans)
    .where(eq(plans.active, true))
    .orderBy(plans.daysPerWeek)
}

export async function getAllCoaches() {
  return db
    .select({
      coachId: coaches.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      specialty: coaches.specialty,
      whatsapp: coaches.whatsappNumber,
      studentCount: sql<number>`COUNT(${students.id})`,
    })
    .from(coaches)
    .innerJoin(users, eq(coaches.userId, users.id))
    .leftJoin(students, eq(students.coachId, coaches.id))
    .groupBy(coaches.id, users.id)
    .orderBy(users.name)
}

/** Ingresos agrupados por mes — últimos N meses */
export async function getRevenueByMonth(months = 6) {
  const start = startOfMonth(subMonths(new Date(), months - 1))

  return db
    .select({
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${payments.paidAt}), 'YYYY-MM')`,
      revenue: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    })
    .from(payments)
    .where(gte(payments.paidAt, start))
    .groupBy(sql`DATE_TRUNC('month', ${payments.paidAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${payments.paidAt})`)
}

/** Coaches con cantidad de alumnos e ingresos del mes actual */
export async function getCoachesStats() {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd")

  const coachList = await db
    .select({
      coachId: coaches.id,
      name: users.name,
      studentCount: sql<number>`COUNT(DISTINCT ${students.id})`,
    })
    .from(coaches)
    .innerJoin(users, eq(coaches.userId, users.id))
    .leftJoin(students, eq(students.coachId, coaches.id))
    .groupBy(coaches.id, users.id)
    .orderBy(users.name)

  if (coachList.length === 0) return []

  const revenueRows = await db
    .select({
      coachId: sql<string>`${students.coachId}`,
      revenue: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .where(gte(sql`DATE(${payments.paidAt})`, monthStart))
    .groupBy(students.coachId)

  const revenueMap = Object.fromEntries(revenueRows.map((r) => [r.coachId, r.revenue]))

  return coachList.map((c) => ({
    ...c,
    monthRevenue: revenueMap[c.coachId] ?? "0",
  }))
}

export async function getAllStudentsWithCoach() {
  const coachUsers = alias(users, "coach_users")

  return db
    .select({
      studentId: students.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      coachId: students.coachId,
      coachName: coachUsers.name,
      planName: plans.name,
      planStatus: studentPlans.status,
      planEnd: studentPlans.endDate,
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
    .orderBy(users.name)
}
