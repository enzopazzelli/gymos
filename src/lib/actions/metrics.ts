"use server"

import { db } from "@/lib/db"
import { metrics } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { getMetricConfig } from "@/lib/metrics-config"

export async function addMetric(formData: FormData) {
  const session = await auth()
  if (!session || !["coach", "admin"].includes(session.user.role as string)) {
    throw new Error("No autorizado")
  }

  const studentId  = formData.get("studentId")  as string
  const type       = formData.get("type")        as string
  const value      = formData.get("value")       as string
  const recordedAt = formData.get("recordedAt")  as string
  const notesRaw   = formData.get("notes")       as string | null

  if (!studentId || !type || !value || !recordedAt) {
    throw new Error("Faltan campos requeridos")
  }

  // Auto-populate unit from config
  const config = getMetricConfig(type)
  const unit = config?.unit ?? (formData.get("unit") as string) ?? ""

  await db.insert(metrics).values({
    studentId,
    type,
    value,
    unit,
    recordedAt,
    notes: notesRaw || null,
    registeredBy: session.user.id,
  })

  revalidatePath(`/coach/alumnos/${studentId}`)
  revalidatePath(`/student/progreso`)
}

export async function deleteMetric(id: string, studentId: string) {
  const session = await auth()
  if (!session || !["coach", "admin"].includes(session.user.role as string)) {
    throw new Error("No autorizado")
  }

  await db.delete(metrics).where(eq(metrics.id, id))

  revalidatePath(`/coach/alumnos/${studentId}`)
  revalidatePath(`/student/progreso`)
}
