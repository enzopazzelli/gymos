"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { saveWellnessLog } from "@/lib/actions/wellness"
import { cn } from "@/lib/utils"
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

interface TodayLog {
  sleep: number | null
  fatigue: number | null
  mood: number | null
  pain: number | null
  notes: string | null
}

interface Props {
  todayLog: TodayLog | null
}

const SLEEP_LABELS  = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"]
const FATIGUE_LABELS = ["", "Nada", "Poca", "Moderada", "Alta", "Agotado"]
const MOOD_LABELS   = ["", "Muy bajo", "Bajo", "Regular", "Bueno", "Excelente"]

function RatingRow({
  label, name, max, value, onChange, labels,
}: {
  label: string; name: string; max: number; value: number | null
  onChange: (v: number | null) => void; labels?: string[]
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {value !== null && labels && (
          <span className="text-xs text-muted-foreground">{labels[value]}</span>
        )}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? null : n)}
            className={cn(
              "flex-1 h-10 rounded-lg text-sm font-bold transition-colors",
              n <= (value ?? 0)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function PainRow({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const PAIN_COLORS = [
    "bg-emerald-500", "bg-emerald-400", "bg-lime-400", "bg-yellow-300",
    "bg-yellow-400", "bg-orange-400", "bg-orange-500", "bg-red-400",
    "bg-red-500", "bg-red-600", "bg-red-700",
  ]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Dolor</span>
        {value !== null && (
          <span className="text-xs text-muted-foreground">
            {value === 0 ? "Sin dolor" : value <= 3 ? "Leve" : value <= 6 ? "Moderado" : "Intenso"}
          </span>
        )}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? null : n)}
            className={cn(
              "flex-1 h-10 rounded-lg text-xs font-bold transition-all",
              value === n
                ? `${PAIN_COLORS[n]} text-white scale-110 shadow`
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function WellnessCheckIn({ todayLog }: Props) {
  const [expanded, setExpanded] = useState(!todayLog)
  const [sleep,   setSleep]   = useState<number | null>(todayLog?.sleep   ?? null)
  const [fatigue, setFatigue] = useState<number | null>(todayLog?.fatigue ?? null)
  const [mood,    setMood]    = useState<number | null>(todayLog?.mood    ?? null)
  const [pain,    setPain]    = useState<number | null>(todayLog?.pain    ?? null)
  const [notes,   setNotes]   = useState(todayLog?.notes ?? "")
  const [saved,   setSaved]   = useState(!!todayLog)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    const fd = new FormData()
    if (sleep   !== null) fd.set("sleep",   String(sleep))
    if (fatigue !== null) fd.set("fatigue", String(fatigue))
    if (mood    !== null) fd.set("mood",    String(mood))
    if (pain    !== null) fd.set("pain",    String(pain))
    if (notes.trim())     fd.set("notes",   notes.trim())

    startTransition(async () => {
      await saveWellnessLog(fd)
      setSaved(true)
      setExpanded(false)
    })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {saved ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
          )}
          <span className="text-sm font-semibold">
            {saved ? "Check-in de hoy registrado" : "¿Cómo te sentís hoy?"}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {saved && !expanded && (
        <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
          {sleep   !== null && <span>😴 {sleep}/5</span>}
          {fatigue !== null && <span>🏃 {fatigue}/5</span>}
          {mood    !== null && <span>😊 {mood}/5</span>}
          {pain    !== null && <span>🩺 {pain}/10</span>}
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          <RatingRow label="Sueño"  name="sleep"   max={5} value={sleep}   onChange={setSleep}   labels={SLEEP_LABELS}  />
          <RatingRow label="Fatiga" name="fatigue" max={5} value={fatigue} onChange={setFatigue} labels={FATIGUE_LABELS} />
          <RatingRow label="Humor"  name="mood"    max={5} value={mood}    onChange={setMood}    labels={MOOD_LABELS}   />
          <PainRow value={pain} onChange={setPain} />

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Notas</span>
            <Textarea
              placeholder="¿Algo particular hoy? (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} disabled={pending} className="w-full">
            {pending ? "Guardando..." : saved ? "Actualizar" : "Registrar"}
          </Button>
        </div>
      )}
    </div>
  )
}
