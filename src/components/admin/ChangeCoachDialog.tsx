"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { changeStudentCoach } from "@/lib/actions/admin"
import { UserCog } from "lucide-react"

interface Coach {
  id: string
  name: string | null
}

interface Props {
  studentId: string
  studentName: string | null
  currentCoachId: string | null
  coaches: Coach[]
}

export function ChangeCoachDialog({ studentId, studentName, currentCoachId, coaches }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("studentId", studentId)
    startTransition(async () => {
      await changeStudentCoach(fd)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        <UserCog className="h-2.5 w-2.5" />
        Coach
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar coach — {studentName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <select
              name="coachId"
              defaultValue={currentCoachId ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">Sin coach</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
