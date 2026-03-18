import { db } from "@/lib/db"
import { metrics } from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"

export async function getStudentMetrics(studentId: string) {
  return db
    .select()
    .from(metrics)
    .where(eq(metrics.studentId, studentId))
    .orderBy(desc(metrics.recordedAt))
}

export type StudentMetric = Awaited<ReturnType<typeof getStudentMetrics>>[number]

export async function getStudentMetricHistory(studentId: string, type: string, limit = 10) {
  const rows = await db
    .select()
    .from(metrics)
    .where(and(eq(metrics.studentId, studentId), eq(metrics.type, type)))
    .orderBy(desc(metrics.recordedAt))
    .limit(limit)
  return rows.reverse() // oldest → newest (for charts)
}
