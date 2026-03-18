"use server"

import { db } from "@/lib/db"
import { sessionLogs, trainingSessions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"

type SetData = { set: number; weight: number | null; reps: string }

export async function saveExerciseSets(
  sessionId: string,
  exerciseId: string,
  order: number,
  setsData: SetData[]
) {
  const authSession = await auth()
  if (!authSession) throw new Error("No autorizado")

  const existing = await db
    .select({ id: sessionLogs.id })
    .from(sessionLogs)
    .where(and(eq(sessionLogs.sessionId, sessionId), eq(sessionLogs.exerciseId, exerciseId)))
    .limit(1)

  if (existing[0]) {
    await db.update(sessionLogs).set({ setsData }).where(eq(sessionLogs.id, existing[0].id))
  } else {
    await db.insert(sessionLogs).values({ sessionId, exerciseId, setsData, order })
  }
}

export async function completeSession(sessionId: string, coachNotes?: string) {
  const authSession = await auth()
  if (!authSession) throw new Error("No autorizado")

  await db
    .update(trainingSessions)
    .set({ completedAt: new Date(), coachNotes: coachNotes ?? null })
    .where(eq(trainingSessions.id, sessionId))
}
