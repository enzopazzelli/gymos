"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createStudentAsCoach } from "@/lib/actions/admin"
import { format, addMonths } from "date-fns"

interface Plan {
  id: string
  name: string
  daysPerWeek: number
  price: string
}

interface Props {
  plans: Plan[]
}

export function CreateStudentDialog({ plans }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [planId, setPlanId] = useState("")
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))

  const endDate = format(addMonths(new Date(startDate), 1), "yyyy-MM-dd")

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (planId) fd.set("endDate", endDate)
    setError(null)
    startTransition(async () => {
      try {
        await createStudentAsCoach(fd)
        setOpen(false)
        setPlanId("")
        setStartDate(format(new Date(), "yyyy-MM-dd"))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al crear el alumno.")
      }
    })
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setPlanId("")
      setStartDate(format(new Date(), "yyyy-MM-dd"))
      setError(null)
    }
    setOpen(v)
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Nuevo alumno
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo alumno</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* Datos personales */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Datos personales
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="cs-name">Nombre *</Label>
                <Input id="cs-name" name="name" required placeholder="María López" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-email">Email *</Label>
                <Input id="cs-email" name="email" type="email" required placeholder="alumno@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-password">Contraseña *</Label>
                <Input
                  id="cs-password"
                  name="password"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* Detalles */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Detalles
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cs-sport">Deporte / actividad</Label>
                  <Input id="cs-sport" name="sport" placeholder="Fútbol, crossfit…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cs-whatsapp">WhatsApp</Label>
                  <Input id="cs-whatsapp" name="whatsapp" placeholder="+54911…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-start">Fecha de inicio</Label>
                <Input
                  id="cs-start"
                  name="startDate"
                  type="date"
                  defaultValue={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* Plan */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plan{" "}
                <span className="normal-case font-normal text-muted-foreground/70">
                  (opcional)
                </span>
              </p>

              {plans.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No hay planes disponibles todavía.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cs-plan">Plan</Label>
                    <select
                      id="cs-plan"
                      name="planId"
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                    >
                      <option value="">Sin plan por ahora</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.daysPerWeek}d/sem — ${Number(p.price).toLocaleString("es-AR")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {planId && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cs-plan-start">Inicio del plan</Label>
                        <Input
                          id="cs-plan-start"
                          name="planStartDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Vencimiento (auto)</Label>
                        <Input value={endDate} readOnly className="opacity-60 cursor-default" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Creando…" : "Crear alumno"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
