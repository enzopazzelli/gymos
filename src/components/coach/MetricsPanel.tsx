"use client"

import { useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { addMetric, deleteMetric } from "@/lib/actions/metrics"
import {
  METRIC_TYPES,
  CATEGORY_LABELS,
  type MetricCategory,
} from "@/lib/metrics-config"
import type { StudentMetric } from "@/lib/queries/metrics"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  studentId: string
  metrics: StudentMetric[]
  readonly?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function painColor(v: number) {
  if (v <= 3) return "bg-emerald-100 text-emerald-700"
  if (v <= 6) return "bg-yellow-100 text-yellow-700"
  return "bg-red-100 text-red-700"
}

function symmetryColor(pct: number) {
  if (pct >= 90) return "text-emerald-600"
  if (pct >= 75) return "text-yellow-600"
  return "text-red-600"
}

function Trend({ current, prev }: { current: number; prev: number | undefined }) {
  if (prev === undefined) return null
  if (current > prev) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
  if (current < prev) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MetricsPanel({ studentId, metrics: allMetrics, readonly = false }: Props) {
  const [activeTab, setActiveTab] = useState<MetricCategory>("rom")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState("")
  const [isPending, startTransition] = useTransition()

  // Group metrics by type → { type: entry[] } newest first
  const byType = allMetrics.reduce<Record<string, StudentMetric[]>>((acc, m) => {
    ;(acc[m.type] ??= []).push(m)
    return acc
  }, {})

  // Types for current tab that have data or are predefined
  const tabTypes = METRIC_TYPES.filter((m) => m.category === activeTab)

  // Types in current tab that have at least 1 entry
  const activeTypes = tabTypes.filter((m) => byType[m.type]?.length)

  // All types available in dialog
  const dialogTypes = tabTypes

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("studentId", studentId)
    startTransition(async () => {
      await addMetric(fd)
      setDialogOpen(false)
      setSelectedType("")
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMetric(id, studentId)
    })
  }

  const today = format(new Date(), "yyyy-MM-dd")

  return (
    <div className="space-y-3">

      {/* Category tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {(["rom", "pain", "field"] as MetricCategory[]).map((cat) => {
          const count = allMetrics.filter(
            (m) => METRIC_TYPES.find((t) => t.type === m.type)?.category === cat
          ).length
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                activeTab === cat
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[cat]}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] font-bold text-primary">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === "rom" && (
        <RomView
          tabTypes={tabTypes}
          byType={byType}
          onDelete={readonly ? undefined : handleDelete}
          isPending={isPending}
        />
      )}
      {activeTab === "pain" && (
        <PainView
          tabTypes={tabTypes}
          byType={byType}
          onDelete={readonly ? undefined : handleDelete}
          isPending={isPending}
        />
      )}
      {activeTab === "field" && (
        <FieldView
          tabTypes={tabTypes}
          byType={byType}
          onDelete={readonly ? undefined : handleDelete}
          isPending={isPending}
        />
      )}

      {activeTypes.length === 0 && !dialogOpen && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin mediciones registradas para esta categoría.
        </p>
      )}

      {/* Add button */}
      {!readonly && (
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar medición
        </button>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setSelectedType("") } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva medición</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-3 mt-1">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Métrica</label>
              <select
                name="type"
                required
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar…</option>
                {(["rom", "pain", "field"] as MetricCategory[]).map((cat) => (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                    {METRIC_TYPES.filter((m) => m.category === cat).map((m) => (
                      <option key={m.type} value={m.type}>
                        {m.label} ({m.unit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Valor{selectedType
                  ? ` (${dialogTypes.find((t) => t.type === selectedType)?.unit ?? ""})`
                  : ""}
              </label>
              <input
                name="value"
                type="number"
                step="0.1"
                min="0"
                required
                placeholder="0"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fecha</label>
              <input
                name="recordedAt"
                type="date"
                defaultValue={today}
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notas (opcional)</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Observaciones…"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); setSelectedType("") }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ROM view ─────────────────────────────────────────────────────────────────

function RomView({
  tabTypes, byType, onDelete, isPending,
}: {
  tabTypes: typeof METRIC_TYPES
  byType: Record<string, StudentMetric[]>
  onDelete?: (id: string) => void
  isPending: boolean
}) {
  // Group into joint pairs: rodilla, cadera, tobillo, hombro
  const joints = [
    { key: "rodilla", label: "Rodilla", izq: "ROM_rodilla_izq", der: "ROM_rodilla_der" },
    { key: "cadera",  label: "Cadera",  izq: "ROM_cadera_izq",  der: "ROM_cadera_der"  },
    { key: "tobillo", label: "Tobillo", izq: "ROM_tobillo_izq",  der: "ROM_tobillo_der"  },
    { key: "hombro",  label: "Hombro",  izq: "ROM_hombro_izq",  der: "ROM_hombro_der"  },
  ]

  const hasAny = joints.some((j) => byType[j.izq]?.length || byType[j.der]?.length)
  if (!hasAny) return null

  return (
    <div className="space-y-3">
      {joints.map(({ key, label, izq, der }) => {
        const izqEntries = byType[izq] ?? []
        const derEntries = byType[der] ?? []
        if (!izqEntries.length && !derEntries.length) return null

        const latestIzq = izqEntries[0]
        const latestDer = derEntries[0]
        const prevIzq   = izqEntries[1]
        const prevDer   = derEntries[1]

        const izqVal = latestIzq ? parseFloat(latestIzq.value) : null
        const derVal = latestDer ? parseFloat(latestDer.value) : null

        let symmetry: number | null = null
        if (izqVal !== null && derVal !== null && Math.max(izqVal, derVal) > 0) {
          symmetry = Math.round((Math.min(izqVal, derVal) / Math.max(izqVal, derVal)) * 100)
        }

        return (
          <div key={key} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              {symmetry !== null && (
                <span className={cn("text-xs font-bold", symmetryColor(symmetry))}>
                  Simetría {symmetry}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { entries: izqEntries, latest: latestIzq, prev: prevIzq, side: "Izq" },
                { entries: derEntries, latest: latestDer, prev: prevDer, side: "Der" },
              ].map(({ entries, latest, prev, side }) => (
                <div key={side}>
                  <p className="text-[10px] text-muted-foreground mb-1">{side}</p>
                  {latest ? (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-black">{parseFloat(latest.value)}</span>
                        <span className="text-xs text-muted-foreground">°</span>
                        <Trend
                          current={parseFloat(latest.value)}
                          prev={prev ? parseFloat(prev.value) : undefined}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(parseISO(latest.recordedAt), "d MMM", { locale: es })}
                      </p>
                      {entries.slice(0, 3).length > 1 && (
                        <div className="mt-2 space-y-1">
                          {entries.slice(0, 4).map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-1">
                              <span className="text-[10px] text-muted-foreground">
                                {format(parseISO(e.recordedAt), "d/MM", { locale: es })} — {parseFloat(e.value)}°
                              </span>
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(e.id)}
                                  disabled={isPending}
                                  className="text-muted-foreground/40 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">—</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Pain view ────────────────────────────────────────────────────────────────

function PainView({
  tabTypes, byType, onDelete, isPending,
}: {
  tabTypes: typeof METRIC_TYPES
  byType: Record<string, StudentMetric[]>
  onDelete?: (id: string) => void
  isPending: boolean
}) {
  const painTypes = tabTypes.filter((t) => byType[t.type]?.length)
  if (!painTypes.length) return null

  return (
    <div className="space-y-2">
      {painTypes.map((t) => {
        const entries = byType[t.type]!
        const latest  = entries[0]
        const prev    = entries[1]
        const val     = parseFloat(latest.value)

        return (
          <div key={t.type} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{t.label}</p>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", painColor(val))}>
                    {val}/10
                  </span>
                  <Trend current={val} prev={prev ? parseFloat(prev.value) : undefined} />
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(latest.recordedAt), "d MMM", { locale: es })}
                  </span>
                </div>
              </div>
            </div>

            {entries.length > 1 && (
              <div className="mt-3 space-y-1 border-t pt-2">
                {entries.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(e.recordedAt), "d/MM", { locale: es })} — {parseFloat(e.value)}/10
                    </span>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(e.id)}
                        disabled={isPending}
                        className="text-muted-foreground/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field tests view ─────────────────────────────────────────────────────────

function FieldView({
  tabTypes, byType, onDelete, isPending,
}: {
  tabTypes: typeof METRIC_TYPES
  byType: Record<string, StudentMetric[]>
  onDelete?: (id: string) => void
  isPending: boolean
}) {
  const fieldTypes = tabTypes.filter((t) => byType[t.type]?.length)
  if (!fieldTypes.length) return null

  return (
    <div className="space-y-2">
      {fieldTypes.map((t) => {
        const entries = byType[t.type]!
        const latest  = entries[0]
        const prev    = entries[1]
        const val     = parseFloat(latest.value)

        return (
          <div key={t.type} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xl font-black">{val}</span>
                  <span className="text-xs text-muted-foreground">{t.unit}</span>
                  <Trend current={val} prev={prev ? parseFloat(prev.value) : undefined} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">
                {format(parseISO(latest.recordedAt), "d MMM yyyy", { locale: es })}
              </p>
            </div>

            {entries.length > 1 && (
              <div className="mt-3 space-y-1 border-t pt-2">
                {entries.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(e.recordedAt), "d/MM/yy", { locale: es })} — {parseFloat(e.value)} {t.unit}
                    </span>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(e.id)}
                        disabled={isPending}
                        className="text-muted-foreground/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
