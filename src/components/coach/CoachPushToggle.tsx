"use client"

import { useState, useEffect, useTransition } from "react"
import { Bell, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)))
}

export function CoachPushToggle({ initialSubscribed }: { initialSubscribed: boolean }) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [supported, setSupported] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ok =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    setSupported(ok)
    if ("Notification" in window) {
      setPermissionDenied(Notification.permission === "denied")
    }
  }, [])

  function handleToggle(value: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        if (value) {
          if (Notification.permission !== "granted") {
            const result = await Notification.requestPermission()
            if (result !== "granted") {
              setPermissionDenied(result === "denied")
              setError("Habilitá los permisos de notificaciones en tu navegador.")
              return
            }
          }
          const reg = await navigator.serviceWorker.ready
          const existing = await reg.pushManager.getSubscription()
          const sub = existing ?? await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
          })
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: sub.toJSON(),
              bookingReminder: true,
              planExpiry: false,
            }),
          })
        } else {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          await sub?.unsubscribe()
          await fetch("/api/push/subscribe", { method: "DELETE" })
        }
        setSubscribed(value)
      } catch {
        setError("Error al configurar notificaciones.")
      }
    })
  }

  if (!supported) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notificaciones
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Cancelaciones de turnos</p>
            <p className="text-xs text-muted-foreground">Aviso cuando un alumno cancela</p>
          </div>
          <button
            role="switch"
            aria-checked={subscribed}
            disabled={pending || permissionDenied}
            onClick={() => handleToggle(!subscribed)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
              "focus-visible:outline-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed",
              subscribed ? "bg-primary" : "bg-input",
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
              subscribed ? "translate-x-5" : "translate-x-0",
            )} />
          </button>
        </div>
      </div>

      {permissionDenied && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <BellOff className="h-3 w-3" />
          Notificaciones bloqueadas en este dispositivo.
        </p>
      )}
      {error && !permissionDenied && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
