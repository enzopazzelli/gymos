import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllCoaches } from "@/lib/queries/admin"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CreateCoachDialog } from "@/components/admin/CreateCoachDialog"
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog"
import { ShieldCheck } from "lucide-react"

export default async function AdminCoachesPage() {
  const session = await auth()
  if (!session || session.user.role !== "admin") redirect("/login")

  const coaches = await getAllCoaches()

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coaches</h2>
          <p className="text-sm text-muted-foreground">{coaches.length} registrados</p>
        </div>
        <CreateCoachDialog />
      </div>

      {coaches.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay coaches. Creá el primero.</p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card overflow-hidden">
          {coaches.map((c) => {
            const initials = c.name
              ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

            return (
              <div key={c.coachId} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                  {c.specialty && (
                    <p className="text-[11px] text-muted-foreground">{c.specialty}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-black">{c.studentCount}</p>
                    <p className="text-[10px] text-muted-foreground">alumnos</p>
                  </div>
                  <ResetPasswordDialog userId={c.userId} userName={c.name} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
