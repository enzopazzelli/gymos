import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const role = session.user.role as "admin" | "coach" | "student"

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">
        {children}
      </main>
      <BottomNav role={role} />
    </div>
  )
}
