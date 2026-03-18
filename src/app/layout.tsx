import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { PwaRegister } from "@/components/layout/PwaRegister"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })

export const metadata: Metadata = {
  title: "Rheb App",
  description: "Gestión integral de entrenamiento",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rheb",
  },
}

export const viewport: Viewport = {
  themeColor: "#00664e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
