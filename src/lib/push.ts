import webpush from "web-push"
import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@gymos.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

/**
 * Sends a push notification to a user by their userId.
 * Silently skips if: no VAPID keys configured, no subscription found.
 * Cleans up expired/invalid subscriptions automatically.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/"
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const [sub] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1)

  if (!sub) return

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body, url })
    )
  } catch {
    // Subscription expired or invalid — clean up so we don't retry
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
  }
}
