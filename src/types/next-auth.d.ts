import type { DefaultSession, DefaultJWT } from "next-auth"

type Role = "admin" | "coach" | "student"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: Role
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: Role
    id?: string
  }
}
