"use server"

import { db } from "@/lib/db"
import { users, coaches, students, plans, studentPlans } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import bcrypt from "bcryptjs"
import { sendPushToUser } from "@/lib/push"

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "admin") throw new Error("No autorizado")
}

export async function createCoach(formData: FormData) {
  await requireAdmin()

  const email = (formData.get("email") as string).trim().toLowerCase()
  const name = (formData.get("name") as string).trim()
  const rawPassword = (formData.get("password") as string)?.trim()
  const specialty = (formData.get("specialty") as string)?.trim() || null
  const whatsapp = (formData.get("whatsapp") as string)?.trim() || null

  if (!rawPassword || rawPassword.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres")
  const hashedPassword = await bcrypt.hash(rawPassword, 10)

  const existing = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, email)).limit(1)

  let userId: string
  if (existing.length > 0) {
    if (existing[0].role === "admin") throw new Error("No podés cambiar el rol de un admin.")
    userId = existing[0].id
    await db.update(users).set({ name, role: "coach", password: hashedPassword }).where(eq(users.id, userId))
  } else {
    const [newUser] = await db.insert(users).values({ email, name, role: "coach", password: hashedPassword }).returning({ id: users.id })
    userId = newUser.id
  }

  const existingCoach = await db.select({ id: coaches.id }).from(coaches).where(eq(coaches.userId, userId)).limit(1)
  if (existingCoach.length === 0) {
    await db.insert(coaches).values({ userId, specialty, whatsappNumber: whatsapp })
  } else {
    await db.update(coaches).set({ specialty, whatsappNumber: whatsapp }).where(eq(coaches.userId, userId))
  }

  revalidatePath("/admin/coaches")
}

export async function createStudent(formData: FormData) {
  await requireAdmin()

  const email       = (formData.get("email")    as string).trim().toLowerCase()
  const name        = (formData.get("name")     as string).trim()
  const rawPassword = (formData.get("password") as string)?.trim()
  const coachId     = (formData.get("coachId")  as string) || null
  const sport       = (formData.get("sport")    as string)?.trim() || null
  const startDate   = (formData.get("startDate") as string) || format(new Date(), "yyyy-MM-dd")

  // Optional plan assignment
  const planId        = (formData.get("planId")        as string) || null
  const planStartDate = (formData.get("planStartDate") as string) || format(new Date(), "yyyy-MM-dd")
  const endDate       = (formData.get("endDate")       as string) || null

  if (!rawPassword || rawPassword.length < 6)
    throw new Error("La contraseña debe tener al menos 6 caracteres")

  const hashedPassword = await bcrypt.hash(rawPassword, 10)

  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  let userId: string
  if (existing.length > 0) {
    if (existing[0].role === "admin") throw new Error("No podés cambiar el rol de un admin.")
    userId = existing[0].id
    await db.update(users).set({ name, role: "student", password: hashedPassword }).where(eq(users.id, userId))
  } else {
    const [newUser] = await db
      .insert(users)
      .values({ email, name, role: "student", password: hashedPassword })
      .returning({ id: users.id })
    userId = newUser.id
  }

  let studentId: string
  const existingStudent = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1)

  if (existingStudent.length === 0) {
    const [newStudent] = await db
      .insert(students)
      .values({ userId, coachId: coachId || null, sport, startDate })
      .returning({ id: students.id })
    studentId = newStudent.id
  } else {
    studentId = existingStudent[0].id
    await db.update(students).set({ coachId: coachId || null, sport }).where(eq(students.userId, userId))
  }

  // Assign plan if provided
  if (planId && endDate) {
    await db
      .update(studentPlans)
      .set({ status: "expired" })
      .where(and(eq(studentPlans.studentId, studentId), eq(studentPlans.status, "active")))

    await db.insert(studentPlans).values({
      studentId,
      planId,
      startDate: planStartDate,
      endDate,
      status: "active",
    })
  }

  revalidatePath("/admin/alumnos")
}

