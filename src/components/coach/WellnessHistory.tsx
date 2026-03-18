import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface WellnessLog {
  date: string
  sleep: number | null
  fatigue: number | null
  mood: number | null
  pain: number | null
  notes: string | null
}

function Dot({ value, max, invert = false }: { value: number | null; max: number; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-muted-foreground/40">—</span>
  const ratio = value / max
  const level = invert ? 1 - ratio : ratio
  return (
    <span className={cn(
      "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white",
      level >= 0.7 ? "bg-emerald-500" : level >= 0.4 ? "bg-amber-400" : "bg-red-500"
    )}>
      {value}
    </span>
  )
}

export function WellnessHistory({ logs }: { logs: WellnessLog[] }) {
  if (!logs.length) {
    return <p className="text-sm text-muted-foreground text-center py-3">Sin registros todavía.</p>
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-medium pb-2 pr-3 pl-1">Fecha</th>
            <th className="text-center font-medium pb-2 px-1" title="Sueño">😴</th>
            <th className="text-center font-medium pb-2 px-1" title="Fatiga">🏃</th>
            <th className="text-center font-medium pb-2 px-1" title="Humor">😊</th>
            <th className="text-center font-medium pb-2 px-1" title="Dolor">🩺</th>
            <th className="text-left font-medium pb-2 pl-3">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((log) => (
            <tr key={log.date}>
              <td className="py-2 pr-3 pl-1 text-muted-foreground whitespace-nowrap">
                {format(parseISO(log.date), "EEE d/M", { locale: es })}
              </td>
              <td className="py-2 px-1 text-center"><Dot value={log.sleep}   max={5} /></td>
              <td className="py-2 px-1 text-center"><Dot value={log.fatigue} max={5} invert /></td>
              <td className="py-2 px-1 text-center"><Dot value={log.mood}    max={5} /></td>
              <td className="py-2 px-1 text-center"><Dot value={log.pain}    max={10} invert /></td>
              <td className="py-2 pl-3 text-muted-foreground truncate max-w-[120px]">
                {log.notes ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
