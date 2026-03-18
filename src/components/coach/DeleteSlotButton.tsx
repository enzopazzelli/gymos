"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteSlot } from "@/lib/actions/schedule"

export function DeleteSlotButton({ slotId }: { slotId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteSlot(slotId))}
      disabled={pending}
      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      title="Eliminar turno"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
