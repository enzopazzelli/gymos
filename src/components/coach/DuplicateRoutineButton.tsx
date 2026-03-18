"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy } from "lucide-react"
import { duplicateRoutine } from "@/lib/actions/routines"

export function DuplicateRoutineButton({ routineId }: { routineId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    startTransition(async () => {
      const newId = await duplicateRoutine(routineId)
      router.push(`/coach/rutinas/${newId}`)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title="Duplicar rutina"
      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
    >
      <Copy className="h-4 w-4" />
    </button>
  )
}
