"use server"

import { db } from "@/lib/db"
import { wellnessLogs, students } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { format } from "date-fns"

async function getStudentOrThrow() {
  const session = await auth()
  if (!session || session.user.role !== "student") throw new Error("No autorizado")
  const result = await db.select({ id: students.id }).from(students).where(eq(students.userId, session.user.id)).limit(1)
  if (!result[0]) throw new Error("Alumno no encontrado")
  return result[0].id
}

export async function saveWellnessLog(formData: FormData) {
  const studentId = await getStudentOrThrow()
  const today = format(new Date(), "yyyy-MM-dd")

  const sleep   = formData.get("sleep")   ? parseInt(formData.get("sleep") as string)   : null
  const fatigue = formData.get("fatigue") ? parseInt(formData.get("fatigue") as string) : null
  const mood    = formData.get("mood")    ? parseInt(formData.get("mood") as string)    : null
  const pain    = formData.get("pain")    ? parseInt(formData.get("pain") as string)    : null
  const notes   = (formData.get("notes") as string)?.trim() || null

  const existing = await db
    .select({ id: wellnessLogs.id })
    .from(wellnessLogs)
    .where(and(eq(wellnessLogs.studentId, studentId), eq(wellnessLogs.date, today)))
    .limit(1)

  if (existing[0]) {
    await db.update(wellnessLogs)
      .set({ sleep, fatigue, mood, pain, notes })
      .where(eq(wellnessLogs.id, existing[0].id))
  } else {
    await db.insert(wellnessLogs).values({ studentId, date: today, sleep, fatigue, mood, pain, notes })
  }

  revalidatePath("/student")
}
