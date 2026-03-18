"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createStudent } from "@/lib/actions/admin"
import { format, addMonths } from "date-fns"

interface Coach {
  id: string
  name: string | null
}

interface Plan {
  id: string
  name: string
  daysPerWeek: number
  price: string
}

interface Props {
  coaches: Coach[]
  plans: Plan[]
}

export function CreateStudentDialog({ coaches, plans }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [planId, setPlanId] = useState("")

  const endDate = format(addMonths(new Date(startDate), 1), "yyyy-MM-dd")

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (planId) formData.set("endDate", endDate)
    setError(null)
    startTransition(async () => {
      try {
        await createStudent(formData)
        setOpen(false)
        setPlanId("")
        setStartDate(format(new Date(), "yyyy-MM-dd"))
      } catch {
        setError("Error al crear el alumno. Revisá los datos e intentá de nuevo.")
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

            {/* ── Datos personales ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Datos personales
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Nombre *</Label>
                <Input id="s-name" name="name" required placeholder="María López" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email *</Label>
                <Input id="s-email" name="email" type="email" required placeholder="alumno@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-password">Contraseña *</Label>
                <Input
                  id="s-password"
                  name="password"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* ── Asignación ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Asignación
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="s-coach">Coach</Label>
                <select
                  id="s-coach"
                  name="coachId"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  <option value="">Sin asignar</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-sport">Deporte / actividad</Label>
                  <Input id="s-sport" name="sport" placeholder="Fútbol, crossfit…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-start-date">Fecha de inicio</Label>
                  <Input
                    id="s-start-date"
                    name="startDate"
                    type="date"
                    defaultValue={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* ── Plan ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plan <span className="normal-case font-normal text-muted-foreground/70">(opcional, podés asignarlo después)</span>
              </p>

              {plans.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No hay planes disponibles. Creá uno primero desde el botón "Nuevo plan".
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-plan">Plan</Label>
                    <select
                      id="s-plan"
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
                        <Label htmlFor="s-plan-start">Inicio del plan</Label>
                        <Input
                          id="s-plan-start"
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
