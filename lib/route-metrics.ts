// ============================================================
// MÉTRICAS DE RUTA - distancia exacta y tiempo estimado
// ============================================================
// Fuente de verdad compartida por el encabezado "Ruta calculada".
//
// DISTANCIA (exacta, nunca aproximada):
//   - Entre secciones contiguas del anillo: 100 m por tramo.
//   - Excepción: Palco Sur Occidental (P2) ↔ Plazoleta (P1): 50 m.
//
// TIEMPO (rango en minutos ENTEROS, según recorridos acumulados provistos):
//   200 m: 3–5 min con público
//   400 m: 5–10 min con público
//   600 m: 8–13 min con público
//   800 m: 10–18 min con público
//   Se muestra el rango realista: mejor caso normal → peor caso con público.
//   Nunca se usan decimales.
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

// Distancia (m) de un paso entre dos índices contiguos del anillo.
function stepMeters(a: number, b: number): number {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  // P2 (idx 8) ↔ Plazoleta (idx 9) = 50 m; todos los demás tramos = 100 m
  if (lo === 8 && hi === 9) return 50
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

// Interpolación lineal por tramos sobre puntos ancla [metros, minutos].
function piecewise(m: number, anchors: [number, number][]): number {
  if (m <= anchors[0][0]) return anchors[0][1]
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1]
    const [x1, y1] = anchors[i]
    if (m <= x1) return y0 + ((y1 - y0) * (m - x0)) / (x1 - x0)
  }
  const [x0, y0] = anchors[anchors.length - 2]
  const [x1, y1] = anchors[anchors.length - 1]
  return y1 + ((y1 - y0) * (m - x1)) / (x1 - x0)
}

// Peor caso con público (no lineal): sigue exactamente la tabla provista.
const CROWD_HIGH: [number, number][] = [
  [0, 0], [200, 5], [400, 10], [600, 13], [800, 18],
]

export interface RouteTime {
  /** Minutos, mejor caso en condiciones normales. */
  lowMin: number
  /** Minutos, peor caso durante ingreso/salida con público. */
  highMin: number
}

/** Rango de tiempo estimado: normal (rápido) → con público (lento). Siempre enteros. */
export function routeTimeRange(meters: number): RouteTime {
  const low = meters * 0.0125 // 2.5 min por 200 m
  const high = piecewise(meters, CROWD_HIGH)
  const lowMin = Math.max(1, Math.round(low))
  let highMin = Math.round(high)
  if (highMin <= lowMin) highMin = lowMin + 1
  return { lowMin, highMin }
}

/** Formatea minutos: siempre entero, sin decimales. */
export function formatMinutes(min: number): string {
  return String(Math.round(min))
}
