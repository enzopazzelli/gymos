import { cn } from "@/lib/utils"

type Status = "green" | "yellow" | "red"

const config: Record<Status, { label: string; className: string }> = {
  green:  { label: "Al día",    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  yellow: { label: "Por vencer", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  red:    { label: "Deuda",     className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
}

export function PaymentBadge({ status }: { status: Status }) {
  const { label, className } = config[status]
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", className)}>
      {label}
    </span>
  )
}
