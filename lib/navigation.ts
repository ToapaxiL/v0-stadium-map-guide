// ============================================================
// MOTOR DE RUTAS - Estadio Rodrigo Paz Delgado
// ============================================================
//
// TRAMO_1:  P2 <-> P3
// CORTE_1:  P3 ✖ P4  → Calle Cacica Quilago
// CORTE_2:  P4 ✖ P5/P6 → Cacica Quilago + Diego Vásquez de Cepeda
// TRAMO_2:  P5 <-> P6 <-> P7 <-> P8 <-> P9
// CORTE_3:  P9 ✖ P10 → Hermensz Van Risn Rembrandt (bidireccional)
// TRAMO_3:  P10 <-> P11 <-> P2  (acceso interno, sin salida a la calle)
//
// REGLAS:
//  - General Sur Baja solo accede por P4
//  - P10/P11 → P2: conexión interna por pasillo occidental
//  - P9 → P10: siempre por exterior (Hermensz Van Risn Rembrandt)
// ============================================================

export interface RouteStep {
  type: "start" | "internal" | "external" | "arrive"
  instruction: string
  detail?: string
  icon: "pin" | "walk" | "exit" | "enter" | "flag"
}

export interface RouteResult {
  from: string
  to: string
  steps: RouteStep[]
  totalSteps: number
  usesExterior: boolean
  /** Secuencia ordenada de puertas que recorre la ruta (fuente de verdad para el SVG) */
  gateTrace: number[]
}

const SECTION_GATES: Record<string, number> = {
  "palco-sur-occidental":     2,
  "tribuna-sur-occidental":   3,
  "general-sur-alta":         4,
  "general-sur-baja":         4,
  "tribuna-sur-oriental":     5,
  "palco-sur-oriental":       6,
  "palco-norte-oriental":     7,
  "tribuna-norte-oriental":   8,
  "general-norte-oriental":   9,
  "general-norte-occidental": 9,
  "tribuna-norte-occidental": 10,
  "palco-norte-occidental":   11,
  "plazoleta":                1,   // Puerta 1 - Plazoleta, intermediario P2 ↔ P11
}

// Tramos internos conectados
// TRAMO_3 incluye P2 como nodo compartido con TRAMO_1
// La Plazoleta (gate=1) es el nodo intermediario entre P11 y P2
const TRAMO_1 = [2, 3]               // Occidental Sur
const TRAMO_2 = [5, 6, 7, 8, 9]     // Oriental completo
const TRAMO_3 = [2, 1, 11, 10]      // Occidental Norte: P2 ↔ Plazoleta(P1) ↔ P11 ↔ P10

function inTramo1(g: number) { return TRAMO_1.includes(g) }
function inTramo2(g: number) { return TRAMO_2.includes(g) }
function inTramo3(g: number) { return TRAMO_3.includes(g) }
// P2 está en ambos TRAMO_1 y TRAMO_3 (es el nodo de unión)

const SECTION_NAMES: Record<string, { es: string; en: string }> = {
  "palco-sur-occidental":     { es: "Palco Sur Occidental",     en: "South West Box" },
  "tribuna-sur-occidental":   { es: "Tribuna Sur Occidental",   en: "South West Stand" },
  "general-sur-alta":         { es: "General Sur Alta",         en: "South High General" },
  "general-sur-baja":         { es: "General Sur Baja",         en: "South Low General" },
  "tribuna-sur-oriental":     { es: "Tribuna Sur Oriental",     en: "South East Stand" },
  "palco-sur-oriental":       { es: "Palco Sur Oriental",       en: "South East Box" },
  "palco-norte-oriental":     { es: "Palco Norte Oriental",     en: "North East Box" },
  "tribuna-norte-oriental":   { es: "Tribuna Norte Oriental",   en: "North East Stand" },
  "general-norte-oriental":   { es: "General Norte Oriental",   en: "North East General" },
  "general-norte-occidental": { es: "General Norte Occidental", en: "North West General" },
  "tribuna-norte-occidental": { es: "Tribuna Norte Occidental", en: "North West Stand" },
  "palco-norte-occidental":   { es: "Palco Norte Occidental",   en: "North West Box" },
  "plazoleta":                { es: "Plazoleta",                en: "Plaza" },
}

