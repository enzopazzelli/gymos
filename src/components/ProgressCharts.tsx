"use client"

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts"

interface WeekData { week: string; count: number }
interface ExerciseData { date: string; weight: number | null }
interface PR { name: string; weight: number; reps: string }

export function SessionsBarChart({ data }: { data: WeekData[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v) => [`${v} sesión${v !== 1 ? "es" : ""}`, ""]}
        />
        <Bar dataKey="count" fill="oklch(0.448 0.112 166.4)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ExerciseLineChart({ data, exerciseName }: { data: ExerciseData[]; exerciseName: string }) {
  const chartData = data.map((d) => ({ ...d, weight: d.weight ?? 0 }))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v) => [`${v} kg`, exerciseName]}
        />
        <Line type="monotone" dataKey="weight" stroke="oklch(0.448 0.112 166.4)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PRTable({ prs }: { prs: PR[] }) {
  if (!prs.length) return (
    <p className="text-sm text-muted-foreground text-center py-4">Sin registros todavía.</p>
  )
  return (
    <div className="divide-y rounded-xl border bg-card overflow-hidden">
      {prs.map((pr) => (
        <div key={pr.name} className="flex items-center justify-between px-4 py-2.5">
          <p className="text-sm font-medium truncate flex-1">{pr.name}</p>
          <p className="text-sm font-black text-primary shrink-0 ml-3">{pr.weight} kg</p>
          <p className="text-xs text-muted-foreground shrink-0 ml-1.5">× {pr.reps}</p>
        </div>
      ))}
    </div>
  )
}
