"use client"

import { useMemo, useEffect, useRef } from "react"
import { Clock, MapPin } from "lucide-react"
import type { RouteResult } from "@/lib/navigation"
import { useLanguage } from "@/lib/language-context"

const VW = 850.394
const VH = 566.929

// ─── Coordenadas EXACTAS de los 13 puntos marcados (elipses) del nuevo SVG MapaVector.svg ───
// Incluye nodo PLAZOLETA como intermediario entre P11 y P2. Orden horario.
// índice 9 = Plazoleta (nodo virtual entre P11 y P2 en el perímetro)
const PERIMETER: { gate: number; sub?: string; label?: string; x: number; y: number }[] = [
  { gate: 9,  sub: "ori",  x: 275.996, y: 224.819 }, // 0  P9 Oriental  (izq-arriba)
  { gate: 8,               x: 345.983, y: 170.188 }, // 1  P8           (esq. noroeste)
  { gate: 7,               x: 409.189, y: 153.438 }, // 2  P7           (arriba-izq)
  { gate: 6,               x: 537.972, y: 153.438 }, // 3  P6           (arriba-der)
  { gate: 5,               x: 599.981, y: 170.31  }, // 4  P5           (esq. noreste)
  { gate: 4,  sub: "alta", x: 670.291, y: 224.819 }, // 5  P4 Alta      (der-arriba)
  { gate: 4,  sub: "baja", x: 670.291, y: 294.188 }, // 6  P4 Baja      (der-abajo)
  { gate: 3,               x: 599.981, y: 348.188 }, // 7  P3           (esq. sureste)
  { gate: 2,               x: 537.973, y: 363.356 }, // 8  P2           (abajo-der)
  { gate: 1,  label: "Plazoleta", x: 474.215, y: 388.346 }, // 9  PLAZOLETA - Puerta 1 (abajo-centro)
  { gate: 11,              x: 409.190, y: 363.356 }, // 10 P11          (abajo-izq)
  { gate: 10,              x: 345.981, y: 348.188 }, // 11 P10          (esq. suroeste)
  { gate: 9,  sub: "occ",  x: 275.995, y: 294.187 }, // 12 P9 Occidental (izq-abajo)
]

const N = PERIMETER.length // 13

