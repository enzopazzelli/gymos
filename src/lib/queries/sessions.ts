import { db } from "@/lib/db"
import { trainingSessions, sessionLogs, exercises } from "@/lib/db/schema"
import { eq, and, isNull, isNotNull, desc, inArray, sql } from "drizzle-orm"
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns"

export type SetData = { set: number; weight: number | null; reps: string }

export async function getOrCreateTodaySession(studentId: string, coachId: string, routineId: string) {
  const today = format(new Date(), "yyyy-MM-dd")

  const existing = await db
    .select({ id: trainingSessions.id, createdAt: trainingSessions.createdAt })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.studentId, studentId),
        eq(trainingSessions.routineId, routineId),
        eq(trainingSessions.date, today),
        isNull(trainingSessions.completedAt),
      )
    )
    .limit(1)

  if (existing[0]) return { id: existing[0].id, startedAt: existing[0].createdAt }

  const [session] = await db
    .insert(trainingSessions)
    .values({ studentId, coachId, routineId, date: today })
    .returning({ id: trainingSessions.id, createdAt: trainingSessions.createdAt })

  return { id: session.id, startedAt: session.createdAt }
}

export async function getSessionExistingLogs(sessionId: string): Promise<Record<string, SetData[]>> {
  const logs = await db
    .select({ exerciseId: sessionLogs.exerciseId, setsData: sessionLogs.setsData })
    .from(sessionLogs)
    .where(eq(sessionLogs.sessionId, sessionId))

  const map: Record<string, SetData[]> = {}
  for (const log of logs) {
    map[log.exerciseId] = (log.setsData as SetData[]) || []
  }
  return map
}

export async function getLastExercisePerformances(
  studentId: string,
  exerciseIds: string[]
): Promise<Record<string, string>> {
  if (!exerciseIds.length) return {}

  const recentSessions = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.studentId, studentId), isNotNull(trainingSessions.completedAt)))
    .orderBy(desc(trainingSessions.date))
    .limit(20)

  if (!recentSessions.length) return {}

  const logs = await db
    .select({
      exerciseId: sessionLogs.exerciseId,
      setsData: sessionLogs.setsData,
      sessionId: sessionLogs.sessionId,
    })
    .from(sessionLogs)
    .where(
      and(
        inArray(sessionLogs.sessionId, recentSessions.map((s) => s.id)),
        inArray(sessionLogs.exerciseId, exerciseIds)
      )
    )

  const map: Record<string, string> = {}
  for (const session of recentSessions) {
    for (const log of logs.filter((l) => l.sessionId === session.id)) {
      if (map[log.exerciseId]) continue
      const sets = (log.setsData as SetData[]) || []
      if (sets.length > 0) {
        const best = sets.reduce((a, b) => (a.weight ?? 0) >= (b.weight ?? 0) ? a : b)
        map[log.exerciseId] = `${best.weight ? `${best.weight}kg × ` : ""}${best.reps}`
      }
    }
  }
  return map
}

/** Sesiones completadas por semana (últimas N semanas) para gráfico de barras */
export async function getSessionsPerWeek(studentId: string, weeks = 8) {
  const result: { week: string; count: number }[] = []
  const now = new Date()

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = format(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), "yyyy-MM-dd")
    const weekEnd = format(endOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), "yyyy-MM-dd")
    const label = format(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), "d/M")

    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.studentId, studentId),
          isNotNull(trainingSessions.completedAt),
          sql`${trainingSessions.date} >= ${weekStart}`,
          sql`${trainingSessions.date} <= ${weekEnd}`,
        )
      )
    result.push({ week: label, count: Number(row?.count ?? 0) })
  }
  return result
}

/** PRs del alumno: mejor peso por ejercicio */
export async function getStudentPRs(studentId: string) {
  const completedSessions = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.studentId, studentId), isNotNull(trainingSessions.completedAt)))

  if (!completedSessions.length) return []

  const logs = await db
    .select({
      exerciseId: sessionLogs.exerciseId,
      exerciseName: exercises.name,
      setsData: sessionLogs.setsData,
    })
    .from(sessionLogs)
    .innerJoin(exercises, eq(sessionLogs.exerciseId, exercises.id))
    .where(inArray(sessionLogs.sessionId, completedSessions.map((s) => s.id)))

  const map: Record<string, { name: string; weight: number; reps: string }> = {}
  for (const log of logs) {
    const sets = (log.setsData as SetData[]) || []
    for (const s of sets) {
      if (!s.weight) continue
      if (!map[log.exerciseId] || s.weight > map[log.exerciseId].weight) {
        map[log.exerciseId] = { name: log.exerciseName, weight: s.weight, reps: s.reps }
      }
    }
  }
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
}

/** Progreso de un ejercicio a lo largo del tiempo (max weight por sesión) */
export async function getExerciseProgress(studentId: string, exerciseId: string) {
  const rows = await db
    .select({ date: trainingSessions.date, setsData: sessionLogs.setsData })
    .from(sessionLogs)
    .innerJoin(trainingSessions, eq(sessionLogs.sessionId, trainingSessions.id))
    .where(
      and(
        eq(trainingSessions.studentId, studentId),
        eq(sessionLogs.exerciseId, exerciseId),
        isNotNull(trainingSessions.completedAt),
      )
    )
    .orderBy(trainingSessions.date)

  return rows.map((r) => {
    const sets = (r.setsData as SetData[]) || []
    const maxWeight = sets.reduce((max, s) => Math.max(max, s.weight ?? 0), 0)
    return { date: r.date, weight: maxWeight || null }
  }).filter((r) => r.weight !== null)
}

/** Stats generales del alumno */
export async function getStudentStats(studentId: string) {
  const [totalRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.studentId, studentId), isNotNull(trainingSessions.completedAt)))

  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
  const [monthRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.studentId, studentId),
        isNotNull(trainingSessions.completedAt),
        sql`${trainingSessions.date} >= ${monthStart}`,
      )
    )

  const [lastRow] = await db
    .select({ date: trainingSessions.date })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.studentId, studentId), isNotNull(trainingSessions.completedAt)))
    .orderBy(desc(trainingSessions.date))
    .limit(1)

  return {
    total: Number(totalRow?.total ?? 0),
    thisMonth: Number(monthRow?.count ?? 0),
    lastSessionDate: lastRow?.date ?? null,
  }
}
