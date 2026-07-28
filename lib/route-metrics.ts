// ============================================================
// MÉTRICAS DE RUTA - distancia exacta y tiempo estimado
// ============================================================
// Fuente de verdad compartida por el encabezado "Ruta calculada".
//
// DISTANCIA (exacta, nunca aproximada):
//   - Entre cada punto contiguo (anillo o corredor exterior): 50 m por tramo.
//
// TIEMPO (minutos ENTEROS, realista con público):
//   Regla base EXACTA: 100 m = 1 min (50 m = 0,5 min).
//   El valor base sigue la regla; el rango añade +1 min de margen.
//   200 m: 2–3 min
//   400 m: 4–5 min
//   600 m: 6–7 min
//   800 m: 8–9 min
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

// Regla de distancia: entre cada punto contiguo del anillo hay 50 m.
const METERS_PER_STEP = 50

// ─── Anclajes del cruce Norte Occidental (Puerta 9W / 10-11) ───
// La arista entre General Norte Occidental (índice 12) y Tribuna Norte
// Occidental (índice 11) NO es directa: el mapa dibuja un recorrido en escalón
// por la calle (Puerta 9W → 10-11), inyectando 4 puntos de anclaje. Esos puntos
// son "puntos recorridos" y también cuentan 50 m cada uno, igual que en el mapa
// (ver NW_KEY_POINTS en stadium-route-map.tsx).
const NW_ANCHOR_COUNT = 4
function edgeAnchorPoints(a: number, b: number): number {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return lo === 11 && hi === 12 ? NW_ANCHOR_COUNT : 0
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

// Cuenta los puntos ÚNICOS consecutivos de una polilínea (ignora vértices
// repetidos), para aplicar la regla "50 m por cada punto recorrido".
function countPathPoints(pts: { x: number; y: number }[]): number {
  let n = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const prev = pts[i - 1]
    if (!prev || prev.x !== p.x || prev.y !== p.y) n++
  }
  return n
}

/**
 * Distancia EXACTA de la ruta en metros. Regla ÚNICA, sin excepciones:
 * 50 m por cada punto recorrido. Para rutas especiales se cuentan los puntos
 * del `specialPath`; para las del anillo, los índices del perímetro.
 */
export function routeDistanceMeters(result: RouteResult): number {
  // Rutas especiales (recorridos exteriores/internos con polilínea propia):
  // cada punto de la polilínea es un "punto recorrido" → 50 m entre cada uno.
  if (result.specialPath && result.specialPath.length > 0) {
    return Math.max(0, countPathPoints(result.specialPath) - 1) * METERS_PER_STEP
  }
  const iA = SECTION_INDEX[result.from] ?? 0
  const iB = SECTION_INDEX[result.to] ?? 0
  const idx = expandAlongPerimeter(traceToIndices(result.gateTrace ?? [], iA, iB))
  // Total de puntos recorridos = índices del anillo + anclajes intermedios
  // (p. ej. el escalón del cruce Norte Occidental). Cada tramo entre puntos
  // consecutivos son 50 m, contando SIEMPRE los anclajes por los que pasa.
  let points = idx.length
  for (let i = 1; i < idx.length; i++) points += edgeAnchorPoints(idx[i - 1], idx[i])
  return Math.max(0, points - 1) * METERS_PER_STEP
}

// Regla base EXACTA: 100 m = 1 min → 0.01 min/m (equivale a 50 m = 0,5 min).
// El valor central se calcula con esta regla; el rango solo añade un pequeño
// margen (±1 min) para reflejar el ritmo con público, sin cambiar la regla.
// Ejemplos (valor base): 50 m ≈ 1 min · 100 m = 1 min · 200 m = 2 min ·
// 600 m = 6 min · 1000 m = 10 min.
const RATE = 0.01

export interface RouteTime {
  /** Minutos, ritmo fluido con público. */
  lowMin: number
  /** Minutos, tráfico peatonal denso. */
  highMin: number
}

/**
 * Rango de tiempo estimado, siempre enteros. El valor base sigue EXACTO la
 * regla 100 m = 1 min; el rango añade +1 min de margen por tráfico con público.
 */
export function routeTimeRange(meters: number): RouteTime {
  const base = Math.max(1, Math.round(meters * RATE))
  return { lowMin: base, highMin: base + 1 }
}

/**
 * Rango de tiempo de una ruta, estimado desde su distancia con la regla global
 * (100 m = 1 min, con +1 min de margen por tráfico peatonal).
 */
export function routeTimeFor(result: RouteResult): RouteTime {
  return routeTimeRange(routeDistanceMeters(result))
}

/** Formatea minutos: siempre entero, sin decimales. */
export function formatMinutes(min: number): string {
  return String(Math.round(min))
}