export async function createStudentAsCoach(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "coach") throw new Error("No autorizado")

  const coachRow = await db
    .select({ id: coaches.id })
    .from(coaches)
    .where(eq(coaches.userId, session.user.id))
    .limit(1)
  if (!coachRow[0]) throw new Error("Coach no encontrado")
  const coachId = coachRow[0].id

  const email       = (formData.get("email")    as string).trim().toLowerCase()
  const name        = (formData.get("name")     as string).trim()
  const rawPassword = (formData.get("password") as string)?.trim()
  const sport       = (formData.get("sport")    as string)?.trim() || null
  const whatsapp    = (formData.get("whatsapp") as string)?.trim() || null
  const startDate   = (formData.get("startDate") as string) || format(new Date(), "yyyy-MM-dd")

  const planId        = (formData.get("planId")        as string) || null
  const planStartDate = (formData.get("planStartDate") as string) || format(new Date(), "yyyy-MM-dd")
  const endDate       = (formData.get("endDate")       as string) || null

  if (!rawPassword || rawPassword.length < 6)
    throw new Error("La contraseña debe tener al menos 6 caracteres")

  const hashedPassword = await bcrypt.hash(rawPassword, 10)

  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  let userId: string
  if (existing.length > 0) {
    if (existing[0].role === "admin") throw new Error("No podés cambiar el rol de un admin.")
    userId = existing[0].id
    await db.update(users).set({ name, role: "student", password: hashedPassword }).where(eq(users.id, userId))
  } else {
    const [newUser] = await db
      .insert(users)
      .values({ email, name, role: "student", password: hashedPassword })
      .returning({ id: users.id })
    userId = newUser.id
  }

  let studentId: string
  const existingStudent = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1)

  if (existingStudent.length === 0) {
    const [newStudent] = await db
      .insert(students)
      .values({ userId, coachId, sport, startDate, whatsappNumber: whatsapp })
      .returning({ id: students.id })
    studentId = newStudent.id
  } else {
    studentId = existingStudent[0].id
    await db.update(students).set({ coachId, sport, whatsappNumber: whatsapp }).where(eq(students.userId, userId))
  }

  if (planId && endDate) {
    await db
      .update(studentPlans)
      .set({ status: "expired" })
      .where(and(eq(studentPlans.studentId, studentId), eq(studentPlans.status, "active")))

    await db.insert(studentPlans).values({
      studentId,
      planId,
      startDate: planStartDate,
      endDate,
      status: "active",
    })
  }

  revalidatePath("/coach/alumnos")
  revalidatePath("/admin/alumnos")
}

export async function createPlan(formData: FormData) {
  await requireAdmin()

  const name = (formData.get("name") as string).trim()
  const daysPerWeek = parseInt(formData.get("daysPerWeek") as string)
  const price = formData.get("price") as string

  await db.insert(plans).values({ name, daysPerWeek, price })

  revalidatePath("/admin/alumnos")
  revalidatePath("/admin")
}

interface ImportStudentRow {
  name: string
  email: string
  password: string
  sport?: string
  whatsapp?: string
  coachId?: string
  planId?: string
  planStartDate?: string
  planEndDate?: string
}

export async function importStudents(
  rows: ImportStudentRow[]
): Promise<{ imported: number; skipped: number }> {
  await requireAdmin()

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const email = row.email.trim().toLowerCase()
    if (!row.name || !email) { skipped++; continue }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing.length > 0) { skipped++; continue }

    const hashedPassword = await bcrypt.hash(row.password || "rheb2024", 10)

    const [newUser] = await db
      .insert(users)
      .values({ email, name: row.name, role: "student", password: hashedPassword })
      .returning({ id: users.id })

    const [newStudent] = await db
      .insert(students)
      .values({
        userId: newUser.id,
        coachId: row.coachId || null,
        sport: row.sport || null,
        whatsappNumber: row.whatsapp || null,
        startDate: format(new Date(), "yyyy-MM-dd"),
      })
      .returning({ id: students.id })

    if (row.planId && row.planEndDate) {
      await db.insert(studentPlans).values({
        studentId: newStudent.id,
        planId: row.planId,
        startDate: row.planStartDate || format(new Date(), "yyyy-MM-dd"),
        endDate: row.planEndDate,
        status: "active",
      })
    }

    imported++
  }

  revalidatePath("/admin/alumnos")
  revalidatePath("/coach/alumnos")
  revalidatePath("/admin")

  return { imported, skipped }
}

