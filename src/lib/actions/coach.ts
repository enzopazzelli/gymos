"use server"

import { db } from "@/lib/db"
import { users, coaches } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function updateCoachProfile(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "coach") throw new Error("No autorizado")

  const name      = (formData.get("name")      as string).trim()
  const specialty = (formData.get("specialty") as string)?.trim() || null
  const whatsapp  = (formData.get("whatsapp")  as string)?.trim() || null
  const bio       = (formData.get("bio")       as string)?.trim() || null

  await db.update(users).set({ name }).where(eq(users.id, session.user.id))
  await db.update(coaches).set({ specialty, whatsappNumber: whatsapp, bio }).where(eq(coaches.userId, session.user.id))

  revalidatePath("/coach/perfil")
}