// ─── Escala para estimar distancia/tiempo ───────────────────────────────────
// El anillo completo (13 tramos) equivale aprox. a 800 m reales alrededor del
// estadio (4 tramos de referencia × 200 m). Escalamos la longitud dibujada de
// la ruta (en unidades del SVG) a metros usando esta relación.
const LOOP_UNITS = (() => {
  let s = 0
  for (let i = 0; i < N; i++) {
    const a = PERIMETER[i]
    const b = PERIMETER[(i + 1) % N]
    s += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return s
})()
const REAL_LOOP_M = 800 // 4 tramos × 200 m

// Estima distancia (m) y tiempo (min) a partir de la longitud de la ruta.
// Tiempo: 3 min/200 m en condiciones normales; 5 min/200 m con aglomeración
// (ingreso/salida). Devuelve rangos redondeados para mostrar en la simbología.
function estimateMetrics(lenUnits: number) {
  const meters = LOOP_UNITS > 0 ? (lenUnits / LOOP_UNITS) * REAL_LOOP_M : 0
  const distLow = Math.floor(meters / 100) * 100
  let distHigh = Math.ceil(meters / 100) * 100
  if (distHigh <= distLow) distHigh = distLow + 100
  const timeLow = Math.max(1, Math.round((meters / 200) * 3))
  const timeHigh = Math.max(timeLow + 1, Math.round((meters / 200) * 5))
  return { meters, distLow, distHigh, timeLow, timeHigh }
}

// Sección → índice en el perímetro
function sectionToIndex(section: string): number {
  const map: Record<string, number> = {
    "general-norte-oriental":   0,  // P9 Ori
    "tribuna-norte-oriental":   1,  // P8
    "palco-norte-oriental":     2,  // P7
    "palco-sur-oriental":       3,  // P6
    "tribuna-sur-oriental":     4,  // P5
    "general-sur-alta":         5,  // P4 Alta
    "general-sur-baja":         6,  // P4 Baja
    "tribuna-sur-occidental":   7,  // P3
    "palco-sur-occidental":     8,  // P2
    "plazoleta":                9,  // Plazoleta (nodo intermedio entre P2 y P11)
    "palco-norte-occidental":   10, // P11
    "tribuna-norte-occidental": 11, // P10
    "general-norte-occidental": 12, // P9 Occ
  }
  return map[section] ?? 0
}

// Todos los índices de PERIMETER que corresponden a una puerta dada
function indicesForGate(gate: number): number[] {
  const res: number[] = []
  PERIMETER.forEach((p, i) => { if (p.gate === gate) res.push(i) })
  return res
}

// Convierte la secuencia de puertas (gateTrace de navigation.ts) en una
// secuencia de índices del perímetro. Resuelve puertas ambiguas (P4, P9)
// eligiendo la opción más cercana al punto previo. Fija los extremos a iA/iB.
function traceToIndices(trace: number[], iA: number, iB: number): number[] {
  if (trace.length === 0) return [iA, iB]
  const indices: number[] = []
  for (let k = 0; k < trace.length; k++) {
    const gate = trace[k]
    const candidates = indicesForGate(gate)
    if (candidates.length === 0) continue

    let chosen: number
    if (k === 0) {
      // primer nodo: usar el índice del origen si coincide la puerta
      chosen = candidates.includes(iA) ? iA : candidates[0]
    } else if (k === trace.length - 1) {
      // último nodo: usar el índice del destino si coincide la puerta
      chosen = candidates.includes(iB) ? iB : candidates[0]
    } else if (candidates.length === 1) {
      chosen = candidates[0]
    } else {
      // ambigua: elegir la más cercana al punto previo
      const prev = PERIMETER[indices[indices.length - 1]]
      chosen = candidates.reduce((best, c) => {
        const d  = Math.hypot(PERIMETER[c].x - prev.x, PERIMETER[c].y - prev.y)
        const db = Math.hypot(PERIMETER[best].x - prev.x, PERIMETER[best].y - prev.y)
        return d < db ? c : best
      }, candidates[0])
    }
    if (indices.length === 0 || indices[indices.length - 1] !== chosen) {
      indices.push(chosen)
    }
  }
  // Si la traza colapsa a un solo punto (p. ej. misma puerta: P4 alta↔baja,
  // P9 oriental↔occidental) pero el origen y destino son puntos físicos
  // distintos, traza un segmento directo entre ambos extremos.
  if (indices.length < 2) {
    if (iA !== iB) return [iA, iB]
    return indices.length === 1 ? indices : [iA]
  }
  return indices
}

// Asegura que la línea siga SIEMPRE los 13 puntos del contorno: entre dos
// índices consecutivos no adyacentes, rellena los puntos intermedios del anillo
// siguiendo el arco más corto. Así la ruta nunca corta a través del estadio.
function expandAlongPerimeter(indices: number[]): number[] {
  if (indices.length < 2) return indices
  const out: number[] = [indices[0]]
  for (let k = 1; k < indices.length; k++) {
    const a = indices[k - 1]
    const b = indices[k]
    if (a === b) continue
    const cw  = (b - a + N) % N   // pasos en sentido horario
    const ccw = (a - b + N) % N   // pasos en sentido antihorario
    if (cw <= ccw) {
      for (let i = 1; i <= cw;  i++) out.push((a + i) % N)
    } else {
      for (let i = 1; i <= ccw; i++) out.push((a - i + N) % N)
    }
  }
  return out
}

function toD(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ""
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")
}

function pathLength(pts: { x: number; y: number }[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

interface Props { result: RouteResult }

export function StadiumRouteMap({ result }: Props) {
  const { t } = useLanguage()
  const pathRef  = useRef<SVGPathElement>(null)
  const glowRef  = useRef<SVGPathElement>(null)

  const data = useMemo(() => {
    const iA = sectionToIndex(result.from)
    const iB = sectionToIndex(result.to)
    const posA = PERIMETER[iA]
    const posB = PERIMETER[iB]

    // La línea del SVG se deriva del MISMO gateTrace que las indicaciones de texto,
    // garantizando que mapa y pasos siempre coincidan. Luego se expande para
    // seguir SIEMPRE los 13 puntos del contorno y nunca cortar por el estadio.
    const traceIndices = traceToIndices(result.gateTrace ?? [], iA, iB)
    const routeIndices = expandAlongPerimeter(traceIndices)
    const pts = routeIndices.map(i => PERIMETER[i])

    const pathD = toD(pts)
    const len   = pathLength(pts)

    const activeIndices = new Set(routeIndices)
    const metrics = estimateMetrics(len)

    return { iA, iB, posA, posB, pathD, len, activeIndices, metrics }
  }, [result])

  // Animación draw-on
  useEffect(() => {
    const els = [pathRef.current, glowRef.current].filter(Boolean) as SVGPathElement[]
    for (const el of els) {
      const len = data.len
      el.style.strokeDasharray  = `${len}`
      el.style.strokeDashoffset = `${len}`
      el.style.transition = "none"
    }
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        for (const el of els) {
          el.style.transition    = "stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1)"
          el.style.strokeDashoffset = "0"
        }
      })
      return () => cancelAnimationFrame(raf2)
    })
    return () => cancelAnimationFrame(raf1)
  }, [data])

  const { posA, posB, pathD, len, activeIndices, metrics } = data

  const distLabel =
    metrics.distLow === 0 ? `< ${metrics.distHigh} m` : `${metrics.distLow}–${metrics.distHigh} m`
  const timeLabel = `${metrics.timeLow}–${metrics.timeHigh} min`

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-bold text-foreground uppercase tracking-wide">{t("routeMap")}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            {t("origin")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            {t("destination")}
          </span>
        </div>
      </div>

      {pathD && (
        <div className="px-5 py-2.5 border-b border-border flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">{t("yourRoute")}</span>
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
            aria-label={`${t("estTime")}: ${timeLabel}`}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {timeLabel}
          </span>
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
            aria-label={`${t("estDistance")}: ${distLabel}`}
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            {distLabel}
          </span>
        </div>
      )}

      <div className="relative w-full">
        <img
          src="/images/mapa-rutas.svg"
          alt="Mapa del estadio"
          className="w-full h-auto block"
          draggable={false}
        />

        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Solo los puntos intermedios de la ruta (no A ni B) */}
          {PERIMETER.map((p, i) => {
            const isA = i === data.iA
            const isB = i === data.iB
            const isActive = activeIndices.has(i)
            if (!isActive || isA || isB) return null
            return (
              <circle
                key={i}
                cx={p.x} cy={p.y} r={5}
                fill="white"
                opacity={0.7}
              />
            )
          })}

          {/* Casing blanco para contraste */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="white"
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}

          {/* Línea de ruta con glow animada */}
          {pathD && (
            <path
              ref={glowRef}
              d={pathD}
              fill="none"
              stroke="#00E5FF"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${len}`}
              strokeDashoffset={`${len}`}
              filter="url(#glow)"
              opacity={0.6}
            />
          )}
          {pathD && (
            <path
              ref={pathRef}
              d={pathD}
              fill="none"
              stroke="#00E5FF"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${len}`}
              strokeDashoffset={`${len}`}
            />
          )}

          {/* Pulso en punto A */}
          <circle cx={posA.x} cy={posA.y} r={15} fill="#22c55e" opacity={0.15}>
            <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* Marcador A */}
          <circle cx={posA.x} cy={posA.y} r={9} fill="#22c55e" stroke="white" strokeWidth={1.5} />
          <text
            x={posA.x} y={posA.y}
            textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize={8} fontWeight="900" fontFamily="system-ui,sans-serif"
          >A</text>
          <rect x={posA.x - 11} y={posA.y - 28} width={22} height={11} rx={3} fill="#22c55e" />
          <text
            x={posA.x} y={posA.y - 22}
            textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize={6} fontWeight="700" fontFamily="system-ui,sans-serif"
          >P{posA.gate}</text>

          {/* Pulso en punto B */}
          <circle cx={posB.x} cy={posB.y} r={15} fill="#ef4444" opacity={0.15}>
            <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" begin="0.5s" />
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" begin="0.5s" />
          </circle>
          {/* Marcador B */}
          <circle cx={posB.x} cy={posB.y} r={9} fill="#ef4444" stroke="white" strokeWidth={1.5} />
          <text
            x={posB.x} y={posB.y}
            textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize={8} fontWeight="900" fontFamily="system-ui,sans-serif"
          >B</text>
          <rect x={posB.x - 11} y={posB.y - 28} width={22} height={11} rx={3} fill="#ef4444" />
          <text
            x={posB.x} y={posB.y - 22}
            textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize={6} fontWeight="700" fontFamily="system-ui,sans-serif"
          >P{posB.gate}</text>
        </svg>
      </div>
    </div>
  )
}