export async function changeStudentCoach(formData: FormData) {
  await requireAdmin()
  const studentId = formData.get("studentId") as string
  const coachId   = (formData.get("coachId") as string) || null
  await db.update(students).set({ coachId }).where(eq(students.id, studentId))
  revalidatePath("/admin/alumnos")
  revalidatePath("/coach/alumnos")
}

export async function deleteStudent(studentId: string) {
  await requireAdmin()

  const student = await db.select({ userId: students.userId }).from(students).where(eq(students.id, studentId)).limit(1)
  if (student.length === 0) throw new Error("Alumno no encontrado")

  await db.delete(users).where(eq(users.id, student[0].userId))

  revalidatePath("/admin/alumnos")
  revalidatePath("/admin")
}

export async function resetUserPassword(formData: FormData) {
  await requireAdmin()

  const userId = formData.get("userId") as string
  const rawPassword = (formData.get("password") as string)?.trim()

  if (!rawPassword || rawPassword.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres")
  const hashedPassword = await bcrypt.hash(rawPassword, 10)

  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId))
}

export async function updateStudent(formData: FormData) {
  await requireAdmin()

  const studentId = formData.get("studentId") as string
  const name      = (formData.get("name")     as string).trim()
  const email     = (formData.get("email")    as string).trim().toLowerCase()
  const sport     = (formData.get("sport")    as string)?.trim() || null
  const whatsapp  = (formData.get("whatsapp") as string)?.trim() || null
  const objectives     = (formData.get("objectives")    as string)?.trim() || null
  const injuryHistory  = (formData.get("injuryHistory") as string)?.trim() || null

  const student = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)
  if (!student[0]) throw new Error("Alumno no encontrado")

  await db.update(users).set({ name, email }).where(eq(users.id, student[0].userId))
  await db.update(students).set({ sport, whatsappNumber: whatsapp, objectives, injuryHistory }).where(eq(students.id, studentId))

  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath("/admin/alumnos")
}

export async function assignPlan(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "admin") throw new Error("No autorizado")

  const studentId = formData.get("studentId") as string
  const planId    = formData.get("planId")    as string
  const startDate = formData.get("startDate") as string
  const endDate   = formData.get("endDate")   as string

  // Optional inline payment
  const paymentAmount = (formData.get("paymentAmount") as string) || null
  const paymentMethod = (formData.get("paymentMethod") as string) || null
  const paymentPeriod = (formData.get("paymentPeriod") as string) || null

  await db
    .update(studentPlans)
    .set({ status: "expired" })
    .where(and(eq(studentPlans.studentId, studentId), eq(studentPlans.status, "active")))

  await db.insert(studentPlans).values({ studentId, planId, startDate, endDate, status: "active" })

  // Push al alumno
  const [studentInfo] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)
  const [planInfo] = await db.select({ name: plans.name }).from(plans).where(eq(plans.id, planId)).limit(1)
  if (studentInfo && planInfo && endDate) {
    const endStr = format(parseISO(endDate + "T12:00:00"), "d 'de' MMMM", { locale: es })
    await sendPushToUser(
      studentInfo.userId,
      "Plan renovado",
      `Tu plan ${planInfo.name} fue renovado. Vence el ${endStr}.`,
      "/student/perfil"
    )
  }

  if (paymentAmount && paymentMethod) {
    const { payments } = await import("@/lib/db/schema")
    await db.insert(payments).values({
      studentId,
      amount: paymentAmount,
      method: paymentMethod as "cash" | "transfer" | "card" | "other",
      periodCovered: paymentPeriod || null,
      registeredBy: session.user.id,
    })
  }

  revalidatePath("/admin/alumnos")
  revalidatePath("/admin")
}
