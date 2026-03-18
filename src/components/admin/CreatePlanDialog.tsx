"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createPlan } from "@/lib/actions/admin"

export function CreatePlanDialog() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await createPlan(formData)
        setOpen(false)
      } catch {
        setError("Error al crear el plan. Intentá de nuevo.")
      }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Nuevo plan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo plan</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nombre *</Label>
              <Input id="p-name" name="name" required placeholder='Plan 3 días' />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-days">Días por semana *</Label>
              <Input id="p-days" name="daysPerWeek" type="number" required min={1} max={7} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Precio *</Label>
              <Input id="p-price" name="price" type="number" required min={0} step="0.01" placeholder="25000" />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Creando..." : "Crear plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
