"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { assignPlan } from "@/lib/actions/admin"
import { format, addMonths } from "date-fns"

interface Plan {
  id: string
  name: string
  price: string
  daysPerWeek: number
}

interface Props {
  studentId: string
  studentName: string | null
  plans: Plan[]
}

const METHOD_LABELS: Record<string, string> = {
  cash:     "Efectivo",
  transfer: "Transferencia",
  card:     "Tarjeta",
  other:    "Otro",
}

export function AssignPlanDialog({ studentId, studentName, plans }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [withPayment, setWithPayment] = useState(true)

  const endDate = format(addMonths(new Date(startDate), 1), "yyyy-MM-dd")

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("studentId", studentId)
    fd.set("endDate", endDate)
    if (!withPayment) {
      fd.delete("paymentAmount")
      fd.delete("paymentMethod")
      fd.delete("paymentPeriod")
    }
    setError(null)
    startTransition(async () => {
      try {
        await assignPlan(fd)
        setOpen(false)
      } catch {
        setError("Error al asignar el plan. Intentá de nuevo.")
      }
    })
  }

  function handleOpenChange(v: boolean) {
    if (!v) { setError(null); setWithPayment(true) }
    setOpen(v)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {plans.length === 0 ? "—" : "Renovar plan"}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renovar plan — {studentName}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* ── Plan ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</p>
              <div className="space-y-1.5">
                <Label htmlFor="ap-plan">Plan *</Label>
                <select
                  id="ap-plan"
                  name="planId"
                  required
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  <option value="">Seleccioná un plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.daysPerWeek}d/sem — ${Number(p.price).toLocaleString("es-AR")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ap-start">Inicio *</Label>
                  <Input
                    id="ap-start"
                    name="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimiento (auto)</Label>
                  <Input value={endDate} readOnly className="opacity-60 cursor-default" />
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* ── Pago ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pago</p>
                <button
                  type="button"
                  onClick={() => setWithPayment((v) => !v)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    withPayment
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {withPayment ? "Incluir pago ✓" : "Sin pago"}
                </button>
              </div>

              {withPayment && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-amount">Monto ($) *</Label>
                      <Input
                        id="ap-amount"
                        name="paymentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        required={withPayment}
                        placeholder="15000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-method">Método *</Label>
                      <select
                        id="ap-method"
                        name="paymentMethod"
                        required={withPayment}
                        className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                      >
                        {Object.entries(METHOD_LABELS).map(([val, lbl]) => (
                          <option key={val} value={val}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ap-period">Período cubierto</Label>
                    <Input
                      id="ap-period"
                      name="paymentPeriod"
                      placeholder="Ej: Abril 2026"
                      defaultValue={format(new Date(startDate), "MMMM yyyy")}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={pending || plans.length === 0} className="w-full">
                {pending ? "Guardando…" : withPayment ? "Renovar y registrar pago" : "Renovar plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
