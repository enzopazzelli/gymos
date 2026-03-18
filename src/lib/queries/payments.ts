import { db } from "@/lib/db"
import { payments, users } from "@/lib/db/schema"
import { eq, desc, inArray } from "drizzle-orm"

export async function getStudentPayments(studentId: string, limit = 12) {
  return db
    .select({
      id: payments.id,
      amount: payments.amount,
      paidAt: payments.paidAt,
      periodCovered: payments.periodCovered,
      method: payments.method,
      notes: payments.notes,
      registeredByName: users.name,
    })
    .from(payments)
    .leftJoin(users, eq(payments.registeredBy, users.id))
    .where(eq(payments.studentId, studentId))
    .orderBy(desc(payments.paidAt))
    .limit(limit)
}

export type StudentPayment = Awaited<ReturnType<typeof getStudentPayments>>[number]

/** Batch: devuelve todos los pagos de una lista de alumnos, agrupados por studentId */
export async function getPaymentsByStudentIds(studentIds: string[]) {
  if (!studentIds.length) return {} as Record<string, StudentPayment[]>

  const rows = await db
    .select({
      id: payments.id,
      studentId: payments.studentId,
      amount: payments.amount,
      paidAt: payments.paidAt,
      periodCovered: payments.periodCovered,
      method: payments.method,
      notes: payments.notes,
      registeredByName: users.name,
    })
    .from(payments)
    .leftJoin(users, eq(payments.registeredBy, users.id))
    .where(inArray(payments.studentId, studentIds))
    .orderBy(desc(payments.paidAt))

  const map: Record<string, StudentPayment[]> = {}
  for (const row of rows) {
    ;(map[row.studentId] ??= []).push(row)
  }
  return map
}
