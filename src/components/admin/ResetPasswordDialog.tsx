"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound } from "lucide-react"
import { resetUserPassword } from "@/lib/actions/admin"

interface Props {
  userId: string
  userName: string | null
}

export function ResetPasswordDialog({ userId, userName }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await resetUserPassword(formData)
        setSuccess(true)
        setTimeout(() => setOpen(false), 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cambiar la contraseña")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSuccess(false); setError(null) }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Cambiar contraseña"
      >
        <KeyRound className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">{userName}</p>

          <form onSubmit={handleSubmit} className="space-y-3 mt-1">
            <input type="hidden" name="userId" value={userId} />
            <div className="space-y-1.5">
              <Label htmlFor="rp-password">Nueva contraseña *</Label>
              <Input id="rp-password" name="password" type="password" required placeholder="Mínimo 6 caracteres" />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-green-600">Contraseña actualizada ✓</p>}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
