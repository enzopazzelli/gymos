"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { LogOut } from "lucide-react"
import { signOutAction } from "@/lib/actions/auth"
import { useState } from "react"

interface Props {
  name: string | null | undefined
  email: string | null | undefined
  image: string | null | undefined
  initials: string
}

export function UserMenu({ name, email, image, initials }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={image ?? undefined} />
          <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
      </button>

      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">{name ?? email}</SheetTitle>
          <p className="text-sm text-muted-foreground text-left">{email}</p>
        </SheetHeader>
        <div className="mt-6">
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
