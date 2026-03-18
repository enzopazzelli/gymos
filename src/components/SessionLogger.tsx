"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { saveExerciseSets, completeSession } from "@/lib/actions/sessions"
import { useRouter } from "next/navigation"

type SetRow = { weight: string; reps: string }

type ExerciseLog = {
  id: string
  exerciseId: string
  exerciseName: string
  exerciseCategory: string
  sets: SetRow[]
  order: number
  prevPerformance: string | null
}

type Block = { id: string; name: string; exercises: ExerciseLog[] }

interface Props {
  sessionId: string
  studentName: string
  blocks: Block[]
  backHref: string
  role: "coach" | "student"
  startedAt: string
}

function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const label = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`

  return <span className="text-sm font-mono font-semibold tabular-nums text-primary">{label}</span>
}

const CATEGORY_LABELS: Record<string, string> = {
  strength: "Fuerza",
  conditioning: "Acond.",
  rehab: "Rehab.",
  mobility: "Movilidad",
}

export function SessionLogger({ sessionId, studentName, blocks: initialBlocks, backHref, role, startedAt }: Props) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [coachNotes, setCoachNotes] = useState("")
  const [completing, startComplete] = useTransition()
  const [saving, startSave] = useTransition()
  const [done, setDone] = useState(false)
  const router = useRouter()

  const [inputs, setInputs] = useState<Record<string, { weight: string; reps: string }>>(() => {
    const map: Record<string, { weight: string; reps: string }> = {}
    for (const block of initialBlocks) {
      for (const ex of block.exercises) {
        const last = ex.sets[ex.sets.length - 1]
        map[ex.exerciseId] = last ? { weight: last.weight, reps: last.reps } : { weight: "", reps: "" }
      }
    }
    return map
  })

  function getInput(exerciseId: string) {
    return inputs[exerciseId] ?? { weight: "", reps: "" }
  }

  function setInput(exerciseId: string, field: "weight" | "reps", value: string) {
    setInputs((prev) => ({ ...prev, [exerciseId]: { ...getInput(exerciseId), [field]: value } }))
  }

  function addSet(blockIdx: number, exIdx: number) {
    const ex = blocks[blockIdx].exercises[exIdx]
    const { weight, reps } = getInput(ex.exerciseId)
    if (!reps.trim()) return

    const newSets = [...ex.sets, { weight, reps }]
    setBlocks((prev) =>
      prev.map((b, bi) =>
        bi !== blockIdx ? b : {
          ...b,
          exercises: b.exercises.map((e, ei) => ei !== exIdx ? e : { ...e, sets: newSets }),
        }
      )
    )

    const dbSets = newSets.map((s, i) => ({
      set: i + 1,
      weight: s.weight ? parseFloat(s.weight) : null,
      reps: s.reps,
    }))
    startSave(() => saveExerciseSets(sessionId, ex.exerciseId, ex.order, dbSets))
  }

  function removeSet(blockIdx: number, exIdx: number, setIdx: number) {
    const ex = blocks[blockIdx].exercises[exIdx]
    const newSets = ex.sets.filter((_, i) => i !== setIdx)
    setBlocks((prev) =>
      prev.map((b, bi) =>
        bi !== blockIdx ? b : {
          ...b,
          exercises: b.exercises.map((e, ei) => ei !== exIdx ? e : { ...e, sets: newSets }),
        }
      )
    )
    const dbSets = newSets.map((s, i) => ({
      set: i + 1,
      weight: s.weight ? parseFloat(s.weight) : null,
      reps: s.reps,
    }))
    startSave(() => saveExerciseSets(sessionId, ex.exerciseId, ex.order, dbSets))
  }

  function handleComplete() {
    startComplete(async () => {
      await completeSession(sessionId, role === "coach" ? coachNotes || undefined : undefined)
      setDone(true)
      router.push(backHref)
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="font-bold text-xl">¡Sesión completada!</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Link href={backHref} className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Sesión</h2>
          <p className="text-sm text-muted-foreground">{studentName}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <SessionTimer startedAt={startedAt} />
          {saving && <span className="text-[10px] text-muted-foreground">Guardando...</span>}
        </div>
      </div>

      {/* Blocks */}
      {blocks.map((block, blockIdx) => (
        <div key={block.id} className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{block.name}</h3>

          {block.exercises.map((ex, exIdx) => {
            const { weight, reps } = getInput(ex.exerciseId)
            return (
              <div key={ex.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
                  <p className="font-semibold text-sm">{ex.exerciseName}</p>
                  <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[ex.exerciseCategory] ?? ex.exerciseCategory}</span>
                </div>

                {ex.prevPerformance && (
                  <p className="px-4 pt-2.5 text-xs text-muted-foreground">
                    Última vez: <span className="font-medium text-foreground">{ex.prevPerformance}</span>
                  </p>
                )}

                {ex.sets.length > 0 && (
                  <div className="px-4 pt-2 space-y-1">
                    {ex.sets.map((s, si) => (
                      <div key={si} className="flex items-center gap-3 py-1">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">S{si + 1}</span>
                        <span className="flex-1 text-sm font-medium">
                          {s.weight ? `${s.weight} kg` : "—"}
                          <span className="text-muted-foreground font-normal"> × {s.reps}</span>
                        </span>
                        <button
                          onClick={() => removeSet(blockIdx, exIdx, si)}
                          disabled={saving}
                          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">S{ex.sets.length + 1}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={weight}
                    onChange={(e) => setInput(ex.exerciseId, "weight", e.target.value)}
                    className="h-10 w-20 text-center text-base"
                  />
                  <span className="text-muted-foreground font-medium">×</span>
                  <Input
                    inputMode="numeric"
                    placeholder="reps"
                    value={reps}
                    onChange={(e) => setInput(ex.exerciseId, "reps", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSet(blockIdx, exIdx)}
                    className="h-10 w-20 text-center text-base"
                  />
                  <Button
                    onClick={() => addSet(blockIdx, exIdx)}
                    disabled={saving || !reps.trim()}
                    size="sm"
                    className="h-10 w-10 p-0 shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {role === "coach" && (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium">Notas de la sesión</p>
          <Textarea
            placeholder="Observaciones, correcciones técnicas, feedback..."
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            rows={3}
          />
        </div>
      )}

      <Button onClick={handleComplete} disabled={completing} className="w-full h-12 text-base font-semibold">
        <Check className="h-5 w-5 mr-2" />
        {completing ? "Guardando..." : "Completar sesión"}
      </Button>
    </div>
  )
}
