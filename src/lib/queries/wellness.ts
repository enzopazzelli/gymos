import { db } from "@/lib/db"
import { wellnessLogs } from "@/lib/db/schema"
import { eq, and, gte, desc } from "drizzle-orm"
import { format, subDays } from "date-fns"

export async function getTodayWellnessLog(studentId: string) {
  const today = format(new Date(), "yyyy-MM-dd")
  const result = await db
    .select()
    .from(wellnessLogs)
    .where(and(eq(wellnessLogs.studentId, studentId), eq(wellnessLogs.date, today)))
    .limit(1)
  return result[0] ?? null
}

export async function getWellnessHistory(studentId: string, days = 14) {
  const from = format(subDays(new Date(), days - 1), "yyyy-MM-dd")
  return db
    .select()
    .from(wellnessLogs)
    .where(and(eq(wellnessLogs.studentId, studentId), gte(wellnessLogs.date, from)))
    .orderBy(desc(wellnessLogs.date))
}
