// ============================================================
// MÉTRICAS DE RUTA - distancia exacta y tiempo estimado
// ============================================================
// Fuente de verdad compartida por el encabezado "Ruta calculada".
//
// DISTANCIA (exacta, nunca aproximada):
//   - Entre secciones contiguas del anillo: 100 m por tramo.
//   - Excepciones de 50 m:
//       · Palco Sur Occidental ↔ Plazoleta
//       · Plazoleta ↔ Palco Norte Occidental
//       · General Sur Alta ↔ General Sur Baja
//       · General Norte Oriental ↔ General Norte Occidental
//
// TIEMPO (rango ESTRECHO en minutos ENTEROS, realista con público):
//   200 m: 3–4 min
//   400 m: 6–8 min
//   600 m: 9–12 min
//   800 m: 12–16 min
//   Ritmo fluido → tráfico peatonal denso. Nunca se usan decimales.
// ============================================================

import type { RouteResult } from "./navigation"

// Orden del anillo (idéntico a PERIMETER en stadium-route-map.tsx)
// idx:  0   1   2   3   4   5      6      7   8   9(Plaz) 10  11  12
const RING_GATES = [9, 8, 7, 6, 5, 4, 4, 3, 2, 1, 11, 10, 9]
const N = RING_GATES.length // 13

// Sección → índice del anillo (idéntico a sectionToIndex del mapa)
const SECTION_INDEX: Record<string, number> = {
  "general-norte-oriental":   0,
  "tribuna-norte-oriental":   1,
  "palco-norte-oriental":     2,
  "palco-sur-oriental":       3,
  "tribuna-sur-oriental":     4,
  "general-sur-alta":         5,
  "general-sur-baja":         6,
  "tribuna-sur-occidental":   7,
  "palco-sur-occidental":     8,
  "plazoleta":                9,
  "palco-norte-occidental":   10,
  "tribuna-norte-occidental": 11,
  "general-norte-occidental": 12,
}

function indicesForGate(g: number): number[] {
  const r: number[] = []
  RING_GATES.forEach((x, i) => { if (x === g) r.push(i) })
  return r
}

// Tramos contiguos de 50 m (todos los demás = 100 m). Pares de índices del anillo.
// 8-9:  Palco Sur Occidental ↔ Plazoleta
// 9-10: Plazoleta ↔ Palco Norte Occidental
// 5-6:  General Sur Alta ↔ General Sur Baja
// 12-0: General Norte Occidental ↔ General Norte Oriental (envuelve el anillo)
const HALF_STEPS = new Set(["8-9", "9-10", "5-6", "0-12"])

// Distancia (m) de un paso entre dos índices contiguos del anillo.
function stepMeters(a: number, b: number): number {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  if (HALF_STEPS.has(`${lo}-${hi}`)) return 50
  return 100
}

// Distancia en pasos del anillo (arco más corto) entre dos índices.
function ringDist(a: number, b: number): number {
  const cw = (b - a + N) % N
  const ccw = (a - b + N) % N
  return Math.min(cw, ccw)
}

function closest(cands: number[], prev: number): number {
  return cands.reduce((best, c) => (ringDist(c, prev) < ringDist(best, prev) ? c : best), cands[0])
}

// gateTrace → índices del anillo (fija extremos a iA/iB, resuelve P4/P9).
function traceToIndices(trace: number[], iA: number, iB: number): number[] {
  if (trace.length === 0) return iA === iB ? [iA] : [iA, iB]
  const indices: number[] = []
  for (let k = 0; k < trace.length; k++) {
    const cands = indicesForGate(trace[k])
    if (cands.length === 0) continue
    let chosen: number
    if (k === 0) {
      chosen = cands.includes(iA) ? iA : cands[0]
    } else if (k === trace.length - 1) {
      chosen = cands.includes(iB) ? iB : closest(cands, indices[indices.length - 1])
    } else if (cands.length === 1) {
      chosen = cands[0]
    } else {
      chosen = closest(cands, indices[indices.length - 1])
    }
    if (indices.length === 0 || indices[indices.length - 1] !== chosen) indices.push(chosen)
  }
  if (indices.length < 2) return iA !== iB ? [iA, iB] : indices
  return indices
}

// Rellena los índices intermedios siguiendo el arco más corto del anillo.
function expandAlongPerimeter(indices: number[]): number[] {
  if (indices.length < 2) return indices
  const out: number[] = [indices[0]]
  for (let k = 1; k < indices.length; k++) {
    const a = indices[k - 1]
    const b = indices[k]
    if (a === b) continue
    const cw = (b - a + N) % N
    const ccw = (a - b + N) % N
    if (cw <= ccw) for (let i = 1; i <= cw; i++) out.push((a + i) % N)
    else for (let i = 1; i <= ccw; i++) out.push((a - i + N) % N)
  }
  return out
}

/** Distancia EXACTA de la ruta en metros. */
export function routeDistanceMeters(result: RouteResult): number {
  const iA = SECTION_INDEX[result.from] ?? 0
  const iB = SECTION_INDEX[result.to] ?? 0
  const idx = expandAlongPerimeter(traceToIndices(result.gateTrace ?? [], iA, iB))
  let m = 0
  for (let i = 1; i < idx.length; i++) m += stepMeters(idx[i - 1], idx[i])
  return m
}

// Ritmos realistas para un estadio con público (concourse con gente en
// movimiento, sin llegar a aglomeración extrema). Rango estrecho:
//   - Bajo:  3 min por 200 m  (0.015 min/m)  → paso fluido entre gente
//   - Alto:  4 min por 200 m  (0.020 min/m)  → tráfico peatonal denso
// Ejemplos: 200 m ≈ 3–4 min · 400 m ≈ 6–8 min · 600 m ≈ 9–12 min · 800 m ≈ 12–16 min
const LOW_RATE = 0.015
const HIGH_RATE = 0.02

export interface RouteTime {
  /** Minutos, ritmo fluido con público. */
  lowMin: number
  /** Minutos, tráfico peatonal denso. */
  highMin: number
}

/** Rango de tiempo estimado realista con público. Siempre enteros. */
export function routeTimeRange(meters: number): RouteTime {
  const lowMin = Math.max(1, Math.round(meters * LOW_RATE))
  let highMin = Math.round(meters * HIGH_RATE)
  if (highMin <= lowMin) highMin = lowMin + 1
  return { lowMin, highMin }
}

/** Formatea minutos: siempre entero, sin decimales. */
export function formatMinutes(min: number): string {
  return String(Math.round(min))
}