export function getSectionName(id: string, lang: "es" | "en" = "es"): string {
  return SECTION_NAMES[id]?.[lang] ?? id
}

export const ALL_SECTIONS = Object.keys(SECTION_GATES)

// ============================================================
// Textos por idioma
// ============================================================
const T = {
  es: {
    walkCorridor:   "Camina por el pasillo interior",
    passesByGate:   (gates: string) => `Pasas por Puerta ${gates}`,
    fromTo:         (a: number, b: number) => `De Puerta ${a} a Puerta ${b}`,
    exitGate:       (g: number) => `Sal por Puerta ${g} al exterior`,
    walkStreet:     (s: string) => `Camina por ${s}`,
    continueStreet: (s: string) => `Continúa por ${s}`,
    enterGate:      (g: number) => `Entra por Puerta ${g}`,
    walkToCorridor: "Camina por el pasillo interior hasta tu sección",
    viaPlazoleta:   "Pasa por la Plazoleta",
  },
  en: {
    walkCorridor:   "Walk through the indoor corridor",
    passesByGate:   (gates: string) => `Passes through Gate ${gates}`,
    fromTo:         (a: number, b: number) => `From Gate ${a} to Gate ${b}`,
    exitGate:       (g: number) => `Exit through Gate ${g} to the exterior`,
    walkStreet:     (s: string) => `Walk along ${s}`,
    continueStreet: (s: string) => `Continue along ${s}`,
    enterGate:      (g: number) => `Enter through Gate ${g}`,
    walkToCorridor: "Walk through the indoor corridor to your section",
    viaPlazoleta:   "Pass through the Plaza",
  },
}

// ============================================================
// Lógica de pasos internos
// ============================================================
// Plazoleta = Puerta 1
const PLAZOLETA_GATE = 1

function walkInternal(
  steps: RouteStep[],
  from: number,
  to: number,
  tramo: number[],
  lang: "es" | "en" = "es"
) {
  if (from === to) return
  const fi = tramo.indexOf(from)
  const ti = tramo.indexOf(to)
  if (fi === -1 || ti === -1) return
  const t = T[lang]
  const dir = fi < ti ? 1 : -1
  const mid: number[] = []
  for (let i = fi + dir; i !== ti; i += dir) mid.push(tramo[i])

  const passesPlazoleta = mid.includes(PLAZOLETA_GATE)

  if (passesPlazoleta) {
    const plazaIdx = mid.indexOf(PLAZOLETA_GATE)
    const before = mid.slice(0, plazaIdx).filter(g => g !== PLAZOLETA_GATE)
    const after  = mid.slice(plazaIdx + 1).filter(g => g !== PLAZOLETA_GATE)
    const gateWord = lang === "es" ? "Puerta" : "Gate"

    // Segmento antes de la plazoleta (solo si hay tramo real)
    if (before.length > 0) {
      steps.push({
        type: "internal",
        instruction: t.walkCorridor,
        detail: t.passesByGate(before.map(String).join(`, ${gateWord} `)),
        icon: "walk",
      })
    }

    // Paso por la plazoleta
    steps.push({
      type: "internal",
      instruction: t.viaPlazoleta,
      icon: "walk",
    })

    // Segmento después de la plazoleta (solo si hay tramo real)
    if (after.length > 0) {
      steps.push({
        type: "internal",
        instruction: t.walkCorridor,
        detail: t.passesByGate(after.map(String).join(`, ${gateWord} `)),
        icon: "walk",
      })
    }
  } else {
    steps.push({
      type: "internal",
      instruction: t.walkCorridor,
      detail: mid.length > 0
        ? t.passesByGate(mid.map(String).join(`, ${lang === "es" ? "Puerta" : "Gate"} `))
        : t.fromTo(from, to),
      icon: "walk",
    })
  }
}

