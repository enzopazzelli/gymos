"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { markAttendance } from "@/lib/actions/attendance"

interface Props {
  bookingId: string
  initialPresent: boolean | null
}

export function AttendanceButton({ bookingId, initialPresent }: Props) {
  const [present, setPresent] = useState<boolean | null>(initialPresent)
  const [loading, setLoading] = useState(false)

  async function toggle(value: boolean) {
    if (loading) return
    setLoading(true)
    await markAttendance(bookingId, value)
    setPresent(value)
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => toggle(true)}
        disabled={loading}
        className={cn(
          "h-9 px-3 gap-1.5 transition-colors",
          present === true && "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 hover:border-emerald-600"
        )}
      >
        <Check className="h-3.5 w-3.5" />
        Presente
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => toggle(false)}
        disabled={loading}
        className={cn(
          "h-9 px-3 gap-1.5 transition-colors",
          present === false && "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600"
        )}
      >
        <X className="h-3.5 w-3.5" />
        Ausente
      </Button>
    </div>
  )
}
