import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// POST — crear o actualizar suscripción + preferencias
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { subscription, bookingReminder, planExpiry } = await req.json()
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      notifyBookingReminder: bookingReminder ?? false,
      notifyPlanExpiry: planExpiry ?? false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.userId,
      set: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        notifyBookingReminder: bookingReminder ?? false,
        notifyPlanExpiry: planExpiry ?? false,
        updatedAt: new Date(),
      },
    })

  return NextResponse.json({ ok: true })
}

// PATCH — solo actualizar preferencias (ya hay suscripción)
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingReminder, planExpiry } = await req.json()

  await db
    .update(pushSubscriptions)
    .set({ notifyBookingReminder: bookingReminder, notifyPlanExpiry: planExpiry, updatedAt: new Date() })
    .where(eq(pushSubscriptions.userId, session.user.id))

  return NextResponse.json({ ok: true })
}

// DELETE — eliminar suscripción
export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, session.user.id))

  return NextResponse.json({ ok: true })
}