// ============================================================
// Algoritmo principal
// ============================================================
export function calculateRoute(fromId: string, toId: string, lang: "es" | "en" = "es"): RouteResult {
  const fromGate = SECTION_GATES[fromId]
  const toGate   = SECTION_GATES[toId]
  const fromName = getSectionName(fromId, lang)
  const toName   = getSectionName(toId, lang)
  const t = T[lang]
  const gateLabel = lang === "es" ? "Puerta" : "Gate"

  if (fromGate == null || toGate == null) {
    return { from: fromId, to: toId, steps: [], totalSteps: 0, usesExterior: false, gateTrace: [] }
  }

  const steps: RouteStep[] = []

  steps.push({
    type: "start",
    instruction: fromName,
    detail: `${gateLabel} ${fromGate}`,
    icon: "pin",
  })

  // Misma puerta
  if (fromGate === toGate && fromId !== toId) {
    steps.push({ type: "internal", instruction: t.walkToCorridor, icon: "walk" })
    steps.push({ type: "arrive", instruction: toName, detail: `${gateLabel} ${toGate}`, icon: "flag" })
    return { from: fromId, to: toId, steps, totalSteps: steps.length, usesExterior: false, gateTrace: [fromGate] }
  }

  const route = resolveRoute(fromGate, toGate, lang)
  steps.push(...route.steps)
  steps.push({ type: "arrive", instruction: toName, detail: `${gateLabel} ${toGate}`, icon: "flag" })

  const usesExterior = steps.some(s => s.type === "external")
  return { from: fromId, to: toId, steps, totalSteps: steps.length, usesExterior, gateTrace: route.trace }
}

interface ResolvedRoute { steps: RouteStep[]; trace: number[] }

function externalStep(exit: number, streets: string[], entry: number, lang: "es" | "en"): RouteStep[] {
  const t = T[lang]
  return [
    { type: "external", instruction: t.exitGate(exit), icon: "exit" },
    ...streets.map((s, i) => ({
      type: "external" as const,
      instruction: i === 0 ? t.walkStreet(s) : t.continueStreet(s),
      icon: "walk" as const,
    })),
    { type: "external", instruction: t.enterGate(entry), icon: "enter" },
  ]
}

