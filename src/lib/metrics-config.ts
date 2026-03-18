export type MetricCategory = "rom" | "pain" | "field"

export const METRIC_TYPES = [
  // ── ROM ──────────────────────────────────────────────────────────────────
  { type: "ROM_rodilla_izq",  label: "Rodilla Izq",  unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_rodilla_der"  },
  { type: "ROM_rodilla_der",  label: "Rodilla Der",  unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_rodilla_izq"  },
  { type: "ROM_cadera_izq",   label: "Cadera Izq",   unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_cadera_der"   },
  { type: "ROM_cadera_der",   label: "Cadera Der",   unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_cadera_izq"   },
  { type: "ROM_tobillo_izq",  label: "Tobillo Izq",  unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_tobillo_der"  },
  { type: "ROM_tobillo_der",  label: "Tobillo Der",  unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_tobillo_izq"  },
  { type: "ROM_hombro_izq",   label: "Hombro Izq",   unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_hombro_der"   },
  { type: "ROM_hombro_der",   label: "Hombro Der",   unit: "°",   category: "rom"   as MetricCategory, pair: "ROM_hombro_izq"   },

  // ── Dolor ─────────────────────────────────────────────────────────────────
  { type: "dolor_rodilla_izq", label: "Rodilla Izq", unit: "/10", category: "pain"  as MetricCategory, pair: "dolor_rodilla_der" },
  { type: "dolor_rodilla_der", label: "Rodilla Der", unit: "/10", category: "pain"  as MetricCategory, pair: "dolor_rodilla_izq" },
  { type: "dolor_cadera",      label: "Cadera",      unit: "/10", category: "pain"  as MetricCategory, pair: null                },
  { type: "dolor_espalda",     label: "Espalda",     unit: "/10", category: "pain"  as MetricCategory, pair: null                },
  { type: "dolor_hombro_izq",  label: "Hombro Izq",  unit: "/10", category: "pain"  as MetricCategory, pair: "dolor_hombro_der"  },
  { type: "dolor_hombro_der",  label: "Hombro Der",  unit: "/10", category: "pain"  as MetricCategory, pair: "dolor_hombro_izq"  },

  // ── Tests de campo ────────────────────────────────────────────────────────
  { type: "salto_largo",     label: "Salto largo",   unit: "cm",  category: "field" as MetricCategory, pair: null },
  { type: "salto_CMJ",       label: "Salto CMJ",     unit: "cm",  category: "field" as MetricCategory, pair: null },
  { type: "velocidad_20m",   label: "Velocidad 20m", unit: "s",   category: "field" as MetricCategory, pair: null },
  { type: "velocidad_30m",   label: "Velocidad 30m", unit: "s",   category: "field" as MetricCategory, pair: null },
]

export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  rom:   "ROM",
  pain:  "Dolor",
  field: "Tests",
}

export function getMetricConfig(type: string) {
  return METRIC_TYPES.find((m) => m.type === type)
}
