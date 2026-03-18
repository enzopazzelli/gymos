"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign, Trash2 } from "lucide-react"
import { addPayment, deletePayment } from "@/lib/actions/payments"
import type { StudentPayment } from "@/lib/queries/payments"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const METHOD_LABELS: Record<string, string> = {
  cash:     "Efectivo",
  transfer: "Transferencia",
  card:     "Tarjeta",
  other:    "Otro",
}

interface Props {
  studentId: string
  studentName: string | null
  payments: StudentPayment[]
}

export function AddPaymentDialog({ studentId, studentName, payments }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("studentId", studentId)
    setError(null)
    startTransition(async () => {
      try {
        await addPayment(fd)
        ;(e.target as HTMLFormElement).reset()
      } catch {
        setError("Error al registrar el pago.")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePayment(id, studentId)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
      >
        <DollarSign className="h-2.5 w-2.5" />
        Pago
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar pago — {studentName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pay-amount">Monto ($) *</Label>
                  <Input
                    id="pay-amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="15000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pay-method">Método *</Label>
                  <select
                    id="pay-method"
                    name="method"
                    required
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                  >
                    {Object.entries(METHOD_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-period">Período cubierto</Label>
                <Input
                  id="pay-period"
                  name="periodCovered"
                  placeholder={format(new Date(), "MMMM yyyy")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-notes">Notas</Label>
                <Input id="pay-notes" name="notes" placeholder="Opcional…" />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Registrando…" : "Registrar pago"}
              </Button>
            </form>

            {/* History */}
            {payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Historial
                </p>
                <div className="divide-y rounded-xl border bg-card overflow-hidden">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2.5 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          ${Number(p.amount).toLocaleString("es-AR")}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            {METHOD_LABELS[p.method]}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(p.paidAt), "d MMM yyyy", { locale: es })}
                          {p.periodCovered && ` · ${p.periodCovered}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={pending}
                        className="text-muted-foreground/40 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Sin pagos registrados aún.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
