"use server"

import { db } from "@/lib/db"
import { payments } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

export async function addPayment(formData: FormData) {
  const session = await auth()
  if (!session || !["coach", "admin"].includes(session.user.role as string)) {
    throw new Error("No autorizado")
  }

  const studentId     = formData.get("studentId")     as string
  const amountRaw     = formData.get("amount")         as string
  const method        = formData.get("method")         as string
  const periodCovered = (formData.get("periodCovered") as string) || null
  const notes         = (formData.get("notes")         as string) || null

  if (!studentId || !amountRaw || !method) throw new Error("Faltan campos requeridos")

  await db.insert(payments).values({
    studentId,
    amount: amountRaw,
    method: method as "cash" | "transfer" | "card" | "other",
    periodCovered,
    notes,
    registeredBy: session.user.id,
  })

  revalidatePath("/admin/alumnos")
  revalidatePath("/admin")
  revalidatePath(`/coach/alumnos/${studentId}`)
}

export async function deletePayment(id: string, studentId: string) {
  const session = await auth()
  if (!session || session.user.role !== "admin") throw new Error("No autorizado")

  await db.delete(payments).where(eq(payments.id, id))

  revalidatePath("/admin/alumnos")
  revalidatePath("/admin")
  revalidatePath(`/coach/alumnos/${studentId}`)
}
