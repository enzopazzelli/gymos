import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/", "/login", "/api/auth"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Si ya está logueado y va a /login → redirigir a su dashboard
  if (req.auth && pathname === "/login") {
    const role = req.auth.user?.role
    const dest = role === "admin" ? "/admin" : role === "coach" ? "/coach/calendario" : "/student"
    return NextResponse.redirect(new URL(dest, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)"],
}
