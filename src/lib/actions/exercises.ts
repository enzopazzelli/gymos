"use server"

import { db } from "@/lib/db"
import { exercises, coaches } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

async function getCoachOrThrow() {
  const session = await auth()
  if (!session || session.user.role !== "coach") throw new Error("No autorizado")
  const result = await db.select({ id: coaches.id }).from(coaches).where(eq(coaches.userId, session.user.id)).limit(1)
  if (!result[0]) throw new Error("Coach no encontrado")
  return result[0].id
}

export async function createExercise(formData: FormData) {
  const coachId = await getCoachOrThrow()
  const name = (formData.get("name") as string).trim()
  const category = formData.get("category") as "strength" | "conditioning" | "rehab" | "mobility"
  const description = (formData.get("description") as string)?.trim() || null
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null

  await db.insert(exercises).values({ name, category, description, videoUrl, isGlobal: false, coachId })
  revalidatePath("/coach/ejercicios")
}

export async function updateExercise(formData: FormData) {
  const coachId = await getCoachOrThrow()
  const exerciseId = formData.get("exerciseId") as string
  const name = (formData.get("name") as string).trim()
  const category = formData.get("category") as "strength" | "conditioning" | "rehab" | "mobility"
  const description = (formData.get("description") as string)?.trim() || null
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null

  await db
    .update(exercises)
    .set({ name, category, description, videoUrl })
    .where(and(eq(exercises.id, exerciseId), eq(exercises.coachId, coachId)))

  revalidatePath("/coach/ejercicios")
}

export async function deleteExercise(exerciseId: string) {
  const coachId = await getCoachOrThrow()
  await db.delete(exercises).where(and(eq(exercises.id, exerciseId), eq(exercises.coachId, coachId)))
  revalidatePath("/coach/ejercicios")
}
