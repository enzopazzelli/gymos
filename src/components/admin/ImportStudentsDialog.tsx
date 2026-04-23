"use client"

import { useState, useTransition, useRef } from "react"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { importStudents } from "@/lib/actions/admin"
import { cn } from "@/lib/utils"
import { format, addMonths } from "date-fns"

interface Coach { id: string; name: string | null }
interface Plan  { id: string; name: string; daysPerWeek: number; price: string }

interface ParsedRow {
  name: string
  email: string
  password: string
  sport?: string
  whatsapp?: string
  coachId?: string
  coachDisplay?: string
  planId?: string
  planDisplay?: string
  valid: boolean
  warnings: string[]
}

interface Props {
  coaches: Coach[]
  plans: Plan[]
}

const DEFAULT_PASSWORD = "gymos2024"

function norm(s: string) {
  return s.toLowerCase().trim()
    .replace(/[áà]/g, "a").replace(/[éè]/g, "e")
    .replace(/[íì]/g, "i").replace(/[óò]/g, "o")
    .replace(/[úù]/g, "u").replace(/ñ/g, "n")
}

const HEADER_MAP: Record<string, string> = {
  nombre: "name", name: "name", alumno: "name", "apellido y nombre": "name",
  email: "email", correo: "email", mail: "email",
  contrasena: "password", password: "password", clave: "password",
  deporte: "sport", sport: "sport", actividad: "sport",
  whatsapp: "whatsapp", telefono: "whatsapp", celular: "whatsapp", tel: "whatsapp",
  coach: "coach", entrenador: "coach", profesor: "coach",
  plan: "plan",
}

