import { db } from "@/lib/db"
import {
  bookings,
  scheduleSlots,
  students,
  pushSubscriptions,
  studentPlans,
  plans,
} from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import webpush from "web-push"
import { NextResponse } from "next/server"
import { format, addDays } from "date-fns"

export const runtime = "nodejs"

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? "admin@rheb.com"}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

type SubRow = { endpoint: string; p256dh: string; auth: string }

async function sendPush(sub: SubRow, payload: { title: string; body: string; url: string }) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 410 || status === 404) {
      // Suscripción expirada — limpiar
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint))
    }
  }
}

export async function GET(req: Request) {
  // Verificar secret de Vercel Cron
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd")
  const in3Days = format(addDays(new Date(), 3), "yyyy-MM-dd")

  // ─── 1. Recordatorios de turno ────────────────────────────────────────────
  const bookingReminders = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      startTime: scheduleSlots.startTime,
    })
    .from(bookings)
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(
      pushSubscriptions,
      and(
        eq(pushSubscriptions.userId, students.userId),
        eq(pushSubscriptions.notifyBookingReminder, true),
      ),
    )
    .innerJoin(scheduleSlots, eq(bookings.slotId, scheduleSlots.id))
    .where(and(eq(bookings.date, tomorrow), eq(bookings.status, "confirmed")))

  for (const row of bookingReminders) {
    await sendPush(row, {
      title: "Turno mañana",
      body: `Recordatorio: tenés turno mañana a las ${row.startTime} hs.`,
      url: "/student/calendario",
    })
  }

  // ─── 2. Plan por vencer en 3 días ─────────────────────────────────────────
  const planAlerts = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      planName: plans.name,
    })
    .from(studentPlans)
    .innerJoin(plans, eq(studentPlans.planId, plans.id))
    .innerJoin(students, eq(studentPlans.studentId, students.id))
    .innerJoin(
      pushSubscriptions,
      and(
        eq(pushSubscriptions.userId, students.userId),
        eq(pushSubscriptions.notifyPlanExpiry, true),
      ),
    )
    .where(and(eq(studentPlans.status, "active"), eq(studentPlans.endDate, in3Days)))

  for (const row of planAlerts) {
    await sendPush(row, {
      title: "Tu plan vence en 3 días",
      body: `El plan "${row.planName}" vence el próximo ${in3Days}. Hablá con tu coach para renovarlo.`,
      url: "/student/perfil",
    })
  }

  return NextResponse.json({
    ok: true,
    sent: { bookingReminders: bookingReminders.length, planAlerts: planAlerts.length },
  })
}
