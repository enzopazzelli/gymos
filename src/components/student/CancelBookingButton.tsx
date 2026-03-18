"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cancelBooking } from "@/lib/actions/booking"

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    if (loading) return
    setLoading(true)
    await cancelBooking(bookingId)
    setLoading(false)
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCancel}
      disabled={loading}
      className="h-9 px-3 gap-1.5 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
    >
      <X className="h-3.5 w-3.5" />
      No voy
    </Button>
  )
}