function resolveRoute(from: number, to: number, lang: "es" | "en" = "es"): ResolvedRoute {
  const steps: RouteStep[] = []
  const trace: number[] = [from]
  const pushTrace = (g: number) => {
    if (trace[trace.length - 1] !== g) trace.push(g)
  }
  // Recorre el tramo de f a t2 y registra cada puerta intermedia en el trace
  const traceTramo = (f: number, t2: number, tramo: number[]) => {
    const fi = tramo.indexOf(f)
    const ti = tramo.indexOf(t2)
    if (fi === -1 || ti === -1) { pushTrace(t2); return }
    const dir = fi < ti ? 1 : -1
    for (let i = fi + dir; i !== ti + dir; i += dir) pushTrace(tramo[i])
  }
  const wi = (f: number, t2: number, tramo: number[]) => {
    walkInternal(steps, f, t2, tramo, lang)
    traceTramo(f, t2, tramo)
  }
  const ext = (exit: number, streets: string[], entry: number) => {
    pushTrace(exit)
    pushTrace(entry)
    return externalStep(exit, streets, entry, lang)
  }

  // ── Mismo tramo directo ──────────────────────────────────

  if (inTramo1(from) && inTramo1(to)) {
    wi(from, to, TRAMO_1)
    return { steps, trace }
  }

  if (inTramo2(from) && inTramo2(to)) {
    wi(from, to, TRAMO_2)
    return { steps, trace }
  }

  if (inTramo3(from) && inTramo3(to)) {
    wi(from, to, TRAMO_3)
    return { steps, trace }
  }

  // ── TRAMO_1 ↔ TRAMO_3 vía nodo P2 (pasillo interior) ────
  if (inTramo1(from) && inTramo3(to) && to !== 2) {
    wi(from, 2, TRAMO_1)
    wi(2, to, TRAMO_3)
    return { steps, trace }
  }
  if (inTramo3(from) && inTramo1(to) && from !== 2) {
    wi(from, 2, TRAMO_3)
    wi(2, to, TRAMO_1)
    return { steps, trace }
  }

  // ── Plazoleta (gate=1): el usuario YA está en la plazoleta, no caminar hasta P2 ─
  // Tratar la plazoleta como si fuera el nodo P2 para seguir hacia otros tramos,
  // con el paso "Pasa por la Plazoleta" ya implícito en el origen.

  if (from === PLAZOLETA_GATE && inTramo2(to)) {
    if (to <= 6) {
      // Plazoleta → P2 → P3 → exterior Cacica Quilago → P5/P6
      wi(PLAZOLETA_GATE, 2, TRAMO_3)   // "De Puerta 1 a Puerta 2" — solo 1 segmento corto
      wi(2, 3, TRAMO_1)
      steps.push(...ext(3, ["Calle Cacica Quilago"], to))
    } else {
      // Plazoleta → P11 → P10 → exterior H. Vans Risn → P9 → TRAMO_2
      // No pasar por P2, ir directamente hacia P11 (dirección opuesta en TRAMO_3)
      wi(PLAZOLETA_GATE, 10, TRAMO_3)
      steps.push(...ext(10, ["H. Vans Risn"], 9))
      wi(9, to, TRAMO_2)
    }
    return { steps, trace }
  }
  if (inTramo2(from) && to === PLAZOLETA_GATE) {
    if (from <= 6) {
      wi(from, 5, TRAMO_2)
      steps.push(...ext(5, ["Calle Cacica Quilago"], 3))
      wi(3, 2, TRAMO_1)
    } else {
      wi(from, 9, TRAMO_2)
      steps.push(...ext(9, ["H. Vans Risn"], 10))
      wi(10, PLAZOLETA_GATE, TRAMO_3)
      return { steps, trace }
    }
    wi(2, PLAZOLETA_GATE, TRAMO_3)
    return { steps, trace }
  }

  // ── Plazoleta ↔ TRAMO_1: ir hacia P2 y continuar ────────────────────────
  if (from === PLAZOLETA_GATE && inTramo1(to)) {
    wi(PLAZOLETA_GATE, 2, TRAMO_3)
    wi(2, to, TRAMO_1)
    return { steps, trace }
  }
  if (inTramo1(from) && to === PLAZOLETA_GATE) {
    wi(from, 2, TRAMO_1)
    wi(2, PLAZOLETA_GATE, TRAMO_3)
    return { steps, trace }
  }

  // ── Plazoleta ↔ P4 ───────────────────────────────────────────────────────
  if (from === PLAZOLETA_GATE && to === 4) {
    wi(PLAZOLETA_GATE, 2, TRAMO_3)
    wi(2, 3, TRAMO_1)
    steps.push(...ext(3, ["Calle Cacica Quilago"], 4))
    return { steps, trace }
  }
  if (from === 4 && to === PLAZOLETA_GATE) {
    steps.push(...ext(4, ["Calle Cacica Quilago"], 3))
    wi(3, 2, TRAMO_1)
    wi(2, PLAZOLETA_GATE, TRAMO_3)
    return { steps, trace }
  }

  // ── TRAMO_2 ↔ TRAMO_3: P9 ↔ P10 por Hermensz ───────────
  // P2 se excluye (to/from !== 2) porque, aunque pertenece a TRAMO_3, su
  // salida natural hacia el oriente es por el sur (P3 → Cacica Quilago),
  // no por el norte/Plazoleta. Cae al bloque TRAMO_1 ↔ TRAMO_2.
  if (inTramo2(from) && inTramo3(to) && to !== 2) {
    wi(from, 9, TRAMO_2)
    steps.push(...ext(9, ["H. Vans Risn"], 10))
    wi(10, to, TRAMO_3)
    return { steps, trace }
  }
  if (inTramo3(from) && inTramo2(to) && from !== 2) {
    wi(from, 10, TRAMO_3)
    steps.push(...ext(10, ["H. Vans Risn"], 9))
    wi(9, to, TRAMO_2)
    return { steps, trace }
  }

  // ── TRAMO_1 ↔ TRAMO_2: salida sur por P3 → Cacica Quilago ────
  // Tanto P5/P6 como P7/P8/P9 se alcanzan saliendo por P3 al exterior
  // (Cacica Quilago) y entrando por el lado oriental. Nunca por la Plazoleta.
  if (inTramo1(from) && inTramo2(to)) {
    wi(from, 3, TRAMO_1)
    if (to <= 6) {
      steps.push(...ext(3, ["Calle Cacica Quilago"], to))
    } else {
      // P7/P8/P9: exterior por Cacica Quilago, entra por P5 y camina interno
      steps.push(...ext(3, ["Calle Cacica Quilago"], 5))
      wi(5, to, TRAMO_2)
    }
    return { steps, trace }
  }
  if (inTramo2(from) && inTramo1(to)) {
    if (from <= 6) {
      // Desde P5/P6: Cacica Quilago → P3
      wi(from, 5, TRAMO_2)
      steps.push(...ext(5, ["Calle Cacica Quilago"], 3))
    } else {
      // Desde P7/P8/P9: camina interno hasta P5, sale a Cacica Quilago → P3
      wi(from, 5, TRAMO_2)
      steps.push(...ext(5, ["Calle Cacica Quilago"], 3))
    }
    wi(3, to, TRAMO_1)
    return { steps, trace }
  }

  // ── Rutas con P4 (General Sur) ───────────────────────────
  if (from === 4 && (inTramo1(to) || inTramo3(to))) {
    steps.push(...ext(4, ["Calle Cacica Quilago"], 3))
    if (inTramo3(to)) { wi(3, 2, TRAMO_1); wi(2, to, TRAMO_3) }
    else wi(3, to, TRAMO_1)
    return { steps, trace }
  }
  if (to === 4 && (inTramo1(from) || inTramo3(from))) {
    if (inTramo3(from)) { wi(from, 2, TRAMO_3); wi(2, 3, TRAMO_1) }
    else wi(from, 3, TRAMO_1)
    steps.push(...ext(3, ["Calle Cacica Quilago"], 4))
    return { steps, trace }
  }
  if (from === 4 && inTramo2(to)) {
    const entry = to <= 6 ? to : 5
    steps.push(...ext(4, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], entry))
    wi(entry, to, TRAMO_2)
    return { steps, trace }
  }
  if (inTramo2(from) && to === 4) {
    wi(from, 5, TRAMO_2)
    steps.push(...ext(5, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], 4))
    return { steps, trace }
  }
  if (inTramo3(from) && to === 4) {
    wi(from, 10, TRAMO_3)
    steps.push(...ext(10, ["H. Vans Risn"], 9))
    wi(9, 5, TRAMO_2)
    steps.push(...ext(5, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], 4))
    return { steps, trace }
  }
  if (from === 4 && inTramo3(to)) {
    steps.push(...ext(4, ["Calle Cacica Quilago", "Av. Diego Vásquez de Cepeda"], 5))
    wi(5, 9, TRAMO_2)
    steps.push(...ext(9, ["H. Vans Risn"], 10))
    wi(10, to, TRAMO_3)
    return { steps, trace }
  }

  // Fallback
  const fallback = lang === "es" ? "Perímetro exterior del estadio" : "Stadium exterior perimeter"
  steps.push(...ext(from, [fallback], to))
  return { steps, trace }
}
