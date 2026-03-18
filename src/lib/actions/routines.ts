"use server"

import { db } from "@/lib/db"
import { routines, routineBlocks, routineExercises, routineAssignments, exercises, coaches } from "@/lib/db/schema"
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

export async function createRoutine(formData: FormData) {
  const coachId = await getCoachOrThrow()
  const name = (formData.get("name") as string).trim()
  const description = (formData.get("description") as string)?.trim() || null
  const [routine] = await db.insert(routines).values({ coachId, name, description }).returning({ id: routines.id })
  revalidatePath("/coach/rutinas")
  return routine.id
}

export async function deleteRoutine(routineId: string) {
  const coachId = await getCoachOrThrow()
  await db.delete(routines).where(and(eq(routines.id, routineId), eq(routines.coachId, coachId)))
  revalidatePath("/coach/rutinas")
}

export async function addBlock(formData: FormData) {
  const coachId = await getCoachOrThrow()
  const routineId = formData.get("routineId") as string
  const name = (formData.get("name") as string).trim()
  const order = parseInt(formData.get("order") as string)

  const own = await db.select({ id: routines.id }).from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.coachId, coachId))).limit(1)
  if (!own[0]) throw new Error("No autorizado")

  await db.insert(routineBlocks).values({ routineId, name, order })
  revalidatePath(`/coach/rutinas/${routineId}`)
}

export async function deleteBlock(blockId: string, routineId: string) {
  const coachId = await getCoachOrThrow()
  const block = await db.select({ routineId: routineBlocks.routineId }).from(routineBlocks)
    .where(eq(routineBlocks.id, blockId)).limit(1)
  if (!block[0]) return
  const own = await db.select({ id: routines.id }).from(routines)
    .where(and(eq(routines.id, block[0].routineId), eq(routines.coachId, coachId))).limit(1)
  if (!own[0]) throw new Error("No autorizado")
  await db.delete(routineBlocks).where(eq(routineBlocks.id, blockId))
  revalidatePath(`/coach/rutinas/${routineId}`)
}

export async function addExerciseToBlock(formData: FormData) {
  const coachId = await getCoachOrThrow()
  const blockId = formData.get("blockId") as string
  const routineId = formData.get("routineId") as string
  const sets = formData.get("sets") ? parseInt(formData.get("sets") as string) : null
  const reps = (formData.get("reps") as string)?.trim() || null
  const technicalNotes = (formData.get("technicalNotes") as string)?.trim() || null
  const order = parseInt(formData.get("order") as string)

  let exerciseId = (formData.get("exerciseId") as string) || ""
  if (!exerciseId) {
    const exerciseName = (formData.get("exerciseName") as string)?.trim()
    const category = (formData.get("category") as string) as "strength" | "conditioning" | "rehab" | "mobility"
    if (!exerciseName) throw new Error("Nombre del ejercicio requerido")
    const [newEx] = await db.insert(exercises).values({
      name: exerciseName,
      category: category || "strength",
      isGlobal: false,
      coachId,
    }).returning({ id: exercises.id })
    exerciseId = newEx.id
  }

  await db.insert(routineExercises).values({ blockId, exerciseId, sets, reps, technicalNotes, order })
  revalidatePath(`/coach/rutinas/${routineId}`)
}

export async function removeExerciseFromBlock(routineExerciseId: string, routineId: string) {
  await db.delete(routineExercises).where(eq(routineExercises.id, routineExerciseId))
  revalidatePath(`/coach/rutinas/${routineId}`)
}

export async function assignRoutineToStudent(formData: FormData) {
  await getCoachOrThrow()
  const routineId = formData.get("routineId") as string
  const studentId = formData.get("studentId") as string

  const existing = await db.select({ id: routineAssignments.id }).from(routineAssignments)
    .where(and(
      eq(routineAssignments.routineId, routineId),
      eq(routineAssignments.studentId, studentId),
      eq(routineAssignments.active, true)
    )).limit(1)
  if (existing[0]) throw new Error("Ya está asignada a este alumno")

  await db.insert(routineAssignments).values({ routineId, studentId })
  revalidatePath(`/coach/rutinas/${routineId}`)
}

export async function unassignRoutine(assignmentId: string, routineId: string) {
  await db.update(routineAssignments).set({ active: false }).where(eq(routineAssignments.id, assignmentId))
  revalidatePath(`/coach/rutinas/${routineId}`)
}

export async function duplicateRoutine(routineId: string) {
  const coachId = await getCoachOrThrow()

  const [original] = await db.select().from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.coachId, coachId))).limit(1)
  if (!original) throw new Error("Rutina no encontrada")

  const [newRoutine] = await db
    .insert(routines)
    .values({ coachId, name: `${original.name} (copia)`, description: original.description })
    .returning({ id: routines.id })

  const blocks = await db.select().from(routineBlocks)
    .where(eq(routineBlocks.routineId, routineId))
    .orderBy(routineBlocks.order)

  for (const block of blocks) {
    const [newBlock] = await db
      .insert(routineBlocks)
      .values({ routineId: newRoutine.id, name: block.name, order: block.order })
      .returning({ id: routineBlocks.id })

    const exs = await db.select().from(routineExercises)
      .where(eq(routineExercises.blockId, block.id))
      .orderBy(routineExercises.order)

    if (exs.length > 0) {
      await db.insert(routineExercises).values(
        exs.map((e) => ({
          blockId: newBlock.id,
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          technicalNotes: e.technicalNotes,
          order: e.order,
        }))
      )
    }
  }

  revalidatePath("/coach/rutinas")
  return newRoutine.id
}
