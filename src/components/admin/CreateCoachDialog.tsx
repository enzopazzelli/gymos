"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createCoach } from "@/lib/actions/admin"

export function CreateCoachDialog() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await createCoach(formData)
        setOpen(false)
      } catch {
        setError("Error al crear el coach. Intentá de nuevo.")
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Nuevo coach
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo coach</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email *</Label>
              <Input id="c-email" name="email" type="email" required placeholder="coach@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nombre *</Label>
              <Input id="c-name" name="name" required placeholder="Juan García" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-specialty">Especialidad</Label>
              <Input id="c-specialty" name="specialty" placeholder="Fuerza y acondicionamiento" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-whatsapp">WhatsApp</Label>
              <Input id="c-whatsapp" name="whatsapp" placeholder="+5491112345678" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-password">Contraseña *</Label>
              <Input id="c-password" name="password" type="password" required placeholder="Mínimo 6 caracteres" />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Creando..." : "Crear coach"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
