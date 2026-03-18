"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { createExercise } from "@/lib/actions/exercises"

export function CreateExerciseDialog() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await createExercise(formData)
        setOpen(false)
      } catch {
        setError("Error al crear el ejercicio.")
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Nuevo ejercicio
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo ejercicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ex-name">Nombre *</Label>
              <Input id="ex-name" name="name" required placeholder="Ej: Sentadilla trasera" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-cat">Categoría *</Label>
              <select
                id="ex-cat"
                name="category"
                required
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
              >
                <option value="strength">Fuerza</option>
                <option value="conditioning">Acondicionamiento</option>
                <option value="rehab">Rehabilitación</option>
                <option value="mobility">Movilidad</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-desc">Descripción</Label>
              <Textarea id="ex-desc" name="description" placeholder="Indicaciones, músculos trabajados..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-video">URL de video</Label>
              <Input id="ex-video" name="videoUrl" type="url" placeholder="https://youtube.com/..." />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Creando..." : "Crear ejercicio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
