"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil } from "lucide-react"
import { updateExercise } from "@/lib/actions/exercises"

interface Exercise {
  id: string
  name: string
  category: string
  description: string | null
  videoUrl: string | null
}

export function EditExerciseDialog({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await updateExercise(formData)
        setOpen(false)
      } catch {
        setError("Error al guardar los cambios.")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Editar"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ejercicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <div className="space-y-1.5">
              <Label htmlFor="ee-name">Nombre *</Label>
              <Input id="ee-name" name="name" required defaultValue={exercise.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ee-cat">Categoría *</Label>
              <select
                id="ee-cat"
                name="category"
                required
                defaultValue={exercise.category}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
              >
                <option value="strength">Fuerza</option>
                <option value="conditioning">Acondicionamiento</option>
                <option value="rehab">Rehabilitación</option>
                <option value="mobility">Movilidad</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ee-desc">Descripción</Label>
              <Textarea
                id="ee-desc"
                name="description"
                defaultValue={exercise.description ?? ""}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ee-video">URL de video</Label>
              <Input
                id="ee-video"
                name="videoUrl"
                type="url"
                defaultValue={exercise.videoUrl ?? ""}
                placeholder="https://youtube.com/..."
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
