"use client"

import { useState, useTransition } from "react"
import { Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveCoachSchedule } from "@/lib/actions/schedule"

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const HOURS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`) // 06:00–22:00

type DayConfig = { day: number; active: boolean; from: string; to: string }

interface Props {
  initialConfig: DayConfig[]
  initialCapacity: number
}

export function CoachScheduleConfig({ initialConfig, initialCapacity }: Props) {
  const [config, setConfig] = useState<DayConfig[]>(initialConfig)
  const [capacity, setCapacity] = useState(initialCapacity)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggleDay(day: number) {
    setConfig((prev) =>
      prev.map((d) => (d.day === day ? { ...d, active: !d.active } : d))
    )
  }

  function setFrom(day: number, from: string) {
    setConfig((prev) => prev.map((d) => (d.day === day ? { ...d, from } : d)))
  }

  function setTo(day: number, to: string) {
    setConfig((prev) => prev.map((d) => (d.day === day ? { ...d, to } : d)))
  }

  function handleSave() {
    const fd = new FormData()
    fd.set("capacity", String(capacity))
    for (const d of config) {
      if (d.active) {
        fd.set(`active_${d.day}`, "1")
        fd.set(`from_${d.day}`, d.from)
        fd.set(`to_${d.day}`, d.to)
      }
    }
    startTransition(async () => {
      await saveCoachSchedule(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Settings2 className="h-3.5 w-3.5" />
        Horario laboral
      </h3>

      <div className="rounded-xl border bg-card overflow-hidden divide-y">
        {config.map((d) => (
          <div key={d.day} className="px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium w-[76px] shrink-0">{DAY_NAMES[d.day]}</span>

            {/* Toggle */}
            <button
              role="switch"
              aria-checked={d.active}
              onClick={() => toggleDay(d.day)}
              disabled={pending}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
                "focus-visible:outline-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed",
                d.active ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                  d.active ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>

            {/* Time range */}
            {d.active && (
              <div className="flex items-center gap-1.5 flex-1">
                <select
                  value={d.from}
                  onChange={(e) => setFrom(d.day, e.target.value)}
                  disabled={pending}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
                >
                  {HOURS.slice(0, -1).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">–</span>
                <select
                  value={d.to}
                  onChange={(e) => setTo(d.day, e.target.value)}
                  disabled={pending}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
                >
                  {HOURS.slice(1).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Capacity + Save */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Capacidad por turno</span>
          <input
            type="number"
            min={1}
            max={10}
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={pending}
            className="h-9 w-16 rounded-lg border border-input bg-transparent px-2.5 text-sm text-center outline-none focus-visible:border-ring"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={pending}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
            saved
              ? "bg-emerald-100 text-emerald-700"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
            pending && "opacity-50 cursor-not-allowed",
          )}
        >
          {saved ? "Guardado ✓" : pending ? "Guardando…" : "Guardar horario"}
        </button>
      </div>
    </div>
  )
}