export function ImportStudentsDialog({ coaches, plans }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle")
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function parseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

      const parsed: ParsedRow[] = raw.map((rowRaw) => {
        const row: Record<string, string> = {}
        for (const [k, v] of Object.entries(rowRaw)) {
          const mapped = HEADER_MAP[norm(k)]
          if (mapped) row[mapped] = String(v).trim()
        }

        const warnings: string[] = []
        const name = row.name ?? ""
        const email = row.email ?? ""
        const password = row.password || DEFAULT_PASSWORD

        if (!name) warnings.push("Sin nombre")
        if (!email) warnings.push("Sin email")
        else if (!email.includes("@")) warnings.push("Email inválido")

        let coachId: string | undefined
        let coachDisplay: string | undefined
        if (row.coach) {
          const n = norm(row.coach)
          const match = coaches.find(
            (c) => norm(c.name ?? "").includes(n) || n.includes(norm(c.name ?? ""))
          )
          if (match) { coachId = match.id; coachDisplay = match.name ?? undefined }
          else warnings.push(`Coach "${row.coach}" no encontrado`)
        }

        let planId: string | undefined
        let planDisplay: string | undefined
        if (row.plan) {
          const n = norm(row.plan)
          const match = plans.find(
            (p) => norm(p.name).includes(n) || n.includes(norm(p.name))
          )
          if (match) { planId = match.id; planDisplay = match.name }
          else warnings.push(`Plan "${row.plan}" no encontrado`)
        }

        return {
          name, email, password,
          sport: row.sport || undefined,
          whatsapp: row.whatsapp || undefined,
          coachId, coachDisplay, planId, planDisplay,
          valid: !!name && !!email && email.includes("@"),
          warnings,
        }
      }).filter((r) => r.name || r.email) // omitir filas completamente vacías

      setRows(parsed)
      setStep("preview")
    }
    reader.readAsArrayBuffer(file)
  }

  function handleImport() {
    const today = format(new Date(), "yyyy-MM-dd")
    const endDate = format(addMonths(new Date(), 1), "yyyy-MM-dd")

    const toImport = rows
      .filter((r) => r.valid)
      .map((r) => ({
        name: r.name,
        email: r.email,
        password: r.password,
        sport: r.sport,
        whatsapp: r.whatsapp,
        coachId: r.coachId,
        planId: r.planId,
        planStartDate: today,
        planEndDate: r.planId ? endDate : undefined,
      }))

    startTransition(async () => {
      const res = await importStudents(toImport)
      setResult(res)
      setStep("done")
    })
  }

  function reset() {
    setStep("idle")
    setRows([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleClose() { reset(); setOpen(false) }

  const validCount   = rows.filter((r) => r.valid).length
  const warnCount    = rows.filter((r) => r.valid && r.warnings.length > 0).length
  const invalidCount = rows.filter((r) => !r.valid).length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-input hover:bg-muted transition-colors"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Importar Excel
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Importar alumnos desde Excel</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* ── Idle: instrucciones + upload ── */}
            {step === "idle" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seleccioná un archivo <strong>.xlsx</strong>. Las columnas reconocidas son:
                </p>
                <div className="rounded-xl border bg-muted/40 p-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  {[
                    ["nombre / name", "Requerido"],
                    ["email", "Requerido"],
                    [`contraseña / password`, `Default: "${DEFAULT_PASSWORD}"`],
                    ["deporte / sport", "Opcional"],
                    ["whatsapp / telefono", "Opcional"],
                    ["coach / entrenador", "Opcional"],
                    ["plan", "Opcional"],
                  ].map(([col, note]) => (
                    <div key={col} className="flex items-baseline gap-1">
                      <code className="font-mono text-foreground">{col}</code>
                      <span>— {note}</span>
                    </div>
                  ))}
                </div>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 cursor-pointer hover:bg-primary/10 transition-colors">
                  <Upload className="h-8 w-8 text-primary/60" />
                  <span className="text-sm font-medium text-primary">Elegir archivo .xlsx</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={parseFile}
                  />
                </label>
              </div>
            )}

            {/* ── Preview ── */}
            {step === "preview" && (
              <div className="space-y-3">
                {/* Summary badges */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {validCount} válidos
                  </span>
                  {warnCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {warnCount} con advertencias
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-red-700 font-medium">
                      <XCircle className="h-3.5 w-3.5" />
                      {invalidCount} inválidos (serán omitidos)
                    </span>
                  )}
                </div>

                {/* Table */}
                <div className="rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          {["", "Nombre", "Email", "Coach", "Plan", "Notas"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((r, i) => (
                          <tr key={i} className={cn(!r.valid && "bg-red-50/60 opacity-60")}>
                            <td className="px-2 py-2 w-6">
                              {r.valid
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                : <XCircle className="h-3.5 w-3.5 text-red-500" />
                              }
                            </td>
                            <td className="px-3 py-2 font-medium max-w-[130px] truncate">{r.name || "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">{r.email || "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.coachDisplay ?? <span className="text-muted-foreground/50">—</span>}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.planDisplay ?? <span className="text-muted-foreground/50">—</span>}</td>
                            <td className="px-3 py-2 text-amber-700 max-w-[180px]">
                              {r.warnings.join(" · ") || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Alumnos sin contraseña en el Excel recibirán <code className="font-mono bg-muted px-1 rounded">{DEFAULT_PASSWORD}</code> como contraseña inicial.
                </p>
              </div>
            )}

            {/* ── Done ── */}
            {step === "done" && result && (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <div>
                  <p className="text-lg font-bold">{result.imported} alumnos importados</p>
                  {result.skipped > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.skipped} omitidos — email ya registrado o datos incompletos
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
            {step === "preview" && (
              <>
                <Button variant="outline" onClick={reset} className="flex-1">
                  Cambiar archivo
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={pending || validCount === 0}
                  className="flex-1"
                >
                  {pending ? "Importando…" : `Importar ${validCount} alumnos`}
                </Button>
              </>
            )}
            {(step === "idle" || step === "done") && (
              <Button variant="outline" onClick={handleClose} className="w-full">
                {step === "done" ? "Cerrar" : "Cancelar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
