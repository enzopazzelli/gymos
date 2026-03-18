"use server"

import { db } from "@/lib/db"
import { attendance } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function markAttendance(bookingId: string, present: boolean) {
  const session = await auth()
  if (!session) throw new Error("No autorizado")

  // Upsert: insertar o actualizar el registro de asistencia
  await db
    .insert(attendance)
    .values({
      bookingId,
      present,
      registeredBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: attendance.bookingId,
      set: { present, registeredBy: session.user.id },
    })

  revalidatePath("/coach")
}
