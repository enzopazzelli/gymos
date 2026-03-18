"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Users, BarChart2, User, LayoutDashboard, ShieldCheck, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendario", label: "Calendario", icon: Calendar },
  { href: "/admin/alumnos", label: "Alumnos", icon: Users },
  { href: "/admin/coaches", label: "Coaches", icon: ShieldCheck },
]

const coachNav: NavItem[] = [
  { href: "/coach/calendario", label: "Calendario", icon: Calendar },
  { href: "/coach/alumnos", label: "Alumnos", icon: Users },
  { href: "/coach/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/coach/perfil", label: "Perfil", icon: User },
]

const studentNav: NavItem[] = [
  { href: "/student/progreso", label: "Progreso", icon: BarChart2 },
  { href: "/student/calendario", label: "Turnos", icon: Calendar },
  { href: "/student/rutina", label: "Rutina", icon: Dumbbell },
  { href: "/student/perfil", label: "Perfil", icon: User },
]

export function BottomNav({ role }: { role: "coach" | "student" | "admin" }) {
  const pathname = usePathname()
  const items = role === "admin" ? adminNav : role === "coach" ? coachNav : studentNav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map(({ href, label, icon: Icon }) => {
          // Exact match for root items (/admin, /student), prefix match for sections
          const active =
            href === "/admin"
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
