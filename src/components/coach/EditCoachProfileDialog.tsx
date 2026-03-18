"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil } from "lucide-react"
import { updateCoachProfile } from "@/lib/actions/coach"

interface Props {
  name: string | null
  specialty: string | null
  whatsapp: string | null
  bio: string | null
}

export function EditCoachProfileDialog({ name, specialty, whatsapp, bio }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await updateCoachProfile(fd)
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
        Editar perfil
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cp-name">Nombre *</Label>
              <Input id="cp-name" name="name" required defaultValue={name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-specialty">Especialidad</Label>
              <Input id="cp-specialty" name="specialty" defaultValue={specialty ?? ""} placeholder="Fuerza, rehabilitación…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-whatsapp">WhatsApp</Label>
              <Input id="cp-whatsapp" name="whatsapp" defaultValue={whatsapp ?? ""} placeholder="+54911…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-bio">Bio</Label>
              <Textarea id="cp-bio" name="bio" defaultValue={bio ?? ""} rows={3} placeholder="Breve descripción…" />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
