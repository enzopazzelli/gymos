import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/layout/UserMenu"
import Link from "next/link"

export async function TopBar() {
  const session = await auth()
  const user = session?.user
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-70 transition-opacity">GymOS</Link>
        <UserMenu
          name={user?.name}
          email={user?.email}
          image={user?.image}
          initials={initials}
        />
      </div>
    </header>
  )
}
