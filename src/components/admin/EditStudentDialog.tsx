"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil } from "lucide-react"
import { updateStudent } from "@/lib/actions/admin"

interface Props {
  studentId: string
  name: string | null
  email: string | null
  sport: string | null
  whatsapp: string | null
  objectives: string | null
  injuryHistory: string | null
}

export function EditStudentDialog({ studentId, name, email, sport, whatsapp, objectives, injuryHistory }: Props) {
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
        await updateStudent(fd)
        setOpen(false)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar datos del alumno</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="es-name">Nombre completo *</Label>
                <Input id="es-name" name="name" required defaultValue={name ?? ""} placeholder="María López" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="es-email">Email *</Label>
                <Input id="es-email" name="email" type="email" required defaultValue={email ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="es-sport">Deporte / actividad</Label>
                <Input id="es-sport" name="sport" defaultValue={sport ?? ""} placeholder="Fútbol, crossfit…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="es-whatsapp">WhatsApp</Label>
                <Input id="es-whatsapp" name="whatsapp" defaultValue={whatsapp ?? ""} placeholder="+54911…" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-objectives">Objetivos</Label>
              <Textarea
                id="es-objectives"
                name="objectives"
                defaultValue={objectives ?? ""}
                placeholder="Ganar masa muscular, mejorar rendimiento…"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="es-injury">Antecedentes / lesiones</Label>
              <Textarea
                id="es-injury"
                name="injuryHistory"
                defaultValue={injuryHistory ?? ""}
                placeholder="Lesión de rodilla 2022…"
                rows={2}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
